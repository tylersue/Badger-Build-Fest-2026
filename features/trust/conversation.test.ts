import { afterEach, describe, expect, it } from "vitest";
import { createInitialDemoState, messageById, messagesFor, type DemoState } from "@/lib/demo-store";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { applyFeedback, applyShare, feedbackPermission, nextFeedback, sharePermission } from "./conversation";

afterEach(() => {
  resetDemoHarness();
});

describe("nextFeedback", () => {
  it("returns 'up' from null when up is clicked", () => {
    expect(nextFeedback(null, "up")).toBe("up");
  });

  it("clears when the active thumb is clicked again", () => {
    expect(nextFeedback("up", "up")).toBeNull();
  });

  it("replaces up with down", () => {
    expect(nextFeedback("up", "down")).toBe("down");
  });

  it("clears when the active down thumb is clicked again", () => {
    expect(nextFeedback("down", "down")).toBeNull();
  });
});

describe("feedbackPermission", () => {
  it("gives unknown_message for a missing id", () => {
    const s = createInitialDemoState();
    expect(feedbackPermission(s, "m-does-not-exist", "sam")).toEqual({ ok: false, error: "unknown_message" });
  });

  it("gives not_an_answer for a user message", () => {
    const s = createInitialDemoState();
    const userMessage = messagesFor(s, "c-knee-swelling").find((m) => m.role === "user")!;
    expect(feedbackPermission(s, userMessage.id, "sam")).toEqual({ ok: false, error: "not_an_answer" });
  });

  it("gives not_your_conversation for another identity's conversation", () => {
    const s = createInitialDemoState();
    const answer = messagesFor(s, "c-knee-swelling").find((m) => m.role === "assistant")!;
    expect(feedbackPermission(s, answer.id, "maria")).toEqual({ ok: false, error: "not_your_conversation" });
  });

  it("gives not_your_conversation for a sandbox message", () => {
    const s: DemoState = {
      ...createInitialDemoState(),
      messages: [
        { id: "m-sandbox-1", conversationId: "sandbox:maria-chen-physical-therapy", role: "assistant", content: "Sandbox reply", citations: [], feedback: null, costCents: 4, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    };
    expect(feedbackPermission(s, "m-sandbox-1", "maria")).toEqual({ ok: false, error: "not_your_conversation" });
  });

  it("is ok for the hirer on their own assistant message, including a refusal reply", () => {
    const base = createInitialDemoState();
    const refusalId = "m-refusal-1";
    const s = {
      ...base,
      messages: [
        { id: refusalId, conversationId: "c-knee-swelling", role: "assistant" as const, content: "No charge reply", citations: [], feedback: null, costCents: 0, refusal: true, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    };
    const permission = feedbackPermission(s, refusalId, "sam");
    expect(permission.ok).toBe(true);
    if (!permission.ok) throw new Error("expected ok");
    expect(permission.message.id).toBe(refusalId);
  });
});

describe("applyFeedback", () => {
  it("sets a new value that messagesFor then shows", () => {
    const s = createInitialDemoState();
    const answer = messagesFor(s, "c-knee-swelling").find((m) => m.feedback === null || m.feedback === undefined) ?? messagesFor(s, "c-knee-swelling")[1];
    const next = applyFeedback(s, answer.id, "down");
    expect(messageById(next, answer.id)?.feedback).toBe("down");
  });

  it("clears a seeded 'up' when set to null", () => {
    const s = createInitialDemoState();
    const upvoted = messagesFor(s, "c-knee-swelling").find((m) => m.feedback === "up")!;
    expect(upvoted).toBeTruthy();
    const next = applyFeedback(s, upvoted.id, null);
    expect(messageById(next, upvoted.id)?.feedback).toBeNull();
  });
});

describe("sharePermission", () => {
  it("gives unknown_conversation for a missing id", () => {
    const s = createInitialDemoState();
    expect(sharePermission(s, "c-does-not-exist", "sam")).toEqual({ ok: false, error: "unknown_conversation" });
  });

  it("gives not_your_conversation for a non-hirer", () => {
    const s = createInitialDemoState();
    expect(sharePermission(s, "c-knee-swelling", "maria")).toEqual({ ok: false, error: "not_your_conversation" });
  });

  it("is ok for the hirer", () => {
    const s = createInitialDemoState();
    const permission = sharePermission(s, "c-knee-swelling", "sam");
    expect(permission.ok).toBe(true);
  });
});

describe("applyShare", () => {
  it("sets shareTranscript and keeps existing hirer file fields", () => {
    const base = createInitialDemoState();
    const s = { ...base, conversationEdits: { ...base.conversationEdits, "c-knee-swelling": { fileName: "notes.pdf", fileText: "text", fileChars: 4 } } };
    const next = applyShare(s, "c-knee-swelling", true);
    expect(next.conversationEdits["c-knee-swelling"]).toEqual({ fileName: "notes.pdf", fileText: "text", fileChars: 4, shareTranscript: true });
  });
});

describe("store-level: toggleAnswerFeedback and setShareTranscript", () => {
  it("startConversation yields shareTranscript false", async () => {
    const { store } = await loadDemoStore();
    const id = store.startConversation("maria-chen-physical-therapy", "New chat");
    const s = store.readDemo();
    expect(store.allConversations(s).find((c) => c.id === id)?.shareTranscript).toBe(false);
  });

  it("as Sam, toggling feedback and setting share persist across a reload", async () => {
    const { store, storage } = await loadDemoStore();
    const { toggleAnswerFeedback, setShareTranscript } = await import("./conversation");
    const answer = store.messagesFor(store.readDemo(), "c-knee-swelling").find((m) => m.role === "assistant")!;
    const feedbackResult = toggleAnswerFeedback(answer.id, "down");
    expect(feedbackResult).toEqual({ ok: true, feedback: "down" });
    const shareResult = setShareTranscript("c-knee-swelling", true);
    expect(shareResult.ok).toBe(true);
    const raw = storage.getItem("bx-demo-v1");
    expect(raw).toBeTruthy();
    const reloaded = await loadDemoStore(JSON.parse(raw!));
    expect(reloaded.store.messageById(reloaded.store.readDemo(), answer.id)?.feedback).toBe("down");
    expect(reloaded.store.allConversations(reloaded.store.readDemo()).find((c) => c.id === "c-knee-swelling")?.shareTranscript).toBe(true);
  });

  it("as Maria, both return not_your_conversation and write nothing", async () => {
    const { store } = await loadDemoStore();
    store.switchIdentity("maria");
    const { toggleAnswerFeedback, setShareTranscript } = await import("./conversation");
    const answer = store.messagesFor(store.readDemo(), "c-knee-swelling").find((m) => m.role === "assistant")!;
    const before = store.readDemo();
    const feedbackResult = toggleAnswerFeedback(answer.id, "down");
    expect(feedbackResult).toEqual({ ok: false, error: "not_your_conversation" });
    const shareResult = setShareTranscript("c-knee-swelling", true);
    expect(shareResult).toEqual({ ok: false, error: "not_your_conversation" });
    const after = store.readDemo();
    expect(after.messageFeedback).toEqual(before.messageFeedback);
    expect(after.conversationEdits).toEqual(before.conversationEdits);
  });
});
