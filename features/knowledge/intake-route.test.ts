import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ConfirmSourceInput, ServiceResult, SourceEstimate, SourceInput } from "@/lib/contracts/phase2";
import { createSourceHandlers } from "@/app/api/agents/[agentId]/sources/handlers";
import { createSourceItemHandlers } from "@/app/api/agents/[agentId]/sources/[sourceId]/handlers";

const url = "https://local.example/api/agents/agent-a/sources";
const ctx = { params: Promise.resolve({ agentId: "agent-a" }) };
const itemCtx = { params: Promise.resolve({ agentId: "agent-a", sourceId: "source-1" }) };
const owner = { findAgentOwner: vi.fn(async (agentId: string) => agentId === "agent-a" ? "maria" : "sam") };
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const bytes = async (input: File | string) => typeof input === "string"
  ? new TextEncoder().encode(input) : new Uint8Array(await input.arrayBuffer());
const body = (action: string, fileOrText: File | string | undefined, token?: string, key?: string) => {
  if (fileOrText instanceof File) {
    const form = new FormData();
    form.set("action", action); form.set("name", fileOrText.name);
    form.set("fileOrText", fileOrText);
    if (token) form.set("estimateToken", token);
    if (key) form.set("requestKey", key);
    return new Request(url, { method: "POST", headers: { origin: "https://local.example",
      ...(fileOrText.size > 5 * 1024 * 1024 ? { "content-length": String(fileOrText.size + 1000) } : {}),
      ...(key ? { "Idempotency-Key": key } : {}) }, body: form });
  }
  return new Request(url, { method: "POST", headers: { origin: "https://local.example",
    "content-type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: JSON.stringify({ action, name: "Pasted knowledge", ...(fileOrText === undefined ? {} : { fileOrText }),
      ...(token ? { estimateToken: token } : {}), ...(key ? { requestKey: key } : {}) }) });
};
function fixture() {
  let now = 1000;
  let paid = 0;
  const estimates = new Map<string, { hash: string; name: string; expiry: number }>();
  const confirmed = new Map<string, string>();
  const preflight = vi.fn(async (input: SourceInput): Promise<ServiceResult<SourceEstimate>> => {
    const data = await bytes(input.fileOrText);
    const hash = digest(data);
    const token = `token-${estimates.size + 1}`;
    estimates.set(token, { hash, name: input.name, expiry: now + 600_000 });
    return { ok: true, data: { agentId: input.agentId, name: input.name,
      kind: typeof input.fileOrText === "string" ? "text" : "txt",
      contentHash: hash, estimateToken: token, version: 1,
      expiresAt: new Date(now + 600_000).toISOString(), byteCount: data.length,
      projectedUse: { sources: 1, bytes: data.length, chunks: 0 },
      remaining: { sources: 10, bytes: 25 * 1024 * 1024, chunks: 1000 },
      limits: { maxSources: 10, maxFileBytes: 5 * 1024 * 1024, maxAgentBytes: 25 * 1024 * 1024,
        maxPdfPages: 100, maxExtractedChars: 100_000, maxActiveChunks: 1000,
        chunkTargetChars: 2000, chunkOverlapChars: 200, parserTimeoutMs: 15_000,
        parserHeapMb: 128, maxDocxInflatedBytes: 20 * 1024 * 1024 },
      projectedPageCount: null, projectedChunkCount: null,
      walletAvailableUnits: "20000000000", walletHeldUnits: "0",
      estimateUnits: "100", maxUnits: "1000", priceVersion: "v1" } };
  });
  const confirm = vi.fn(async (input: ConfirmSourceInput) => {
    const estimate = estimates.get(input.estimateToken);
    if (!estimate || estimate.expiry <= now || estimate.name !== input.name ||
      estimate.hash !== digest(await bytes(input.fileOrText))) return { ok: false as const,
      error: { code: "stale_estimate" as const, message: "stale", retryable: false } };
    const old = confirmed.get(input.requestKey);
    if (old && old !== estimate.hash) return { ok: false as const,
      error: { code: "conflict" as const, message: "conflict", retryable: false } };
    if (!old) { confirmed.set(input.requestKey, estimate.hash); paid++; }
    return { ok: true as const, data: { state: "ready" as const, jobId: "job-1",
      progress: { completedBatches: 1, totalBatches: 1, indexedChunks: 1 } } };
  });
  const list = vi.fn(async () => ({ ok: true as const, data: { sources: [],
    limits: { maxSources: 10, maxFileBytes: 5 * 1024 * 1024, maxAgentBytes: 25 * 1024 * 1024,
      maxPdfPages: 100, maxExtractedChars: 100_000, maxActiveChunks: 1000,
      chunkTargetChars: 2000, chunkOverlapChars: 200, parserTimeoutMs: 15_000,
      parserHeapMb: 128, maxDocxInflatedBytes: 20 * 1024 * 1024 },
    remaining: { sources: 10, bytes: 25 * 1024 * 1024, chunks: 1000 },
    walletAvailableUnits: "20000000000", walletHeldUnits: "0" } }));
  return { ...createSourceHandlers({ preflight, confirm, list }, owner), preflight, confirm,
    paid: () => paid, expire() { now += 600_001; } };
}

