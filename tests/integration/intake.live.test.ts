import { describe, expect, it } from "vitest";
import { createOwnedFixture, id, liveEnabled, liveLabel, payloadHash, priceVersion,
  required, rpc, serviceDb } from "./live-support";

const live = liveEnabled ? it : it.skip;

describe(`source quota RPC (${liveLabel})`, () => {
  live("serializes two confirmations and rejects changed or stale estimates without duplicate sources", async () => {
    const db = serviceDb();
    const { identity, agent } = await createOwnedFixture(db);
    const cases = await Promise.all([0, 1].map(async number => {
      const requestKey = id("intake"), token = id("token"), sourceId = id("src"), revisionId = id("srev");
      const operationId = id("op"), jobId = id("job");
      const name = `live-${number}.txt`, contentHash = payloadHash;
      await required(db.from("intake_estimates").insert({ id: id("estimate"), agent_id: agent,
        token_hash: token, name, kind: "txt", content_hash: contentHash, byte_count: 4,
        estimate_units: "1000" as never, max_units: "1000" as never, price_version: priceVersion,
        estimate_version: 1, expires_at: new Date(Date.now() + 60_000).toISOString() }));
      await required(rpc(db, "reserve_operation", { p_id: operationId, p_identity_id: identity, p_agent_id: agent,
        p_route: "source", p_request_key: requestKey, p_payload_hash: contentHash, p_purpose: "source",
        p_estimate_units: "1000", p_max_units: "1000", p_price_version: priceVersion,
        p_cap_units: "1000000000000000" }));
      const args = { p_agent_id: agent, p_identity_id: identity, p_token_hash: token,
        p_request_key: requestKey, p_source_id: sourceId, p_revision_id: revisionId,
        p_job_id: jobId, p_storage_path: `${agent}/${sourceId}/${crypto.randomUUID()}`,
        p_operation_id: operationId, p_name: name, p_kind: "txt", p_content_hash: contentHash,
        p_byte_count: 4, p_price_version: priceVersion, p_max_sources: 1,
        p_max_agent_bytes: 8, p_retry_source_id: null };
      return args;
    }));
    const results = await Promise.all(cases.map(args => rpc(db, "reserve_source_quota", args)));
    expect(results.filter(result => !result.error)).toHaveLength(1);
    expect(results.filter(result => result.error).map(result => result.error?.message)).toEqual([expect.stringContaining("QUOTA")]);
    const winner = cases[results.findIndex(result => !result.error)];
    const repeated = await required(rpc(db, "reserve_source_quota", winner));
    expect(repeated.data).toMatchObject({ replayed: true });
    const changed = await rpc(db, "reserve_source_quota", { ...winner, p_content_hash: "b".repeat(64) });
    expect(changed.error?.message).toContain("CONFLICT");
    const stale = await rpc(db, "reserve_source_quota", { ...cases[1], p_request_key: id("new_key") });
    expect(stale.error).not.toBeNull();
    const sources = await required(db.from("sources").select("id").eq("agent_id", agent));
    expect(sources.data).toHaveLength(1);
    // No provider call occurs here. Source and estimate rows belong only to this local test agent.
  });
});
