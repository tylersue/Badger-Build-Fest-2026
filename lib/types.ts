import type { Category } from "@/lib/config/categories";
import type { MeteredPurpose } from "@/lib/config/credits";
import type { EvidenceCitation, RecordOrigin, RetrievedChunk, ToolStep } from "@/lib/contracts/phase2";
export type { MoneyAmount, Operation, ProviderAttempt, AnswerRevision, PersonaFieldState, PersonaState, SourceEstimate, RetrievedChunk, EvidenceCitation, ToolStep, ServiceResult, KnowledgeSource, KnowledgeChunk } from "@/lib/contracts/phase2";

/** Optional only for the Phase 1 display bridge; live service records require origin. */
type OriginBridge = { origin?: RecordOrigin };

export type IdentityKind = "expert" | "hirer";

export type Identity = OriginBridge & {
  id: string;
  kind: IdentityKind;
  displayName: string;
  avatarInitial: string;
  avatarColor: string;
  isSwitchable: boolean;
};

export type Profile = OriginBridge & {
  identityId: string;
  displayName: string;
  photoUrl?: string;
  field: string;
  credentials: string;
  yearsExperience: number | null;
  contactUrl: string;
  bio: string;
  location: string;
};

export type PersonaForm = {
  name: string;
  category: Category;
  headline: string;
  description: string;
  howIWork: string;
  always: string[];
  never: string[];
  exampleQuestions: string[];
  greeting: string;
};

export type AgentStatus = "draft" | "published" | "unpublished";

export type Agent = OriginBridge & {
  id: string;
  ownerId: string;
  slug: string;
  icon: string;
  persona: PersonaForm;
  systemPromptOverride: string | null;
  status: AgentStatus;
  rateMultiplier: number;
  consentAcceptedAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SourceKind = "interview" | "pdf" | "docx" | "txt" | "md" | "text";
export type SourceStatus = "queued" | "processing" | "ready" | "failed";

export type Source = OriginBridge & {
  id: string;
  agentId: string;
  kind: SourceKind;
  name: string;
  status: SourceStatus;
  chunkCount: number;
  pageCount: number | null;
  createdAt: string;
};

export type Chunk = OriginBridge & {
  id: string;
  agentId: string;
  sourceId: string;
  page: number | null;
  headingPath: string | null;
  question: string | null;
  content: string;
};

export type Citation = {
  n: number;
  chunkId: string | null;
  sourceType: "interview" | "document";
  sourceName: string;
  question: string | null;
  page: number | null;
  headingPath: string | null;
};

export type InterviewTurn = OriginBridge & {
  id: string;
  agentId: string;
  position: number;
  question: string;
  answer: string | null;
  createdAt: string;
};

export type Conversation = OriginBridge & {
  id: string;
  agentId: string;
  hirerId: string;
  title: string;
  shareTranscript: boolean;
  /** One hirer file per conversation, extracted to text and treated as untrusted context (CHAT-04). */
  fileName?: string | null;
  fileText?: string | null;
  fileChars?: number | null;
  createdAt: string;
};

export type Message = OriginBridge & {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | EvidenceCitation[];
  feedback: "up" | "down" | null;
  costCents: number | null;
  /** Fixed weak-retrieval reply: no model call, no charge (CHAT-03). */
  refusal?: boolean;
  retrieved?: { sourceName: string; score: number; page: number | null; question: string | null }[] | RetrievedChunk[];
  gap?: string | null;
  steps?: ToolStep[];
  createdAt: string;
};

export type LedgerKind = "seed" | "subscription" | "pack" | "debit" | "earnings" | "cashout" | "platform_cost" | "platform_margin";

export type LedgerEntry = OriginBridge & {
  id: string;
  /** null for the platform's own rows */
  identityId: string | null;
  kind: LedgerKind;
  amountCents: number;
  balanceAfter: number | null;
  purpose: MeteredPurpose | null;
  refType: "conversation" | "agent" | "source" | "interview" | null;
  refId: string | null;
  note: string;
  createdAt: string;
};

export type Flag = OriginBridge & {
  id: string;
  targetType: "agent" | "conversation";
  agentId: string;
  conversationId: string | null;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
};
