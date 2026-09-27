import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { CATEGORIES } from "@/lib/config/categories";
import type { Agent, Citation, Conversation, Identity, InterviewTurn, LedgerEntry, Message, PersonaForm, Profile, Source } from "@/lib/types";
import type { MoneyAmount } from "@/lib/contracts/phase2";
import { DatabaseFailure, requireServiceDb, type ServiceDb } from "./db";
import { ApiRequestError } from "./request";
import { bootstrapDemoSeed } from "@/scripts/seed";

const category = z.enum(CATEGORIES.map((item) => item.id) as [PersonaForm["category"], ...PersonaForm["category"][]]);
const httpUrl = z.string().max(2048).refine((value) => {
  if (value === "") return true;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; }
  catch { return false; }
}, "Use an http or https URL.");
const bounded = (max: number) => z.string().trim().max(max);
const profilePatchSchema = z.strictObject({
  displayName: bounded(120).min(1), photoUrl: httpUrl, field: bounded(120),
  credentials: bounded(250), yearsExperience: z.number().int().min(0).max(100).nullable(),
  contactUrl: httpUrl, bio: bounded(4000), location: bounded(160),
}).partial().refine((patch) => Object.keys(patch).length > 0);
export const saveProfileInputSchema = z.strictObject({
  patch: profilePatchSchema, expectedVersion: z.number().int().positive(),
});
export const createAgentInputSchema = z.strictObject({ name: bounded(120).min(1), category });

const personaPatchSchema = z.strictObject({
  name: bounded(120).min(1), category, headline: bounded(200), description: bounded(4000),
  howIWork: bounded(2000), always: z.array(bounded(250)).max(20),
  never: z.array(bounded(250)).max(20), exampleQuestions: z.array(bounded(250)).max(20),
  greeting: bounded(500),
}).partial().refine((patch) => Object.keys(patch).length > 0);
const importBase = { key: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/) };
export const legacyImportRecordSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...importBase, kind: z.literal("profile"), patch: profilePatchSchema }),
  z.strictObject({ ...importBase, kind: z.literal("persona"), agentId: z.string().min(1).max(200), patch: personaPatchSchema }),
  z.strictObject({ ...importBase, kind: z.literal("answer"), agentId: z.string().min(1).max(200),
    question: bounded(2000).min(1), text: bounded(20000).min(1) }),
]);
export const legacyImportInputSchema = z.strictObject({ records: z.array(z.unknown()).min(1).max(100) });
export type LegacyImportRecord = z.infer<typeof legacyImportRecordSchema>;
export type ImportResult = { key: string | null; ok: true; id: string; imported: boolean } |
  { key: string | null; ok: false; code: "invalid_input" | "not_owner" | "conflict" | "indexing" };

