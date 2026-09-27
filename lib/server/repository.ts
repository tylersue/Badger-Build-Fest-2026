import "server-only";
import type { Agent, Profile } from "@/lib/types";
import type { KnowledgeSource, MoneyAmount } from "@/lib/contracts/phase2";
import { DatabaseFailure, requireServiceDb, type ServiceDb } from "./db";

/** Every query here scopes by agent/identity; routes must authorize before calling it. */
export interface AgentOwnerLookup { findAgentOwner(agentId: string): Promise<string | null> }
export interface Repository extends AgentOwnerLookup {
  getAgent(agentId: string): Promise<Agent | null>;
  getProfile(identityId: string): Promise<Profile | null>;
  listSources(agentId: string): Promise<KnowledgeSource[]>;
  getWalletBalance(identityId: string): Promise<{ balanceUnits: MoneyAmount; heldUnits: MoneyAmount } | null>;
  activateAnswerRevision(agentId: string, answerId: string, revisionId: string, expectedVersion: number): Promise<boolean>;
  activateSourceRevision(agentId: string, sourceId: string, revisionId: string, expectedVersion: number): Promise<boolean>;
}

function dataOrThrow<T>(result: { data: T; error: { code?: string } | null }): T {
  if (result.error) throw new DatabaseFailure("Database request failed.", result.error.code !== "PGRST301");
  return result.data;
}
/** Supabase JSON may parse bigint as number. Reject unsafe values before serializing. */
function money(value: number | string): MoneyAmount {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new DatabaseFailure("Stored money value exceeds safe JSON precision.", false);
    return BigInt(value).toString();
  }
  if (!/^-?(0|[1-9]\d*)$/.test(value)) throw new DatabaseFailure("Stored money value is invalid.", false);
  return value;
}

export function createRepository(db: ServiceDb = requireServiceDb()): Repository {
  return {
    async findAgentOwner(agentId) {
      const row = dataOrThrow(await db.from("agents").select("owner_id").eq("id", agentId).is("deleted_at", null).maybeSingle());
      return row?.owner_id ?? null;
    },
    async getAgent(agentId) {
      const row = dataOrThrow(await db.from("agents").select("*").eq("id", agentId).is("deleted_at", null).maybeSingle());
      if (!row) return null;
      const fields = dataOrThrow(await db.from("persona_fields").select("field,value").eq("agent_id", agentId));
      const values = Object.fromEntries((fields ?? []).map((field) => [field.field, field.value]));
      return {
        id: row.id, ownerId: row.owner_id, slug: row.slug, icon: row.icon,
        persona: { name: String(values.name ?? ""), category: row.category as Agent["persona"]["category"],
          headline: String(values.headline ?? ""), description: String(values.description ?? ""),
          howIWork: String(values.howIWork ?? ""), always: Array.isArray(values.always) ? values.always.map(String) : [],
          never: Array.isArray(values.never) ? values.never.map(String) : [],
          exampleQuestions: Array.isArray(values.exampleQuestions) ? values.exampleQuestions.map(String) : [],
          greeting: String(values.greeting ?? "") },
        systemPromptOverride: row.prompt_mode === "custom" ? row.custom_prompt : null,
        status: row.status as Agent["status"], rateMultiplier: row.rate_multiplier,
        consentAcceptedAt: row.consent_accepted_at, ratingAvg: row.rating_avg,
        ratingCount: row.rating_count, usageCount: row.usage_count,
        createdAt: row.created_at, updatedAt: row.updated_at, origin: row.origin,
      };
    },
    async getProfile(identityId) {
      const row = dataOrThrow(await db.from("profiles").select("*").eq("identity_id", identityId).maybeSingle());
      return row && { identityId: row.identity_id, displayName: row.display_name, photoUrl: row.photo_url ?? undefined,
        field: row.field, credentials: row.credentials, yearsExperience: row.years_experience,
        contactUrl: row.contact_url, bio: row.bio, location: row.location, origin: row.origin };
    },
    async listSources(agentId) {
      const rows = dataOrThrow(await db.from("sources").select("*").eq("agent_id", agentId).is("deleted_at", null).order("created_at"));
      return (rows ?? []).map((row): KnowledgeSource => {
        if (!row.current_revision_id) throw new DatabaseFailure("Source revision is missing.", false);
        return {
          id: row.id, agentId: row.agent_id, kind: row.kind as KnowledgeSource["kind"], name: row.name,
          state: row.state as KnowledgeSource["state"], currentRevisionId: row.current_revision_id,
          activeRevisionId: row.active_revision_id, contentHash: row.content_hash, byteCount: row.byte_count,
          pageCount: row.page_count, chunkCount: row.chunk_count, deletedAt: row.deleted_at,
          error: row.error ? { code: "indexing", message: "Indexing failed.", retryable: true } : null, origin: row.origin,
        };
      });
    },
    async getWalletBalance(identityId) {
      const row = dataOrThrow(await db.from("wallets").select("balance_units,held_units").eq("identity_id", identityId).maybeSingle());
      return row && { balanceUnits: money(row.balance_units), heldUnits: money(row.held_units) };
    },
    async activateAnswerRevision(agentId, answerId, revisionId, expectedVersion) {
      const row = dataOrThrow(await db.from("answers").update({ indexed_revision_id: revisionId, state: "ready" })
        .eq("agent_id", agentId).eq("id", answerId).eq("current_revision_id", revisionId)
        .eq("version", expectedVersion).is("deleted_at", null).select("id").maybeSingle());
      return row !== null;
    },
    async activateSourceRevision(agentId, sourceId, revisionId, expectedVersion) {
      const row = dataOrThrow(await db.from("sources").update({ active_revision_id: revisionId, state: "ready" })
        .eq("agent_id", agentId).eq("id", sourceId).eq("current_revision_id", revisionId)
        .eq("version", expectedVersion).is("deleted_at", null).select("id").maybeSingle());
      return row !== null;
    },
  };
}
