import { agentById, allConversations, allLedger, conversationStats, type DemoState } from "@/lib/demo-store";
import type { LedgerKind } from "@/lib/types";

export type ConversationEarnings = {
  conversationId: string;
  title: string;
  agentName: string;
  messages: number | null;
  grossCents: number;
  platformCents: number;
  netCents: number;
  lastEarnedAt: string;
};

export function earningsByConversation(s: DemoState, expertId: string): ConversationEarnings[] {
  const ledger = allLedger(s);
  const earnings = ledger.filter((row) => row.identityId === expertId && row.kind === "earnings" && row.refType === "conversation" && row.refId);
  const conversationIds = [...new Set(earnings.map((row) => row.refId!))];
  const conversations = allConversations(s);

  return conversationIds.map((conversationId) => {
    const earnedRows = earnings.filter((row) => row.refId === conversationId);
    const conversation = conversations.find((item) => item.id === conversationId);
    const sum = (predicate: (row: (typeof ledger)[number]) => boolean) =>
      ledger.filter((row) => row.refId === conversationId && row.refType === "conversation" && predicate(row)).reduce((total, row) => total + row.amountCents, 0);
    const lastEarnedAt = earnedRows.reduce((latest, row) => row.createdAt > latest ? row.createdAt : latest, "");
    const agentId = conversation?.agentId ?? s.snapshot?.earningAgents?.[conversationId];
    const agent = agentId ? agentById(s, agentId) : undefined;

    return {
      conversationId,
      title: conversation?.title ?? "Conversation",
      agentName: agent?.persona.name ?? "",
      messages: conversation ? conversationStats(s, conversation.id).messageCount : (s.v === 2 ? null : 0),
      grossCents: -sum((row) => row.kind === "debit"),
      platformCents: sum((row) => row.kind === "platform_cost" || row.kind === "platform_margin"),
      netCents: earnedRows.reduce((total, row) => total + row.amountCents, 0),
      lastEarnedAt,
    };
  }).sort((a, b) => b.lastEarnedAt.localeCompare(a.lastEarnedAt) || a.conversationId.localeCompare(b.conversationId));
}

export function earningsTotals(rows: Pick<ConversationEarnings, "grossCents" | "platformCents" | "netCents">[]) {
  return rows.reduce((totals, row) => ({
    grossCents: totals.grossCents + row.grossCents,
    platformCents: totals.platformCents + row.platformCents,
    netCents: totals.netCents + row.netCents,
  }), { grossCents: 0, platformCents: 0, netCents: 0 });
}

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  seed: "Seed",
  subscription: "Subscription",
  pack: "Credit pack",
  debit: "Debit",
  earnings: "Earnings",
  cashout: "Cash-out",
  platform_cost: "Platform cost",
  platform_margin: "Platform margin",
};
