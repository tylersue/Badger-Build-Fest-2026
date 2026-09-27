import { describe, expect, it } from "vitest";
import { createInitialDemoState, messagesFor } from "@/lib/demo-store";
import type { Message } from "@/lib/types";
import { agentInsights, normalizeQuestion, sharedTranscriptsFor } from "./insights";

const AGENT = "maria-chen-physical-therapy";
const message = (id: string, conversationId: string, role: Message["role"], content: string, createdAt: string, feedback: Message["feedback"] = null): Message => ({
  id, conversationId, role, content, citations: [], feedback, costCents: null, createdAt,
});

describe("agentInsights", () => {
  it("aggregates Maria's seeded conversations and feedback", () => {
    expect(agentInsights(createInitialDemoState(), AGENT)).toMatchObject({
      conversations: 3,
      messages: 12,
      questionsAsked: 6,
      thumbsUp: 1,
      thumbsDown: 2,
      sharedTranscripts: 1,
    });
  });

  it("returns zero counts for an agent without conversations", () => {
    expect(agentInsights(createInitialDemoState(), "maria-chen-running-form-clinic")).toMatchObject({
      conversations: 0, messages: 0, questionsAsked: 0, thumbsUp: 0, thumbsDown: 0, sharedTranscripts: 0, topQuestions: [],
    });
  });

  it("normalizes case, whitespace, and trailing punctuation", () => {
    expect(normalizeQuestion("  What counts as WARM?? ")).toBe(normalizeQuestion("what counts as warm"));
  });

  it("groups equivalent questions and displays the most recent original", () => {
    const s = createInitialDemoState();
    s.messages = [
      message("m-warm-1", "c-knee-swelling", "user", "What counts as WARM??", "2030-01-01T00:00:00.000Z"),
      message("m-warm-2", "c-knee-swelling", "user", "what counts as warm", "2030-01-02T00:00:00.000Z"),
    ];
    expect(agentInsights(s, AGENT).topQuestions.find((question) => normalizeQuestion(question.text) === "what counts as warm")).toMatchObject({
      text: "what counts as warm", count: 2, lastAskedAt: "2030-01-02T00:00:00.000Z",
    });
  });

  it("caps displayed questions at 120 characters and returns at most five questions", () => {
    const s = createInitialDemoState();
    s.messages = Array.from({ length: 7 }, (_, i) => message(`m-top-${i}`, "c-knee-swelling", "user", `Question ${i} ${"x".repeat(140)}`, i === 0 ? "2030-01-07T00:00:00.000Z" : `2030-01-0${i + 1}T00:00:00.000Z`));
    const long = agentInsights(s, AGENT).topQuestions.find((question) => question.text.startsWith("Question 0"))!.text;
    expect(long).toHaveLength(120);
    expect(long.endsWith("…")).toBe(true);
    expect(agentInsights(s, AGENT).topQuestions.length).toBeLessThanOrEqual(5);
  });

  it("sorts equal-count, equal-time questions by normalized text", () => {
    const s = createInitialDemoState();
    s.messages = [
      message("m-beta-1", "c-knee-swelling", "user", "Beta?", "2030-01-01T00:00:00.000Z"),
      message("m-alpha-1", "c-knee-swelling", "user", "Alpha!", "2030-01-01T00:00:00.000Z"),
      message("m-beta-2", "c-knee-swelling", "user", "beta", "2030-01-02T00:00:00.000Z"),
      message("m-alpha-2", "c-knee-swelling", "user", "alpha", "2030-01-02T00:00:00.000Z"),
    ];
    expect(agentInsights(s, AGENT).topQuestions.slice(0, 2).map((question) => normalizeQuestion(question.text))).toEqual(["alpha", "beta"]);
  });

  it("uses the feedback overlay when counting thumbs", () => {
    const s = createInitialDemoState();
    const down = messagesFor(s, "c-knee-swelling").find((item) => item.role === "assistant" && item.feedback === "down")!;
    const before = agentInsights(s, AGENT);
    const after = agentInsights({ ...s, messageFeedback: { [down.id]: "up" } }, AGENT);
    expect(after.thumbsDown).toBe(before.thumbsDown - 1);
    expect(after.thumbsUp).toBe(before.thumbsUp + 1);
  });
});

describe("sharedTranscriptsFor", () => {
  it("returns only Maria's opted-in conversations and omits hirer identity", () => {
    const items = sharedTranscriptsFor(createInitialDemoState(), "maria");
    expect(items.map((item) => item.conversationId)).toEqual(["c-shoulder-plan"]);
    expect(items[0]).not.toHaveProperty("hirerId");
    expect(items[0]).not.toHaveProperty("hirerName");
  });

  it("adds a transcript when sharing turns on and removes it when revoked", () => {
    const base = createInitialDemoState();
    const shared = { ...base, conversationEdits: { ...base.conversationEdits, "c-knee-swelling": { shareTranscript: true } } };
    const revoked = { ...shared, conversationEdits: { ...shared.conversationEdits, "c-shoulder-plan": { shareTranscript: false } } };
    expect(sharedTranscriptsFor(shared, "maria").map((item) => item.conversationId)).toEqual(["c-knee-swelling", "c-shoulder-plan"]);
    expect(sharedTranscriptsFor(revoked, "maria").map((item) => item.conversationId)).toEqual(["c-knee-swelling"]);
  });

  it("excludes shared conversations owned by another expert", () => {
    const base = createInitialDemoState();
    const otherOwner = { ...base, agentEdits: { ...base.agentEdits, [AGENT]: { ownerId: "sam" } } };
    expect(sharedTranscriptsFor(otherOwner, "maria")).toEqual([]);
  });
});
