/** Idempotent presentation fixtures. All rows retain their original text IDs. */
import { createClient } from "@supabase/supabase-js";
import { AGENTS, CONVERSATIONS, IDENTITIES, INTERVIEW_TURNS, MESSAGES, PROFILES, SOURCES } from "../lib/data/seed";
import type { ServiceDb } from "../lib/server/db";

function checked(error: { message: string } | null): void {
  if (error) throw new Error(`Seed bootstrap failed: ${error.message}`);
}

export async function bootstrapDemoSeed(db: ServiceDb): Promise<void> {
  checked((await db.from("identities").upsert(IDENTITIES.map((i) => ({
    id: i.id, kind: i.kind, display_name: i.displayName, avatar_initial: i.avatarInitial,
    avatar_color: i.avatarColor, is_switchable: i.isSwitchable, origin: "fixture" as const,
  })), { onConflict: "id", ignoreDuplicates: true })).error);

  checked((await db.from("profiles").upsert(PROFILES.map((p) => ({
    identity_id: p.identityId, display_name: p.displayName, photo_url: p.photoUrl ?? null,
    field: p.field, credentials: p.credentials, years_experience: p.yearsExperience,
    contact_url: p.contactUrl, bio: p.bio, location: p.location, origin: "fixture" as const,
  })), { onConflict: "identity_id", ignoreDuplicates: true })).error);

  for (const identity of IDENTITIES) {
    // This SQL RPC owns the wallet lock and grant ledger insert in one transaction.
    checked((await db.rpc("bootstrap_seed_credit" as never, { p_identity_id: identity.id } as never)).error);
  }

  checked((await db.from("agents").upsert(AGENTS.map((a) => ({
    id: a.id, owner_id: a.ownerId, slug: a.slug, icon: a.icon, category: a.persona.category,
    status: a.status, rate_multiplier: a.rateMultiplier, consent_accepted_at: a.consentAcceptedAt,
    prompt_mode: "generated" as const, custom_prompt: null, rating_avg: a.ratingAvg,
    rating_count: a.ratingCount, usage_count: a.usageCount, origin: "fixture" as const,
    created_at: a.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);

  checked((await db.from("persona_fields").upsert(AGENTS.flatMap((a) =>
    Object.entries(a.persona).map(([field, value]) => ({
      agent_id: a.id, field, value, origin: "expert" as const,
    }))), { onConflict: "agent_id,field", ignoreDuplicates: true })).error);

  checked((await db.from("interview_sessions").upsert(AGENTS.map((a) => ({
    id: `session:${a.id}`, agent_id: a.id, state: "paused",
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  checked((await db.from("questions").upsert(INTERVIEW_TURNS.map((t) => ({
    id: t.id, agent_id: t.agentId, session_id: `session:${t.agentId}`,
    position: t.position, text: t.question, origin: "fixture" as const, created_at: t.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);

  const answered = INTERVIEW_TURNS.filter((turn) => turn.answer !== null);
  checked((await db.from("answers").upsert(answered.map((t) => ({
    id: `answer:${t.id}`, agent_id: t.agentId, question_id: t.id, state: "captured",
    origin: "fixture" as const, created_at: t.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  checked((await db.from("answer_revisions").upsert(answered.map((t) => ({
    id: `revision:${t.id}`, agent_id: t.agentId, answer_id: `answer:${t.id}`,
    question_id: t.id, question: t.question, text: t.answer!, revision_number: 1,
    created_at: t.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  for (const turn of answered) {
    checked((await db.from("answers").update({ current_revision_id: `revision:${turn.id}` })
      .eq("id", `answer:${turn.id}`).is("current_revision_id", null)).error);
  }

  // Metadata is display-only. No fixture text receives an embedding or active
  // searchable revision; the live retriever must require origin='live'.
  const documents = SOURCES.filter((source) => source.kind !== "interview");
  checked((await db.from("sources").upsert(documents.map((source) => ({
    id: source.id, agent_id: source.agentId, kind: source.kind, name: source.name,
    state: source.status, content_hash: `fixture:${source.id}`, byte_count: 0,
    page_count: source.pageCount, chunk_count: source.chunkCount, origin: "fixture" as const,
    created_at: source.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  checked((await db.from("source_revisions").upsert(documents.map((source) => ({
    id: `revision:${source.id}`, agent_id: source.agentId, source_id: source.id,
    revision_number: 1, content_hash: `fixture:${source.id}`, byte_count: 0,
    page_count: source.pageCount, created_at: source.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  for (const source of documents) {
    checked((await db.from("sources").update({ current_revision_id: `revision:${source.id}` })
      .eq("id", source.id).is("current_revision_id", null)).error);
  }

  checked((await db.from("conversations").upsert(CONVERSATIONS.map((c) => ({
    id: c.id, agent_id: c.agentId, hirer_id: c.hirerId, mode: "chat", title: c.title,
    share_transcript: c.shareTranscript, origin: "fixture" as const, created_at: c.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
  const agentForConversation = new Map(CONVERSATIONS.map((c) => [c.id, c.agentId]));
  checked((await db.from("messages").upsert(MESSAGES.map((m) => ({
    id: m.id, agent_id: agentForConversation.get(m.conversationId)!, conversation_id: m.conversationId,
    role: m.role, content: m.content, citations: m.citations, retrieved: m.retrieved ?? [],
    feedback: m.feedback, charged_units: null, origin: "fixture" as const,
    created_at: m.createdAt,
  })), { onConflict: "id", ignoreDuplicates: true })).error);
}

/** Run with a TypeScript runner in a configured server environment. */
if (process.argv[1]?.endsWith("/scripts/seed.ts")) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ServiceDb;
  bootstrapDemoSeed(db).catch((error) => { console.error(error); process.exitCode = 1; });
}
