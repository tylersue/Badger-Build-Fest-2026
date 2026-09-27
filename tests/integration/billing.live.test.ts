import { describe, expect, it } from "vitest";
import { anonDb, createOwnedFixture, id, liveEnabled, liveLabel, payloadHash, priceVersion,
  required, reserveArgs, rpc, serviceDb } from "./live-support";

const live = liveEnabled ? it : it.skip;
const cap = "1000000000000000";
const transition = (operationId: string, attemptId: string, state: string) => ({
  id: attemptId, operationId, stageKey: "fractional", attempt: 1, provider: "anthropic",
  model: "claude-haiku-4-5", state, heldUnits: "1000", providerRequestId: null,
  inputTokens: state === "completed" ? 1 : null, outputTokens: state === "completed" ? 1 : null,
  cacheReadTokens: state === "completed" ? 0 : null, cacheWriteTokens: state === "completed" ? 0 : null,
  embeddingTokens: state === "completed" ? 0 : null, successfulSearchCount: state === "completed" ? 0 : null,
  latencyMs: state === "completed" ? 1 : null,
  requestMetadata: { inputChars: 5, maxOutputTokens: 1 },
});

describe(`billing RPC (${liveLabel})`, () => {
  live("serializes a fresh UTC day cap across wallets and a same-wallet race", async () => {
    const db = serviceDb();
    const today = new Date().toISOString().slice(0, 10);
    const existing = await required(db.from("daily_budgets").select("day").eq("day", today).maybeSingle());
    if (existing.data) throw new Error("LIVE_FIXTURE_NOT_FRESH: reset the disposable local DB before billing acceptance");
    const a = await createOwnedFixture(db, "1500"), b = await createOwnedFixture(db, "1500");
    const dayCap = "1000";
    const args = [a, b].map(owner => ({ ...reserveArgs(owner.identity, owner.agent, "1000"), p_cap_units: dayCap }));
    const results = await Promise.all(args.map(value => rpc(db, "reserve_operation", value)));
    expect(results.filter(value => !value.error)).toHaveLength(1);
    expect(results.filter(value => value.error).map(value => value.error?.message)).toEqual([expect.stringContaining("DAILY_CAP")]);
    const won = results.find(value => !value.error)!.data as { id: string };
    await required(rpc(db, "settle_operation", { p_operation_id: won.id }));
    // This day row was created by this test on a verified fresh loopback database.
    await required(db.from("daily_budgets").update({ cap_units: "2000000000" as never }).eq("day", today));
    const sameWallet = await Promise.all([0, 1].map(() => rpc(db, "reserve_operation", reserveArgs(a.identity, a.agent))));
    expect(sameWallet.filter(value => !value.error)).toHaveLength(1);
    expect(sameWallet.filter(value => value.error).map(value => value.error?.message))
      .toEqual([expect.stringContaining("INSUFFICIENT_CREDITS")]);
    const held = sameWallet.find(value => !value.error)!.data as { id: string };
    await required(rpc(db, "settle_operation", { p_operation_id: held.id }));
  });

  live("settles fractional usage once, then preserves unknown dispatch holds", async () => {
    const db = serviceDb();
    const { identity, agent } = await createOwnedFixture(db, "100000000");
    const reserved = await required(rpc(db, "reserve_operation", reserveArgs(identity, agent)));
    const operationId = (reserved.data as { id: string }).id, attemptId = id("att");
    await required(rpc(db, "record_provider_attempt", { p_attempt: transition(operationId, attemptId, "prepared"), p_cap_units: cap }));
    await required(rpc(db, "record_provider_attempt", { p_attempt: { ...transition(operationId, attemptId, "dispatched"),
      providerRequestId: id("provider") }, p_cap_units: cap }));
    const completed = await required(rpc(db, "record_provider_attempt", {
      p_attempt: transition(operationId, attemptId, "completed"), p_cap_units: cap }));
    const cost = BigInt(String((completed.data as { effective_cost_units: string }).effective_cost_units));
    expect(cost).toBeGreaterThan(BigInt(0));
    expect(cost).toBeLessThan(BigInt(10_000_000));
    const first = await required(rpc(db, "settle_operation", { p_operation_id: operationId }));
    const replay = await required(rpc(db, "settle_operation", { p_operation_id: operationId }));
    expect(replay.data).toEqual(first.data);
    const ledger = await required(db.from("ledger").select("amount_units").eq("operation_id", operationId));
    expect(ledger.data).toHaveLength(1);
    expect(BigInt(String(ledger.data![0].amount_units))).toBe(-cost);
    const wallet = await required(db.from("wallets").select("balance_units,held_units").eq("identity_id", identity).single());
    expect(BigInt(String(wallet.data!.balance_units))).toBe(BigInt(100000000) - cost);
    expect(BigInt(String(wallet.data!.held_units))).toBe(BigInt(0));

    const orphan = await required(rpc(db, "reserve_operation", reserveArgs(identity, agent)));
    expect((await required(rpc(db, "settle_operation", { p_operation_id: (orphan.data as { id: string }).id }))).data)
      .toMatchObject({ state: "settled" });
    const uncertain = await required(rpc(db, "reserve_operation", reserveArgs(identity, agent)));
    const uncertainId = (uncertain.data as { id: string }).id, uncertainAttempt = id("att");
    await required(rpc(db, "record_provider_attempt", { p_attempt: transition(uncertainId, uncertainAttempt, "prepared"), p_cap_units: cap }));
    await required(rpc(db, "record_provider_attempt", { p_attempt: { ...transition(uncertainId, uncertainAttempt, "dispatched"),
      providerRequestId: id("provider") }, p_cap_units: cap }));
    await required(rpc(db, "record_provider_attempt", { p_attempt: transition(uncertainId, uncertainAttempt, "unknown"), p_cap_units: cap }));
    const unknown = await required(rpc(db, "settle_operation", { p_operation_id: uncertainId }));
    expect(unknown.data).toMatchObject({ state: "unknown" });
    expect(BigInt(String((unknown.data as { held_units: string }).held_units))).toBe(BigInt(1000));
    expect((await rpc(db, "reconcile_operation", { p_operation_id: uncertainId, p_evidence: [] })).error?.message)
      .toContain("INVALID_EVIDENCE");
    // Dispatched unknown use is retained for explicit operator reconciliation.
  });

  live("denies public RPC and table reads", async () => {
    const db = anonDb();
    const result = await rpc(db, "reserve_operation", { p_id: id("op"), p_identity_id: "maria",
      p_agent_id: "none", p_route: "sandbox", p_request_key: id("public"), p_payload_hash: payloadHash,
      p_purpose: "sandbox", p_estimate_units: "1", p_max_units: "1", p_price_version: priceVersion, p_cap_units: cap });
    expect(result.error).not.toBeNull();
    expect((await db.from("wallets").select("identity_id").limit(1)).error).not.toBeNull();
  });
});
