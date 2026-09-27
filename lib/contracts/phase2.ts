/** Shared, versioned JSON contracts. No provider execution or credentials belong here. */
import type { z } from "zod";
import type { PersonaForm, SourceKind } from "@/lib/types";

export const CONTRACT_VERSION = "phase2.v1" as const;
export const UNITS_PER_USD = BigInt(1_000_000_000);
export const UNITS_PER_CREDIT = BigInt(10_000_000);
/** Canonical nonnegative decimal integer string; validate at every JSON boundary. */
export type MoneyAmount = string;
export type RecordOrigin = "fixture" | "live";
export type ServiceErrorCode = "invalid_input" | "not_owner" | "conflict" | "insufficient_credits" | "daily_cap" | "configuration" | "quota" | "stale_estimate" | "provider" | "indexing" | "unknown_usage";
export type ServiceError = {
  code: ServiceErrorCode; message: string; retryable: boolean; operationId?: string;
  neededUnits?: MoneyAmount; availableUnits?: MoneyAmount; resetAt?: string;
};
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export type OperationPurpose = "interview" | "embedding" | "sandbox" | "chat" | "source" | "persona";
export type OperationState = "reserved" | "running" | "completed" | "failed" | "unknown" | "settled" | "cancelled";
export type Operation = {
  id: string; requestKey: string; identityId: string; agentId: string; purpose: OperationPurpose;
  state: OperationState; estimateUnits: MoneyAmount; heldUnits: MoneyAmount; actualUnits: MoneyAmount | null;
  priceVersion: string; payloadHash: string; createdAt: string; chatRateMultiplier?: number | null;
};
export type AttemptState = "prepared" | "dispatched" | "completed" | "failed" | "unknown" | "settled";
export type ProviderAttempt = {
  id: string; operationId: string; stageKey: string; attempt: number;
  provider: "anthropic" | "voyage"; model: string; state: AttemptState; providerRequestId: string | null;
  dispatchDay: string | null; inputTokens: number | null; outputTokens: number | null;
  cacheReadTokens: number | null; cacheWriteTokens: number | null; embeddingTokens: number | null;
  successfulSearchCount: number | null; grossCostUnits: MoneyAmount | null; effectiveCostUnits: MoneyAmount | null;
  latencyMs: number | null; requestMetadata: { inputChars: number; maxOutputTokens: number; textCount?: number };
};
export type Attempt = ProviderAttempt;
export type AnswerRevision = {
  answerId: string; revisionId: string; parentAnswerId?: string; questionId: string;
  question: string; text: string; version: number; deletedAt: string | null;
};
export type InterviewAnswer = {
  id: string; agentId: string; questionId: string; parentAnswerId: string | null;
  currentRevisionId: string; indexedRevisionId: string | null;
  state: "captured" | "indexing" | "ready" | "failed"; version: number; deletedAt: string | null;
  origin: RecordOrigin;
};
export type PersonaFieldName = keyof PersonaForm;
export type PersonaSuggestion<T = string | string[]> = { value: T; evidenceRevisionIds: string[]; observedVersion: number };
export type PersonaFieldState<T = string | string[]> = {
  value: T; origin: "blank" | "interview" | "expert"; version: number;
  evidenceRevisionIds: string[]; pendingSuggestion: PersonaSuggestion<T> | null;
};
export type PersonaState = {
  fields: { [K in PersonaFieldName]: PersonaFieldState<PersonaForm[K]> };
  version: number; promptMode: "generated" | "custom"; customPrompt: string | null; promptVersion: number;
};
export type PersonaPatch = { [K in PersonaFieldName]: { field: K; value: PersonaForm[K]; evidenceRevisionIds: string[] } }[PersonaFieldName];
export type PersonaVersions = Partial<Record<PersonaFieldName, number>>;
export type KnowledgeSource = {
  id: string; agentId: string; kind: SourceKind; name: string; state: "queued" | "processing" | "ready" | "failed";
  currentRevisionId: string; activeRevisionId: string | null; contentHash: string; byteCount: number;
  pageCount: number | null; chunkCount: number; deletedAt: string | null; error: ServiceError | null; origin: RecordOrigin;
};
/** Live chunks are revision scoped. Validate vector length before database insertion. */
export type KnowledgeChunk = {
  id: string; sourceId: string | null; answerId: string | null; agentId: string; revisionId: string;
  ordinal: number; content: string; question: string | null; page: number | null; headingPath: string | null;
  vector: number[];
};
export type RetrievedChunk = {
  id: string; agentId: string; revisionId: string; sourceId: string;
  sourceType: "interview" | "document"; sourceName: string; content: string;
  question: string | null; page: number | null; headingPath: string | null; score: number;
};
type CitationBase = { readonly evidenceId: string; readonly ordinal: number; readonly excerpt: string; readonly sourceName: string };
export type EvidenceCitation = Readonly<CitationBase & (
  | { sourceType: "interview" | "document"; sourceId: string; revisionId: string; chunkId: string;
      question: string | null; page: number | null; headingPath: string | null; historical: boolean }
  | { sourceType: "web"; title: string; url: string; retrievedAt: string }
)>;
export type ToolStep = {
  id: string; operationId: string; sequence: number; kind: "search" | "page-read";
  status: "running" | "complete" | "failed"; query?: string; title?: string; url?: string; error?: string;
};
export type SourceLimits = {
  maxSources: number; maxFileBytes: number; maxAgentBytes: number; maxPdfPages: number;
  maxExtractedChars: number; maxActiveChunks: number; chunkTargetChars: number; chunkOverlapChars: number;
  parserTimeoutMs: number; parserHeapMb: number; maxDocxInflatedBytes: number;
};
export type SourceUsage = { sources: number; bytes: number; chunks: number };
export type SourceEstimate = {
  agentId: string; name: string; kind: Exclude<SourceKind, "interview">; contentHash: string;
  estimateToken: string; version: number; expiresAt: string; byteCount: number;
  projectedUse: SourceUsage; remaining: SourceUsage; limits: SourceLimits;
  estimateUnits: MoneyAmount; maxUnits: MoneyAmount; priceVersion: string;
  projectedPageCount: number | null; projectedChunkCount: number | null;
  walletAvailableUnits: MoneyAmount; walletHeldUnits: MoneyAmount;
};
export type IndexProgress = { completedBatches: number; totalBatches: number; indexedChunks: number };
export type IndexResult = { state: "ready" | "pending" | "failed"; jobId: string; progress: IndexProgress };
export type TextSegment = { content: string; page: number | null; headingPath: string | null };
export type ProviderLimits = { maxInputChars: number; maxHistoryMessages: number; maxOutputTokens: number; timeoutMs: number; maxContextTokens: number; maxContinuations: number };
export type ReserveOperationInput = {
  identityId: string; agentId: string; purpose: OperationPurpose; requestKey: string; payloadHash: string;
  estimateUnits: bigint; maxUnits: bigint; priceVersion: string;
};
/** Operator-provided evidence is required to resolve ambiguous dispatched usage. */
export type ReconciliationEvidence = {
  attemptId: string; action: "prove_undispatched" | "record_usage"; note: string; recordedBy: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number;
    embeddingTokens: number; successfulSearchCount: number };
};
export type SubmitInterviewAnswerInput = {
  agentId: string; questionId: string; text: string; requestKey: string; expectedVersion: number; parentAnswerId?: string;
};
export type InterviewControl = "start" | "pause" | "resume" | "skip" | "continue" | "dismiss-ready";
export type SourceInput = { agentId: string; fileOrText: File | string; name: string };
export type ConfirmSourceInput = SourceInput & { estimateToken: string; requestKey: string };
export type SearchKnowledgeInput = { agentId: string; query: string; operation: Operation; k?: number };
export type RunAnswerInput = { agentId: string; actorId: string; conversationId: string; requestKey: string; text: string; mode: "sandbox" | "chat" };
export type MeteredStructuredInput<T> = { operation: Operation; stageKey: string; model: string; instructions: string; input: string; schema: z.ZodType<T>; limits: ProviderLimits };
export type MeteredStreamInput = Omit<MeteredStructuredInput<unknown>, "schema">;
export type EmbedTextsInput = { operation: Operation; stageKey: string; texts: string[]; inputType: "document" | "query" };
/** Named function contracts let independent lanes supply explicit adapters without fallbacks. */
export type ReserveOperation = (input: ReserveOperationInput) => Promise<ServiceResult<Operation>>;
export type ExpandReservation = (operationId: string, additionalUnits: bigint) => Promise<ServiceResult<Operation>>;
export type RecordAttempt = (attempt: ProviderAttempt) => Promise<ServiceResult<ProviderAttempt>>;
export type SettleOperation = (operationId: string) => Promise<ServiceResult<Operation>>;
export type ReconcileOperation = (operationId: string, evidence: ReconciliationEvidence[]) => Promise<ServiceResult<Operation>>;
export type MeteredStructured = <T>(input: MeteredStructuredInput<T>) => Promise<ServiceResult<T>>;
export type EmbedTexts = (input: EmbedTextsInput) => Promise<ServiceResult<number[][]>>;
export type SearchKnowledge = (input: SearchKnowledgeInput) => Promise<ServiceResult<RetrievedChunk[]>>;
export type IndexRevision = (jobId: string) => Promise<ServiceResult<IndexResult>>;
export type PreflightSource = (input: SourceInput) => Promise<ServiceResult<SourceEstimate>>;
export type ConfirmSource = (input: ConfirmSourceInput) => Promise<ServiceResult<IndexResult>>;
export type ApplyPersonaSuggestions = (agentId: string, patches: PersonaPatch[], observedVersions: PersonaVersions) => Promise<ServiceResult<PersonaState>>;
export type SavePersonaFields = (agentId: string, patch: Partial<PersonaForm>, expectedVersions: PersonaVersions) => Promise<ServiceResult<PersonaState>>;
export type SetCustomPrompt = (agentId: string, text: string, expectedVersion: number) => Promise<ServiceResult<PersonaState>>;
export type RegeneratePrompt = (agentId: string, expectedVersion: number, confirmed: boolean) => Promise<ServiceResult<PersonaState>>;
export type RunAnswer = (input: RunAnswerInput) => AsyncIterable<import("@/features/runtime/events").ChatStreamEvent>;
export type { ChatStreamEvent } from "@/features/runtime/events";
