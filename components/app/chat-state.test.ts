import { describe, expect, it } from "vitest";
import type { ChatStreamEvent } from "@/features/runtime/events";
import { emptyAnswer, evidenceGroups, markDeletedSources, reduceAnswer, replayAnswer, retainDraftOnResult } from "./chat-state";

const envelope = (sequence: number) => ({ operationId: "op_1", eventId: `evt_${sequence}`, sequence });
const step = { id: "step_1", operationId: "op_1", sequence: 1, kind: "search" as const,
  status: "running" as const, query: "public topic" };

describe("sandbox answer state", () => {
  it("shows a started search before its result and updates the same step", () => {
    const started = reduceAnswer(emptyAnswer(), { ...envelope(0), type: "tool-start", step });
    expect(started.steps).toEqual([step]);
    const completed = reduceAnswer(started, { ...envelope(1), type: "tool-result",
      step: { ...step, status: "complete", title: "Result", url: "https://example.org" } });
    expect(completed.steps).toHaveLength(1);
    expect(completed.steps[0]).toMatchObject({ status: "complete", title: "Result" });
  });

  it("replays partial failure without losing a supported answer or duplicating events", () => {
    const events: ChatStreamEvent[] = [
      { ...envelope(0), type: "tool-start", step },
      { ...envelope(1), type: "tool-result", step: { ...step, status: "failed", error: "Search unavailable" } },
      { ...envelope(2), type: "text-delta", delta: "Supported answer [expert:1]" },
      { ...envelope(3), type: "error", error: { code: "provider", message: "One page failed", retryable: true } },
    ];
    const first = replayAnswer(events);
    const replayed = replayAnswer([...events, ...events], first);
    expect(replayed.text).toBe("Supported answer [expert:1]");
    expect(replayed.steps).toHaveLength(1);
    expect(replayed.steps[0].status).toBe("failed");
    expect(replayed.error).toBe("One page failed");
  });

  it("retains draft on refusal and separates exact citation provenance", () => {
    expect(retainDraftOnResult(false, "my question")).toBe("my question");
    const citations = [
      { evidenceId: "expert:1", ordinal: 1, excerpt: "Interview", sourceName: "Q1", sourceType: "interview" as const,
        sourceId: "s", revisionId: "r", chunkId: "c", question: "Why?", page: null, headingPath: null, historical: false },
      { evidenceId: "web:1", ordinal: 2, excerpt: "Online", sourceName: "Page", sourceType: "web" as const,
        title: "Page", url: "https://example.org", retrievedAt: "2026-09-27T00:00:00Z" },
    ];
    expect(evidenceGroups(citations).expert.map(c => c.evidenceId)).toEqual(["expert:1"]);
    expect(evidenceGroups(citations).online.map(c => c.evidenceId)).toEqual(["web:1"]);
    const historical = markDeletedSources(citations, new Set(), new Set());
    expect(historical[0]).toMatchObject({ historical: true });
    expect(historical[1]).toEqual(citations[1]);
    expect(markDeletedSources(citations, new Set(), new Set(["s"]))[0]).toMatchObject({ historical: false });
  });
});
