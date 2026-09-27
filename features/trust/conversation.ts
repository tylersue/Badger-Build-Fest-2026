/**
 * Answer feedback and transcript-sharing lane (CHAT-08, CHAT-09, D-02). Pure
 * functions over DemoState plus thin actions that write only through
 * commitDemo.
 */
import { allConversations, commitDemo, currentIdentity, messageById, readDemo, refreshDemo, type DemoState } from "@/lib/demo-store";
import { api } from "@/lib/api-client";
import type { Conversation, Message } from "@/lib/types";

// ------------------------------------------------------------------ feedback

/** Toggle-clears semantics: clicking the active thumb clears it, the other thumb replaces it. */
export function nextFeedback(current: Message["feedback"], clicked: "up" | "down"): Message["feedback"] {
  return clicked === current ? null : clicked;
}

export type FeedbackError = "unknown_message" | "not_an_answer" | "not_your_conversation";
export type FeedbackPermission = { ok: true; message: Message } | { ok: false; error: FeedbackError };
export type ToggleFeedbackResult = { ok: true; feedback: Message["feedback"] } | { ok: false; error: FeedbackError };

/** Only the conversation's hirer may rate an assistant answer, including a zero-charge refusal reply. A missing conversation (e.g. a sandbox message) is not_your_conversation. */
export function feedbackPermission(s: DemoState, messageId: string, identityId: string): FeedbackPermission {
  const message = messageById(s, messageId);
  if (!message) return { ok: false, error: "unknown_message" };
  if (message.role !== "assistant") return { ok: false, error: "not_an_answer" };
  const conversation = allConversations(s).find((c) => c.id === message.conversationId);
  if (!conversation || conversation.hirerId !== identityId) return { ok: false, error: "not_your_conversation" };
  return { ok: true, message };
}

export function applyFeedback(s: DemoState, messageId: string, value: Message["feedback"]): DemoState {
  return { ...s, messageFeedback: { ...s.messageFeedback, [messageId]: value } };
}

/** Action: re-checks permission inside the commitDemo updater so it stays correct if state changed since the read. */
export async function toggleAnswerFeedback(messageId: string, clicked: "up" | "down"): Promise<ToggleFeedbackResult> {
  const identityId = currentIdentity(readDemo()).id;
  const initial = feedbackPermission(readDemo(), messageId, identityId);
  if (!initial.ok) return initial;
  if (readDemo().v === 2) {
    const feedback = nextFeedback(initial.message.feedback, clicked);
    await api.conversationControls(initial.message.conversationId, { action: "feedback", messageId, feedback });
    await refreshDemo();
    return { ok: true, feedback };
  }
  let result: ToggleFeedbackResult = { ok: true, feedback: nextFeedback(initial.message.feedback, clicked) };
  commitDemo((s) => {
    const permission = feedbackPermission(s, messageId, identityId);
    if (!permission.ok) {
      result = permission;
      return s;
    }
    const next = nextFeedback(permission.message.feedback, clicked);
    result = { ok: true, feedback: next };
    return applyFeedback(s, messageId, next);
  });
  return result;
}

// ------------------------------------------------------------------- sharing

export type ShareError = "unknown_conversation" | "not_your_conversation";
export type SharePermission = { ok: true; conversation: Conversation } | { ok: false; error: ShareError };

export function sharePermission(s: DemoState, conversationId: string, identityId: string): SharePermission {
  const conversation = allConversations(s).find((c) => c.id === conversationId);
  if (!conversation) return { ok: false, error: "unknown_conversation" };
  if (conversation.hirerId !== identityId) return { ok: false, error: "not_your_conversation" };
  return { ok: true, conversation };
}

/** Keeps the existing Phase 3 conversationEdits entry (fileName/fileText/fileChars) intact. */
export function applyShare(s: DemoState, conversationId: string, on: boolean): DemoState {
  return { ...s, conversationEdits: { ...s.conversationEdits, [conversationId]: { ...s.conversationEdits[conversationId], shareTranscript: on } } };
}

/** Action: re-checks permission inside the commitDemo updater. */
export async function setShareTranscript(conversationId: string, on: boolean): Promise<SharePermission> {
  const identityId = currentIdentity(readDemo()).id;
  const initial = sharePermission(readDemo(), conversationId, identityId);
  if (!initial.ok) return initial;
  if (readDemo().v === 2) {
    await api.conversationControls(conversationId, { action: "share", shareTranscript: on });
    await refreshDemo();
    return sharePermission(readDemo(), conversationId, identityId);
  }
  let result: SharePermission = initial;
  commitDemo((s) => {
    const permission = sharePermission(s, conversationId, identityId);
    result = permission;
    return permission.ok ? applyShare(s, conversationId, on) : s;
  });
  return result;
}
