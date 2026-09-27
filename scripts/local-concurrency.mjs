import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const target = new URL(process.env.SUPABASE_URL ?? "");
assert.equal(target.protocol, "http:");
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname));
assert.equal(process.env.LLM_DAILY_SPEND_CAP_USD, "2");
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY);

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const id = (prefix) => `${prefix}_${randomUUID()}`;
async function required(query) {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const day = new Date().toISOString().slice(0, 10);
const before = await required(db.from("daily_budgets")
  .select("cap_units,spent_units,held_units").eq("day", day).single());
assert.equal(String(before.cap_units), "2000000000");

const identity = id("concurrency_identity");
const agent = id("concurrency_agent");
await required(db.from("identities").insert({ id: identity, kind: "expert",
  display_name: "Concurrency fixture", avatar_initial: "C", avatar_color: "#123456", origin: "live" }));
await required(db.from("wallets").insert({ identity_id: identity, balance_units: "1500" }));
await required(db.from("agents").insert({ id: agent, owner_id: identity, slug: agent }));

const args = [0, 1].map(() => ({ p_id: id("op"), p_identity_id: identity,
  p_agent_id: agent, p_route: "sandbox", p_request_key: id("request"),
  p_payload_hash: "a".repeat(64), p_purpose: "sandbox", p_estimate_units: "1000",
  p_max_units: "1000", p_price_version: "2026-09-26-standard-v1",
  p_cap_units: "2000000000" }));
const results = await Promise.all(args.map((input) => db.rpc("reserve_operation", input)));
const winners = results.filter((result) => !result.error);
try {
  assert.equal(winners.length, 1, "Exactly one concurrent reservation must succeed");
  assert.equal(results.filter((result) => result.error?.message.includes("INSUFFICIENT_CREDITS")).length,
    1, "The losing reservation must fail for insufficient wallet funds");
} finally {
  // Only this fixture's never-dispatched reservations are settled. Existing holds are untouched.
  for (const winner of winners) await required(db.rpc("settle_operation", {
    p_operation_id: winner.data.id,
  }));
}

const after = await required(db.from("daily_budgets")
  .select("cap_units,spent_units,held_units").eq("day", day).single());
const wallet = await required(db.from("wallets")
  .select("balance_units,held_units").eq("identity_id", identity).single());
assert.equal(String(after.cap_units), String(before.cap_units));
assert.equal(String(after.spent_units), String(before.spent_units));
assert.equal(String(after.held_units), String(before.held_units));
assert.equal(String(wallet.balance_units), "1500");
assert.equal(String(wallet.held_units), "0");
console.log(JSON.stringify({ result: "PASS", race: "same-wallet", attempts: 2,
  reservations: winners.length, rejectedInsufficientCredits: 1,
  dayCapUnits: after.cap_units, spentUnits: after.spent_units,
  heldUnitsBefore: before.held_units, heldUnitsAfter: after.held_units }));
