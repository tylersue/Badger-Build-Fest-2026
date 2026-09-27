import { describe, expect, it } from "vitest";
import { createOwnedFixture, id, liveEnabled, liveLabel, required, rpc, serviceDb } from "./live-support";

const live = liveEnabled ? it : it.skip;
const vector = (second: number) => `[${[1, second, ...Array(1022).fill(0)].join(",")}]`;

describe(`active revision retrieval (${liveLabel})`, () => {
  live("filters by agent and active revision before top-k, then hides tombstoned sources", async () => {
    const db = serviceDb();
    const owner = await createOwnedFixture(db), other = await createOwnedFixture(db);
    const sourceA = id("src"), sourceB = id("src");
    const old = id("srev"), newest = id("srev"), foreign = id("srev");
    await required(db.from("sources").insert([
      { id: sourceA, agent_id: owner.agent, kind: "text", name: "Owned", content_hash: "test", byte_count: 4 },
      { id: sourceB, agent_id: other.agent, kind: "text", name: "Foreign", content_hash: "test", byte_count: 4 },
    ]));
    await required(db.from("source_revisions").insert([
      { id: old, agent_id: owner.agent, source_id: sourceA, revision_number: 1, content_hash: "old", byte_count: 4 },
      { id: newest, agent_id: owner.agent, source_id: sourceA, revision_number: 2, content_hash: "new", byte_count: 4 },
      { id: foreign, agent_id: other.agent, source_id: sourceB, revision_number: 1, content_hash: "foreign", byte_count: 4 },
    ]));
    await required(db.from("sources").update({ current_revision_id: newest, active_revision_id: old, state: "ready", chunk_count: 1 })
      .eq("id", sourceA));
    await required(db.from("sources").update({ current_revision_id: foreign, active_revision_id: foreign, state: "ready", chunk_count: 1 })
      .eq("id", sourceB));
    const oldChunk = id("chunk"), newChunk = id("chunk"), foreignChunk = id("chunk");
    await required(db.from("chunks").insert([
      { id: oldChunk, agent_id: owner.agent, source_id: sourceA, revision_id: old, ordinal: 0,
        content: "Old active text", embedding: vector(0.001) },
      { id: newChunk, agent_id: owner.agent, source_id: sourceA, revision_id: newest, ordinal: 0,
        content: "New still pending", embedding: vector(0) },
      { id: foreignChunk, agent_id: other.agent, source_id: sourceB, revision_id: foreign, ordinal: 0,
        content: "Foreign exact match", embedding: vector(0) },
    ]));
    const search = async (agent: string) => {
      const result = await required(rpc(db, "search_agent_knowledge", { p_agent_id: agent, p_embedding: vector(0), p_k: 1 }));
      return result.data as { id: string; agent_id: string }[];
    };
    expect((await search(owner.agent)).map(row => row.id)).toEqual([oldChunk]);
    expect((await search(other.agent)).map(row => row.id)).toEqual([foreignChunk]);
    await required(db.from("sources").update({ active_revision_id: newest }).eq("id", sourceA));
    expect((await search(owner.agent)).map(row => row.id)).toEqual([newChunk]);
    await required(db.from("sources").update({ deleted_at: new Date().toISOString() }).eq("id", sourceA));
    expect(await search(owner.agent)).toEqual([]);
  });
});
