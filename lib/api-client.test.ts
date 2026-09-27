import { afterEach, describe, expect, it, vi } from "vitest";
import { api, decodeNdjson, streamSandbox } from "./api-client";
import type { ChatStreamEvent } from "@/features/runtime/events";

const event = (sequence: number, type: ChatStreamEvent["type"] = "done") => ({
  operationId: "op_1", eventId: `evt_${sequence}`, sequence, type,
  ...(type === "done" ? { messageId: "msg_1" } : {}),
});
const bytes = (parts: string[]) => new ReadableStream<Uint8Array>({
  start(controller) { for (const part of parts) controller.enqueue(new TextEncoder().encode(part)); controller.close(); },
});
afterEach(() => vi.unstubAllGlobals());

describe("answer transport", () => {
  it("decodes split UTF-8 and frames while ignoring duplicate replay sequences", async () => {
    const first = JSON.stringify({ ...event(0, "text-delta"), delta: "café" });
    const second = JSON.stringify(event(1));
    const all = new TextEncoder().encode(`${first}\n${first}\n${second}\n`);
    const chunks = new ReadableStream<Uint8Array>({ start(controller) {
      for (let offset = 0; offset < all.length; offset += 3) controller.enqueue(all.slice(offset, offset + 3));
      controller.close();
    } });
    const result = [];
    for await (const item of decodeNdjson(chunks)) result.push(item);
    expect(result.map(item => item.sequence)).toEqual([0, 1]);
    expect(result[0]).toMatchObject({ delta: "café" });
  });

  it("rejects missing events and accepts explicit pending settlement", async () => {
    const gap = bytes([`${JSON.stringify(event(0))}\n${JSON.stringify(event(2))}\n`]);
    await expect((async () => { for await (const _ of decodeNdjson(gap)) void _; })()).rejects.toThrow("missing event");
    const pending = { ...event(0, "cost"), status: "pending", chargedUnits: null,
      estimateUnits: "100", balanceUnits: "500", heldUnits: "100" };
    const found = [];
    for await (const item of decodeNdjson(bytes([JSON.stringify(pending)]))) found.push(item);
    expect(found[0]).toMatchObject({ status: "pending", chargedUnits: null });
  });

  it("surfaces a typed refusal and never silently retries a paid call", async () => {
    const failure = { ok: false, error: { code: "insufficient_credits", message: "Add credits", retryable: false } };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 402,
      headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    await expect((async () => { for await (const _ of streamSandbox("agent-1", "Hi", "key-1")) void _; })())
      .rejects.toMatchObject({ detail: failure.error });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ text: "Hi", requestKey: "key-1" });
  });

  it("resends the same source bytes and key on confirmation and exposes stale estimates", async () => {
    const file = new File([new Uint8Array([0, 1, 255, 42])], "notes.pdf", { type: "application/pdf" });
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ ok: true, data: { estimateToken: "token" } }))
      .mockResolvedValueOnce(Response.json({ ok: false, error: { code: "stale_estimate", message: "Expired", retryable: false } }, { status: 409 }));
    vi.stubGlobal("fetch", fetcher);
    await api.sourcePreflight("agent-1", file, "notes.pdf");
    await expect(api.sourceConfirm("agent-1", file, "notes.pdf", "token", "key-2"))
      .rejects.toMatchObject({ detail: { code: "stale_estimate" } });
    const preflight = fetcher.mock.calls[0][1].body as FormData;
    const confirm = fetcher.mock.calls[1][1].body as FormData;
    expect(new Uint8Array(await (confirm.get("fileOrText") as File).arrayBuffer()))
      .toEqual(new Uint8Array(await (preflight.get("fileOrText") as File).arrayBuffer()));
    expect(confirm.get("estimateToken")).toBe("token");
    expect(fetcher.mock.calls[1][1].headers).toMatchObject({ "Idempotency-Key": "key-2" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