describe("source routes", () => {
  it("receives the same file in separate preflight and confirm multipart requests", async () => {
    const h = fixture();
    const file = new File(["full document bytes"], "notes.txt", { type: "text/plain" });
    const first = await h.POST(body("preflight", file), ctx);
    expect(first.status).toBe(200);
    const estimate = (await first.json()).data as SourceEstimate;
    expect(h.paid()).toBe(0);
    const second = await h.POST(body("confirm", file, estimate.estimateToken, "upload-1"), ctx);
    expect(second.status).toBe(200);
    expect(h.paid()).toBe(1);
    expect(h.preflight.mock.calls[0][0].fileOrText).toBeInstanceOf(File);
    expect(h.confirm.mock.calls[0][0].fileOrText).toBeInstanceOf(File);
    const replay = await h.POST(body("confirm", file, estimate.estimateToken, "upload-1"), ctx);
    expect(replay.status).toBe(200);
    expect(h.paid()).toBe(1);
  });

  it("requires resent text or file, rejects changed content and expired token without paid work", async () => {
    const h = fixture();
    const first = await h.POST(body("preflight", "Source text"), ctx);
    const token = ((await first.json()).data as SourceEstimate).estimateToken;
    const missing = await h.POST(body("confirm", undefined, token, "absent"), ctx);
    expect(missing.status).toBe(409);
    expect((await missing.json()).error.code).toBe("stale_estimate");
    const changed = await h.POST(body("confirm", "Changed source text", token, "changed"), ctx);
    expect(changed.status).toBe(409);
    h.expire();
    const expired = await h.POST(body("confirm", "Source text", token, "expired"), ctx);
    expect(expired.status).toBe(409);
    expect(h.paid()).toBe(0);
  });

  it("enforces owner, idempotency, origin, and request body limits", async () => {
    const h = fixture();
    const forbidden = await h.POST(body("preflight", "text"),
      { params: Promise.resolve({ agentId: "other-agent" }) });
    expect(forbidden.status).toBe(404);
    const first = await h.POST(body("preflight", "text"), ctx);
    const token = ((await first.json()).data as SourceEstimate).estimateToken;
    const noKey = await h.POST(body("confirm", "text", token), ctx);
    expect(noKey.status).toBe(400);
    const oversized = new File(["x".repeat(5 * 1024 * 1024 + 64 * 1024 + 1)], "huge.txt", { type: "text/plain" });
    expect((await h.POST(body("preflight", oversized), ctx)).status).toBe(413);
    const crossOrigin = new Request(url, { method: "POST", headers: { origin: "https://other.example",
      "content-type": "application/json" }, body: JSON.stringify({ action: "preflight",
      name: "notes", fileOrText: "text" }) });
    expect((await h.POST(crossOrigin, ctx)).status).toBe(403);
    expect(h.paid()).toBe(0);
  });

  it("lists truthful limits and delegates retry, resume, and tombstone for the owned source", async () => {
    const h = fixture();
    expect((await h.GET(new Request(url), ctx)).status).toBe(200);
    const services = { preflightRetry: vi.fn(async () => ({ ok: true as const, data: { estimateToken: "fresh" } as SourceEstimate })),
      retry: vi.fn(async () => ({ ok: true as const, data: { state: "pending" as const, jobId: "job-1",
        progress: { completedBatches: 0, totalBatches: 1, indexedChunks: 0 } } })),
      resume: vi.fn(async () => ({ ok: true as const, data: { state: "ready" as const, jobId: "job-1",
        progress: { completedBatches: 1, totalBatches: 1, indexedChunks: 1 } } })),
      delete: vi.fn(async () => ({ ok: true as const, data: { sourceId: "source-1", deleted: true as const,
        cleanupPending: false, historicalCitationsRetained: true as const } })),
    };
    const item = createSourceItemHandlers(services, owner);
    const post = (value: unknown, requestKey?: string) => new Request(`${url}/source-1`, { method: "POST",
      headers: { origin: "https://local.example", "content-type": "application/json",
        ...(requestKey ? { "Idempotency-Key": requestKey } : {}) }, body: JSON.stringify(value) });
    expect((await item.POST(post({ action: "preflight-retry" }), itemCtx)).status).toBe(200);
    expect((await item.POST(post({ action: "retry", estimateToken: "fresh", requestKey: "retry-1" }, "retry-1"), itemCtx)).status).toBe(200);
    expect(services.retry).toHaveBeenCalledWith({ agentId: "agent-a", sourceId: "source-1",
      estimateToken: "fresh", requestKey: "retry-1" });
    expect((await item.POST(post({ action: "resume", requestKey: "resume-1" }, "resume-1"), itemCtx)).status).toBe(200);
    const deleted = await item.DELETE(new Request(`${url}/source-1`, { method: "DELETE",
      headers: { origin: "https://local.example" } }), itemCtx);
    expect((await deleted.json()).data.historicalCitationsRetained).toBe(true);
    expect((await item.DELETE(new Request(`${url}/source-1`, { method: "DELETE",
      headers: { origin: "https://local.example" } }),
      { params: Promise.resolve({ agentId: "other-agent", sourceId: "source-1" }) })).status).toBe(404);
  });
});
