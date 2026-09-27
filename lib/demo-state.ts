import type { Agent, Conversation, Flag, InterviewTurn, LedgerEntry, Message, ModerationAction, Payout, Profile, Review } from "@/lib/types";
import type { DemoSnapshot } from "@/lib/server/demo";
import type { InterviewView } from "@/features/builder/interview";

export type DraftKind = "interview" | "interview-control" | "grant" | "persona" | "source" | "sandbox" | "profile" | "chat";
export type Draft = { value: string; requestKey: string; dirty: true; operationId?: string };
export type Drafts = Record<string, Draft>;

export type DemoState = {
  v: 1 | 2;
  snapshot: DemoSnapshot | null;
  drafts: Drafts;
  interviews: Record<string, InterviewView>;
  status: "loading" | "ready" | "error";
  error: string | null;
  identityId: string;
  ledger: LedgerEntry[];
  profileEdits: Record<string, Partial<Profile>>;
  agentEdits: Record<string, Partial<Agent>>;
  newAgents: Agent[];
  conversations: Conversation[];
  conversationEdits: Record<string, Partial<Conversation>>;
  messages: Message[];
  interviewTurns: InterviewTurn[];
  answeredTurns: Record<string, string>;
  /** Last time an agent's knowledge changed in this browser (answers), for "knowledge updated". */
  knowledgeTouchedAt: Record<string, string>;
  /** Reviews written in this browser (Phase 4 MKT-05/MKT-V2-03). Optional so old saved state stays valid (D-03). */
  reviews?: Review[];
  /** Flags written in this browser (Phase 4 MKT-06). Optional so old saved state stays valid (D-03). */
  flags?: Flag[];
  /** Admin edits (resolve/unresolve) overlaid onto seeded and new flags by id (ADMN-01). */
  flagEdits?: Record<string, FlagEdit>;
  /** Thumbs overlay by message id (CHAT-08); overrides the seeded/stored Message.feedback. */
  messageFeedback?: Record<string, Message["feedback"]>;
  /** Mock cash-out records (CRED-09). */
  payouts?: Payout[];
  /** Admin unpublish actions (ADMN-01). */
  moderationActions?: ModerationAction[];
};

/** Admin-editable subset of a Flag, overlaid by id (Phase 4 seam, D-02). */
export type FlagEdit = Partial<Pick<Flag, "status" | "resolvedAt" | "resolutionNote">>;
