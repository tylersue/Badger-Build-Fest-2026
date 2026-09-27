import type { EvidenceCitation, MoneyAmount, Operation, RetrievedChunk, ServiceError, ToolStep } from "@/lib/contracts/phase2";

export type EventEnvelope = { operationId: string; eventId: string; sequence: number };
/** Persist before emitting. done means the message is durable; cost may still be pending. */
export type ChatStreamEvent = EventEnvelope & (
  | { type: "operation-start"; operation: Operation }
  | { type: "recovery-claim" }
  | { type: "sources"; chunks: RetrievedChunk[] }
  | { type: "text-delta"; delta: string }
  | { type: "citations"; citations: EvidenceCitation[] }
  | { type: "tool-start" | "tool-update" | "tool-result"; step: ToolStep }
  | { type: "knowledge-gap"; message: string }
  | { type: "cost"; status: "settled" | "pending"; estimateUnits: MoneyAmount; chargedUnits: MoneyAmount | null; balanceUnits: MoneyAmount; heldUnits: MoneyAmount }
  | { type: "refusal"; error: ServiceError }
  | { type: "error"; error: ServiceError }
  | { type: "done"; messageId: string }
);
