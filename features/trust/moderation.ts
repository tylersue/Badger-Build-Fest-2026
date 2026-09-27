/**
 * Admin moderation lane (ADMN-01, D-02): flag queue, resolve, and
 * unpublish-with-note. Pure functions over DemoState plus thin actions that
 * write only through commitDemo.
 */
import { agentById, allConversations, allFlags, commitDemo, displayName, readDemo, type DemoState, type FlagEdit } from "@/lib/demo-store";
import type { AgentStatus, Flag, ModerationAction } from "@/lib/types";

export const MODERATION_NOTE_MAX = 500;

export type FlagQueueRow = {
  flag: Flag;
  agentName: string;
  agentSlug: string;
  agentStatus: AgentStatus;
  conversationTitle: string | null;
  reporterName: string | null;
};

/** Rows for the admin queue: no message content, ever (T-04-06). */
export function flagQueue(s: DemoState, filter: { targetType: Flag["targetType"]; status: Flag["status"]; query?: string }): FlagQueueRow[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return allFlags(s)
    .filter((f) => f.targetType === filter.targetType && f.status === filter.status)
    .map((f): FlagQueueRow => {
      const agent = agentById(s, f.agentId);
      const conversation = f.conversationId ? allConversations(s).find((c) => c.id === f.conversationId) : undefined;
      return {
        flag: f,
        agentName: agent?.persona.name ?? "Unknown agent",
        agentSlug: agent?.slug ?? "",
        agentStatus: agent?.status ?? "unpublished",
        conversationTitle: conversation?.title ?? null,
        reporterName: f.reporterId ? displayName(s, f.reporterId) : null,
      };
    })
    .filter((row) => !q || `${row.flag.reason} ${row.agentName} ${row.conversationTitle ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => b.flag.createdAt.localeCompare(a.flag.createdAt));
}

export type ResolveFlagResult = { ok: true; flagId: string; edit: FlagEdit } | { ok: false; error: "unknown_flag" | "already_resolved" | "note_too_long" };

export function planResolveFlag(s: DemoState, flagId: string, note: string | null, now: string): ResolveFlagResult {
  const flag = allFlags(s).find((f) => f.id === flagId);
  if (!flag) return { ok: false, error: "unknown_flag" };
  if (flag.status === "resolved") return { ok: false, error: "already_resolved" };
  const trimmed = (note ?? "").trim();
  if (trimmed.length > MODERATION_NOTE_MAX) return { ok: false, error: "note_too_long" };
  return { ok: true, flagId, edit: { status: "resolved", resolvedAt: now, resolutionNote: trimmed || null } };
}

export function applyResolveFlag(s: DemoState, plan: Extract<ResolveFlagResult, { ok: true }>): DemoState {
  return { ...s, flagEdits: { ...s.flagEdits, [plan.flagId]: { ...s.flagEdits?.[plan.flagId], ...plan.edit } } };
}

/** Action: re-plans inside the commitDemo updater so it stays correct if state changed since the read. */
export function resolveFlag(flagId: string, note?: string): ResolveFlagResult {
  const now = new Date().toISOString();
  const initial = planResolveFlag(readDemo(), flagId, note ?? null, now);
  if (!initial.ok) return initial;
  let result: ResolveFlagResult = initial;
  commitDemo((s) => {
    const plan = planResolveFlag(s, flagId, note ?? null, now);
    result = plan;
    return plan.ok ? applyResolveFlag(s, plan) : s;
  });
  return result;
}

export type UnpublishResult = { ok: true; action: ModerationAction } | { ok: false; error: "note_required" | "note_too_long" | "unknown_agent" | "not_published" };

export function planUnpublish(s: DemoState, agentId: string, note: string, now: string, id?: string): UnpublishResult {
  const agent = agentById(s, agentId);
  if (!agent) return { ok: false, error: "unknown_agent" };
  if (agent.status !== "published") return { ok: false, error: "not_published" };
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "note_required" };
  if (trimmed.length > MODERATION_NOTE_MAX) return { ok: false, error: "note_too_long" };
  const flagIds = allFlags(s)
    .filter((f) => f.agentId === agentId && f.status === "open")
    .map((f) => f.id);
  const action: ModerationAction = { id: id ?? crypto.randomUUID(), kind: "unpublish", agentId, note: trimmed, flagIds, createdAt: now };
  return { ok: true, action };
}

export function applyUnpublish(s: DemoState, plan: Extract<UnpublishResult, { ok: true }>): DemoState {
  const { action } = plan;
  const flagEdits = { ...s.flagEdits };
  for (const flagId of action.flagIds) {
    flagEdits[flagId] = { ...flagEdits[flagId], status: "resolved", resolvedAt: action.createdAt, resolutionNote: `Agent unpublished: ${action.note}` };
  }
  return {
    ...s,
    agentEdits: { ...s.agentEdits, [action.agentId]: { ...s.agentEdits[action.agentId], status: "unpublished", updatedAt: action.createdAt } },
    moderationActions: [...(s.moderationActions ?? []), action],
    flagEdits,
  };
}

/** Action: does not call Phase 3's owner-only unpublishAgent, and never calls updateAgent inside an updater. */
export function unpublishAgentWithNote(agentId: string, note: string): UnpublishResult {
  const now = new Date().toISOString();
  const initial = planUnpublish(readDemo(), agentId, note, now);
  if (!initial.ok) return initial;
  let result: UnpublishResult = initial;
  commitDemo((s) => {
    const plan = planUnpublish(s, agentId, note, now);
    result = plan;
    return plan.ok ? applyUnpublish(s, plan) : s;
  });
  return result;
}
