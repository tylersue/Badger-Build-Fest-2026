/**
 * Flag creation lane (MKT-06, D-02). Pure logic plus a thin action that
 * writes only through commitDemo.
 */
import { agentById, allConversations, allFlags, commitDemo, currentIdentity, readDemo, type DemoState } from "@/lib/demo-store";
import type { Flag } from "@/lib/types";

export const FLAG_REASONS = [
  { id: "unsafe", label: "Inaccurate or unsafe advice" },
  { id: "impersonation", label: "Impersonation or false credentials" },
  { id: "spam", label: "Spam or advertising" },
  { id: "other", label: "Something else" },
] as const;

export type FlagReasonId = (typeof FLAG_REASONS)[number]["id"];

export const FLAG_DETAIL_MAX = 500;

export type FlagTarget = { type: "agent"; agentId: string } | { type: "conversation"; agentId: string; conversationId: string };

export type BuildFlagError = "reason_required" | "detail_required" | "detail_too_long" | "unknown_target" | "already_flagged";
export type BuildFlagResult = { ok: true; flag: Flag } | { ok: false; error: BuildFlagError };

/** Builds a new flag against a target, or returns why it can't. Never touches state (D-02). */
export function buildFlag(s: DemoState, input: { target: FlagTarget; reasonId: FlagReasonId | ""; detail: string; reporterId: string }, now: string, id?: string): BuildFlagResult {
  const { target, reasonId, reporterId } = input;
  const detail = input.detail.trim();

  const reasonDef = reasonId ? FLAG_REASONS.find((r) => r.id === reasonId) : undefined;
  if (!reasonDef) return { ok: false, error: "reason_required" };
  if (reasonDef.id === "other" && !detail) return { ok: false, error: "detail_required" };
  if (detail.length > FLAG_DETAIL_MAX) return { ok: false, error: "detail_too_long" };

  const agent = agentById(s, target.agentId);
  if (!agent) return { ok: false, error: "unknown_target" };
  if (target.type === "conversation") {
    const conversation = allConversations(s).find((c) => c.id === target.conversationId);
    if (!conversation || conversation.agentId !== target.agentId) return { ok: false, error: "unknown_target" };
  }

  const alreadyFlagged = allFlags(s).some(
    (f) =>
      f.reporterId === reporterId &&
      f.status === "open" &&
      f.targetType === target.type &&
      f.agentId === target.agentId &&
      (target.type === "conversation" ? f.conversationId === target.conversationId : true),
  );
  if (alreadyFlagged) return { ok: false, error: "already_flagged" };

  const reason = detail ? `${reasonDef.label}: ${detail}` : reasonDef.label;
  const flag: Flag = {
    id: id ?? crypto.randomUUID(),
    targetType: target.type,
    agentId: target.agentId,
    conversationId: target.type === "conversation" ? target.conversationId : null,
    reason,
    status: "open",
    createdAt: now,
    reporterId,
  };
  return { ok: true, flag };
}

export function applyFlag(s: DemoState, flag: Flag): DemoState {
  return { ...s, flags: [...(s.flags ?? []), flag] };
}

/** Action: the reporter is the current identity; re-builds inside the commitDemo updater. */
export function createFlag(target: FlagTarget, reasonId: FlagReasonId | "", detail: string): BuildFlagResult {
  const reporterId = currentIdentity(readDemo()).id;
  const now = new Date().toISOString();
  const initial = buildFlag(readDemo(), { target, reasonId, detail, reporterId }, now);
  if (!initial.ok) return initial;
  let result: BuildFlagResult = initial;
  commitDemo((s) => {
    const plan = buildFlag(s, { target, reasonId, detail, reporterId }, now, initial.flag.id);
    result = plan;
    return plan.ok ? applyFlag(s, plan.flag) : s;
  });
  return result;
}
