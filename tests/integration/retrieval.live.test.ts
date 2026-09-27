import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db.types";

const enabled = process.env.RUN_LIVE_RETRIEVAL === "1" && process.env.LIVE_RETRIEVAL_DISPOSABLE === "1"
  && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const live = enabled ? it : it.skip;

describe("live agent-filtered pgvector retrieval", () => {
  live(enabled ? "SQL excludes a more similar chunk owned by another agent before LIMIT"
    : "SKIP: requires RUN_LIVE_RETRIEVAL=1, LIVE_RETRIEVAL_DISPOSABLE=1, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  async () => {
    const db = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const rpc = db.rpc as unknown as (name: string, args: Record<string, unknown>) =>
      Promise<{ data: unknown; error: { message: string } | null }>;
    const suffix = crypto.randomUUID();
    const agents = [`live-a-${suffix}`, `live-b-${suffix}`];
    const sources = [`source-a-${suffix}`, `source-b-${suffix}`];
    const revisions = [`revision-a-${suffix}`, `revision-b-${suffix}`];
    const chunks = [`chunk-a-${suffix}`, `chunk-b-${suffix}`];
    const query = Array(1024).fill(0); query[0] = 1;
    const near = [...query]; near[1] = 0.0001;
    const vector = (values: number[]) => `[${values.join(",")}]`;
    async function requireOk(result: { error: { message: string } | null }) {
      if (result.error) throw new Error(result.error.message);
    }
    try {
      await requireOk(await db.from("agents").insert(agents.map((id, i) => ({
        id, owner_id: "maria", slug: `live-retrieval-${i}-${suffix}` }))));
      await requireOk(await db.from("sources").insert(sources.map((id, i) => ({
        id, agent_id: agents[i], kind: "text", name: `Live ${i}`, content_hash: "test", byte_count: 4 }))));
      await requireOk(await db.from("source_revisions").insert(revisions.map((id, i) => ({
        id, agent_id: agents[i], source_id: sources[i], revision_number: 1, content_hash: "test", byte_count: 4 }))));
      for (let i = 0; i < 2; i++) await requireOk(await db.from("sources").update({
        current_revision_id: revisions[i], active_revision_id: revisions[i], state: "ready", chunk_count: 1,
      }).eq("id", sources[i]));
      await requireOk(await db.from("chunks").insert(chunks.map((id, i) => ({
        id, agent_id: agents[i], source_id: sources[i], revision_id: revisions[i], ordinal: 0,
        content: i === 0 ? "Owned near-match" : "Foreign exact-match", embedding: vector(i === 0 ? near : query),
      }))));
      const result = await rpc.call(db, "search_agent_knowledge", { p_agent_id: agents[0], p_embedding: vector(query), p_k: 1 });
      if (result.error) throw new Error(result.error.message);
      if (!Array.isArray(result.data)) throw new Error("Expected rows");
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: chunks[0], agent_id: agents[0], content: "Owned near-match" });
      expect(result.data[0].score).toBeGreaterThan(0.99);
      const other = await rpc.call(db, "search_agent_knowledge", { p_agent_id: agents[1], p_embedding: vector(query), p_k: 1 });
      if (other.error) throw new Error(other.error.message);
      if (!Array.isArray(other.data)) throw new Error("Expected rows");
      expect(other.data.map((row: { id: string }) => row.id)).toEqual([chunks[1]]);
    } finally {
      await db.from("sources").update({ deleted_at: new Date().toISOString() }).in("id", sources);
      await db.from("agents").update({ deleted_at: new Date().toISOString() }).in("id", agents);
    }
  });
});
