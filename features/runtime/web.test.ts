import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { Operation, RetrievedChunk, ServiceResult } from "@/lib/contracts/phase2";
import { assessSufficiency } from "./sufficiency";
import { publicGapQuery, researchWeb, safeWebUrl } from "./web";

const operation = { id: `op_${"1".repeat(8)}-${"1".repeat(4)}-${"1".repeat(4)}-${"1".repeat(4)}-${"1".repeat(12)}`, agentId: "agent-a" } as Operation;
const chunk = { id: "chunk-a", agentId: "agent-a", content: "Expert discusses budgeting, never tax exceptions." } as RetrievedChunk;
function data<T>(result: ServiceResult<T>): T { if (!result.ok) throw new Error(result.error.message); return result.data; }

describe("sufficiency and isolated web fallback", () => {
  it("skips the assessor for empty evidence and distinguishes complete and partial coverage", async () => {
    expect(data(await assessSufficiency({ question: "What is the principle?", chunks: [], operation }))).toMatchObject({ sufficient: false });
    const structured = vi.fn(async () => ({ ok: true as const, data: { value: { parts: [{ index: 0, evidenceIds: ["chunk-a"], missing: false }, { index: 1, evidenceIds: [], missing: true }] } } }));
    const partial = await assessSufficiency({ question: "What is the principle? What is the exception?", chunks: [chunk], operation }, { structured: structured as never });
    expect(data(partial)).toMatchObject({ supportedIds: ["chunk-a"], missingParts: ["What is the exception"], sufficient: false });
    structured.mockResolvedValueOnce({ ok: true, data: { value: { parts: [{ index: 0, evidenceIds: ["chunk-a"], missing: false }, { index: 1, evidenceIds: ["chunk-a"], missing: false }] } } });
    expect(data(await assessSufficiency({ question: "What is the principle? What is the exception?", chunks: [chunk], operation }, { structured: structured as never })).sufficient).toBe(true);
    structured.mockResolvedValueOnce({ ok: true, data: { value: { parts: [{ index: 0, evidenceIds: ["invented"], missing: false }] } } });
    expect(data(await assessSufficiency({ question: "What is the principle?", chunks: [chunk], operation }, { structured: structured as never })).sufficient).toBe(false);
  });

  it("keeps private sentinels out of tool-enabled input and rejects unsafe URLs", async () => {
    const stream = vi.fn(async () => ({ ok: true as const, data: { value: "", usage: {} } }));
    await researchWeb({ operation, missingParts: ["How does PRIVATE_SENTINEL_123 manage budgeting for Maria Chen and acmecorp at maria@example.com?"] }, async () => {}, { stream: stream as never });
    const outbound = JSON.stringify(stream.mock.calls);
    expect(outbound).not.toContain("PRIVATE_SENTINEL_123");
    expect(outbound).not.toContain("Maria Chen");
    expect(outbound).not.toContain("maria@example.com");
    expect(outbound).not.toContain("acmecorp");
    expect(publicGapQuery(["PRIVATE_SENTINEL_123"])).toBeNull();
    expect(safeWebUrl("http://127.0.0.1/private")).toBeNull();
    expect(safeWebUrl("https://example.com/a")).toBe("https://example.com/a");
  });

  it("emits actual search/page steps before completion and retains a usable page after another read fails", async () => {
    const emitted: string[] = [];
    const stream = vi.fn(async (_input, options) => {
      await options.onEvent({ type: "tool-input-start", toolCallId: "s", toolName: "web_search" });
      await options.onEvent({ type: "tool-call", toolCallId: "s", toolName: "web_search", input: { query: "budgeting guidance" } });
      await options.onEvent({ type: "tool-result", toolCallId: "s", toolName: "web_search", output: [{ title: "Guide", url: "https://example.org/guide" }] });
      await options.onEvent({ type: "tool-call", toolCallId: "p", toolName: "web_fetch", input: { url: "https://example.org/guide" } });
      await options.onEvent({ type: "tool-result", toolCallId: "p", toolName: "web_fetch", output: { url: "https://example.org/guide", content: { title: "Guide", source: { type: "text", data: "Public facts" } }, retrievedAt: "2026-09-27T00:00:00Z" } });
      await options.onEvent({ type: "tool-call", toolCallId: "q", toolName: "web_fetch", input: { url: "https://other.org" } });
      await options.onEvent({ type: "tool-error", toolCallId: "q", toolName: "web_fetch" });
      emitted.push("provider-done");
      return { ok: true, data: { value: "", usage: { successfulSearchCount: 1 } } };
    });
    const result = await researchWeb({ operation, missingParts: ["budgeting guidance"] }, async (type, step) => { emitted.push(`${type}:${step.kind}:${step.status}`); }, { stream: stream as never });
    expect(data(result).evidence).toHaveLength(1);
    expect(data(result).steps).toHaveLength(3);
    expect(data(result).steps[2]).toMatchObject({ status: "failed" });
    expect(emitted.indexOf("tool-start:search:running")).toBeLessThan(emitted.indexOf("provider-done"));
    expect(emitted).toContain("tool-result:page-read:complete");
    expect(stream.mock.calls[0][1]).toMatchObject({ web: true, settle: false });
  });

  it("handles no result and a failed search without inventing evidence", async () => {
    const steps: string[] = [];
    const stream = vi.fn(async (_input, options) => {
      await options.onEvent({ type: "tool-call", toolCallId: "s", toolName: "web_search", input: { query: "budgeting" } });
      await options.onEvent({ type: "tool-error", toolCallId: "s", toolName: "web_search" });
      return { ok: false, error: { code: "provider", message: "failed", retryable: true } };
    });
    const result = await researchWeb({ operation, missingParts: ["budgeting guidance"] }, async (_type, step) => { steps.push(step.status); }, { stream: stream as never });
    expect(data(result)).toMatchObject({ evidence: [], failed: true });
    expect(steps).toEqual(["running", "failed"]);
  });
});