const DEMO_IDS = new Set(["maria", "sam"]);
function assertIdentity(identityId: string): void {
  if (!DEMO_IDS.has(identityId)) throw new ApiRequestError("invalid_input", "Invalid demo identity.", 400);
}
function value<T>(result: { data: T; error: { code?: string } | null }): T {
  if (result.error) throw new DatabaseFailure("Database request failed.", result.error.code !== "PGRST301");
  return result.data;
}
function units(raw: string | number): MoneyAmount {
  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw)) throw new DatabaseFailure("Unsafe stored money value.", false);
    return BigInt(raw).toString();
  }
  if (!/^-?(0|[1-9]\d*)$/.test(raw)) throw new DatabaseFailure("Invalid stored money value.", false);
  return raw;
}
function displayCents(raw: string | number | null): number | null {
  if (raw === null) return null;
  // Legacy cent selectors are display only; settlement uses decimal units.
  const result = Number(BigInt(units(raw))) / 100_000;
  return Number.isSafeInteger(result) ? result : null;
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export type DemoSnapshot = {
  identityId: string;
  identities: Identity[];
  profiles: Profile[];
  agents: Agent[];
  sources: Source[];
  interviewTurns: InterviewTurn[];
  conversations: Conversation[];
  messages: Message[];
  ledger: LedgerEntry[];
  wallet: { balanceUnits: MoneyAmount; heldUnits: MoneyAmount; balanceCents: number | null };
  backend: {
    configured: true;
    agentOrigins: Record<string, "fixture" | "live">;
    sourceStates: Record<string, { origin: "fixture" | "live"; state: string; currentRevisionId: string | null; activeRevisionId: string | null }>;
    answerStates: Record<string, { origin: "fixture" | "live"; state: string; currentRevisionId: string | null; indexedRevisionId: string | null }>;
    profileVersion: number;
  };
};

/** Public listings plus selected identity's private builder, wallet and history. */
export async function getDemoSnapshot(identityId: string, db: ServiceDb = requireServiceDb()): Promise<DemoSnapshot> {
  assertIdentity(identityId);
  const [identities, profile, agents, wallet, ledger, conversations] = await Promise.all([
    db.from("identities").select("*").eq("is_switchable", true),
    db.from("profiles").select("*").eq("identity_id", identityId).single(),
    db.from("agents").select("*").or(`status.eq.published,owner_id.eq.${identityId}`).is("deleted_at", null),
    db.from("wallets").select("*").eq("identity_id", identityId).single(),
    db.from("ledger").select("*").eq("identity_id", identityId).order("created_at", { ascending: false }),
    db.from("conversations").select("*").eq("hirer_id", identityId).order("created_at", { ascending: false }),
  ]);
  const identityRows = value(identities) ?? [];
  const profileRow = value(profile);
  const agentRows = value(agents) ?? [];
  const walletRow = value(wallet);
  if (!profileRow || !walletRow) throw new DatabaseFailure("Demo identity is not seeded.", false, "configuration");
  const ledgerRows = value(ledger) ?? [];
  const conversationRows = value(conversations) ?? [];
  const ownedIds = agentRows.filter((agent) => agent.owner_id === identityId).map((agent) => agent.id);
  const allIds = agentRows.map((agent) => agent.id);
  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const [personaResult, sourceResult, questionResult, answerResult, messageResult] = await Promise.all([
    allIds.length ? db.from("persona_fields").select("*").in("agent_id", allIds) : Promise.resolve({ data: [], error: null }),
    ownedIds.length ? db.from("sources").select("*").in("agent_id", ownedIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
    ownedIds.length ? db.from("questions").select("*").in("agent_id", ownedIds).order("position") : Promise.resolve({ data: [], error: null }),
    ownedIds.length ? db.from("answers").select("*").in("agent_id", ownedIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
    conversationIds.length ? db.from("messages").select("*").in("conversation_id", conversationIds).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  const personaRows = value(personaResult) ?? [];
  const sourceRows = value(sourceResult) ?? [];
  const questionRows = value(questionResult) ?? [];
  const answerRows = value(answerResult) ?? [];
  const messageRows = value(messageResult) ?? [];
  const revisionIds = answerRows.map((answer) => answer.current_revision_id).filter((id): id is string => id !== null);
  const revisions = revisionIds.length ? value(await db.from("answer_revisions").select("id,text").in("id", revisionIds)) ?? [] : [];
  const textByRevision = new Map(revisions.map((revision) => [revision.id, revision.text]));
  const answerByQuestion = new Map(answerRows.map((answer) => [answer.question_id, answer]));
  const personaByAgent = new Map<string, Record<string, unknown>>();
  for (const row of personaRows) {
    const fields = personaByAgent.get(row.agent_id) ?? {};
    fields[row.field] = row.value;
    personaByAgent.set(row.agent_id, fields);
  }
  const defaults = (categoryValue: Agent["persona"]["category"]): Agent["persona"] => ({
    name: "", category: categoryValue, headline: "", description: "", howIWork: "",
    always: [], never: [], exampleQuestions: [], greeting: "",
  });
  const convertedAgents: Agent[] = agentRows.map((row) => ({
    id: row.id, ownerId: row.owner_id, slug: row.slug, icon: row.icon,
    status: row.status as Agent["status"], rateMultiplier: row.rate_multiplier,
    consentAcceptedAt: row.consent_accepted_at, ratingAvg: row.rating_avg,
    ratingCount: row.rating_count, usageCount: row.usage_count,
    createdAt: row.created_at, updatedAt: row.updated_at, origin: row.origin,
    systemPromptOverride: row.prompt_mode === "custom" ? row.custom_prompt : null,
    persona: { ...defaults(row.category as Agent["persona"]["category"]),
      ...personaByAgent.get(row.id), category: row.category } as Agent["persona"],
  }));
  const convertedSources: Source[] = sourceRows.map((row) => ({
    id: row.id, agentId: row.agent_id, kind: row.kind as Source["kind"], name: row.name,
    status: row.state as Source["status"], chunkCount: row.chunk_count,
    pageCount: row.page_count, createdAt: row.created_at, origin: row.origin,
  }));
  const convertedTurns: InterviewTurn[] = questionRows.map((row) => {
    const answer = answerByQuestion.get(row.id);
    return { id: row.id, agentId: row.agent_id, position: row.position,
      question: row.text, answer: answer?.current_revision_id ? textByRevision.get(answer.current_revision_id) ?? null : null,
      createdAt: row.created_at, origin: row.origin };
  });
  const selectedProfile: Profile = {
    identityId, displayName: profileRow.display_name, photoUrl: profileRow.photo_url ?? undefined,
    field: profileRow.field, credentials: profileRow.credentials,
    yearsExperience: profileRow.years_experience, contactUrl: profileRow.contact_url,
    bio: profileRow.bio, location: profileRow.location, origin: profileRow.origin,
  };
  return {
    identityId,
    identities: identityRows.map((row) => ({ id: row.id, kind: row.kind, displayName: row.display_name,
      avatarInitial: row.avatar_initial, avatarColor: row.avatar_color, isSwitchable: row.is_switchable, origin: row.origin })),
    profiles: [selectedProfile], agents: convertedAgents, sources: convertedSources,
    interviewTurns: convertedTurns,
    conversations: conversationRows.map((row) => ({ id: row.id, agentId: row.agent_id,
      hirerId: row.hirer_id, title: row.title, shareTranscript: row.share_transcript,
      createdAt: row.created_at, origin: row.origin })),
    messages: messageRows.map((row) => ({ id: row.id, conversationId: row.conversation_id,
      role: row.role as Message["role"], content: row.content,
      citations: row.citations as Citation[], feedback: row.feedback as Message["feedback"],
      costCents: displayCents(row.charged_units), createdAt: row.created_at, origin: row.origin })),
    ledger: ledgerRows.map((row) => ({ id: row.id, identityId: row.identity_id,
      kind: row.kind as LedgerEntry["kind"], amountCents: displayCents(row.amount_units) ?? 0,
      balanceAfter: displayCents(row.balance_after_units), purpose: row.purpose as LedgerEntry["purpose"],
      refType: row.ref_type as LedgerEntry["refType"], refId: row.ref_id,
      note: row.note, createdAt: row.created_at, origin: row.origin })),
    wallet: { balanceUnits: units(walletRow.balance_units), heldUnits: units(walletRow.held_units),
      balanceCents: displayCents(walletRow.balance_units) },
    backend: { configured: true, profileVersion: profileRow.version,
      agentOrigins: Object.fromEntries(agentRows.map((row) => [row.id, row.origin])),
      sourceStates: Object.fromEntries(sourceRows.map((row) => [row.id,
        { origin: row.origin, state: row.state, currentRevisionId: row.current_revision_id,
          activeRevisionId: row.active_revision_id }])),
      answerStates: Object.fromEntries(answerRows.map((row) => [row.id,
        { origin: row.origin, state: row.state, currentRevisionId: row.current_revision_id,
          indexedRevisionId: row.indexed_revision_id }])),
    },
  };
}

export async function createAgent(identityId: string, input: unknown, db: ServiceDb = requireServiceDb()): Promise<Agent> {
  assertIdentity(identityId);
  if (identityId !== "maria") throw new ApiRequestError("not_owner", "Only the expert demo identity can create agents.", 404);
  const parsed = createAgentInputSchema.safeParse(input);
  if (!parsed.success) throw new ApiRequestError("invalid_input", "Invalid agent.", 400);
  const id = `agent-${randomUUID()}`;
  value(await db.rpc("create_demo_agent" as never, {
    p_identity_id: identityId, p_agent_id: id, p_name: parsed.data.name, p_category: parsed.data.category,
  } as never));
  const row = value(await db.from("agents").select("created_at,updated_at").eq("id", id).single());
  if (!row) throw new DatabaseFailure("Created agent is unavailable.");
  return { id, slug: id, ownerId: identityId, icon: "bot", status: "draft", rateMultiplier: 1,
    consentAcceptedAt: null, ratingAvg: 0, ratingCount: 0, usageCount: 0,
    createdAt: row.created_at, updatedAt: row.updated_at, origin: "live", systemPromptOverride: null,
    persona: { name: parsed.data.name, category: parsed.data.category, headline: "", description: "",
      howIWork: "", always: [], never: [], exampleQuestions: [], greeting: "" } };
}

export async function saveProfile(identityId: string, input: unknown, db: ServiceDb = requireServiceDb()): Promise<{ profile: Profile; version: number }> {
  assertIdentity(identityId);
  const parsed = saveProfileInputSchema.safeParse(input);
  if (!parsed.success) throw new ApiRequestError("invalid_input", "Invalid profile edit.", 400);
  const patch = parsed.data.patch;
  const columns = {
    ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
    ...(patch.photoUrl !== undefined ? { photo_url: patch.photoUrl || null } : {}),
    ...(patch.field !== undefined ? { field: patch.field } : {}),
    ...(patch.credentials !== undefined ? { credentials: patch.credentials } : {}),
    ...(patch.yearsExperience !== undefined ? { years_experience: patch.yearsExperience } : {}),
    ...(patch.contactUrl !== undefined ? { contact_url: patch.contactUrl } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.location !== undefined ? { location: patch.location } : {}),
    origin: "live" as const,
  };
  const row = value(await db.from("profiles").update(columns).eq("identity_id", identityId)
    .eq("version", parsed.data.expectedVersion).select("*").maybeSingle());
  if (!row) throw new ApiRequestError("conflict", "Profile changed. Refresh and retry.", 409);
  return { profile: { identityId, displayName: row.display_name, photoUrl: row.photo_url ?? undefined,
    field: row.field, credentials: row.credentials, yearsExperience: row.years_experience,
    contactUrl: row.contact_url, bio: row.bio, location: row.location, origin: row.origin }, version: row.version };
}

/** Per-record acknowledgement lets the browser retain failed local drafts. */
export async function importLegacyDraft(identityId: string, records: unknown[], db: ServiceDb = requireServiceDb()): Promise<ImportResult[]> {
  assertIdentity(identityId);
  if (records.length < 1 || records.length > 100) throw new ApiRequestError("invalid_input", "Invalid import batch.", 400);
  const results: ImportResult[] = [];
  for (const unknownRecord of records) {
    const parsed = legacyImportRecordSchema.safeParse(unknownRecord);
    const key = unknownRecord && typeof unknownRecord === "object" && "key" in unknownRecord && typeof unknownRecord.key === "string"
      ? unknownRecord.key : null;
    if (!parsed.success) { results.push({ key, ok: false, code: "invalid_input" }); continue; }
    const record = parsed.data;
    const payload = record.kind === "profile" ? record.patch : record.kind === "persona"
      ? { agentId: record.agentId, patch: record.patch }
      : { agentId: record.agentId, question: record.question, text: record.text };
    const hash = createHash("sha256").update(stableJson({ kind: record.kind, payload })).digest("hex");
    try {
      const response = await db.rpc("commit_legacy_draft" as never, {
        p_identity_id: identityId, p_import_key: record.key, p_payload_hash: hash,
        p_kind: record.kind, p_payload: payload,
      } as never);
      if (response.error) {
        results.push({ key: record.key, ok: false, code: response.error.code === "23505" ? "conflict" : "indexing" });
      } else {
        const data = response.data as { id?: unknown; imported?: unknown } | null;
        if (typeof data?.id !== "string") throw new DatabaseFailure();
        results.push({ key: record.key, ok: true, id: data.id, imported: data.imported === true });
      }
    } catch {
      results.push({ key: record.key, ok: false, code: "indexing" });
    }
  }
  return results;
}

/** Restore missing fixture rows only. Live drafts, operations, holds and money are untouched. */
export async function resetPresentationFixtures(identityId: string, db: ServiceDb = requireServiceDb()): Promise<DemoSnapshot> {
  assertIdentity(identityId);
  await bootstrapDemoSeed(db);
  return getDemoSnapshot(identityId, db);
}
