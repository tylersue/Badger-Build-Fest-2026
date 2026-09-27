import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/server/db.types";

export const liveEnabled = process.env.RUN_LIVE_TESTS === "1";
export const liveLabel = liveEnabled ? "LIVE disposable Supabase" : "SKIP: set RUN_LIVE_TESTS=1 for real Supabase acceptance";

// Evaluate the gate when Vitest loads a live file. An explicit opt-in cannot silently skip.
if (liveEnabled) {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "LIVE_TEST_DISPOSABLE"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`LIVE_CONFIG_MISSING: ${missing.join(", ")}`);
  if (process.env.LIVE_TEST_DISPOSABLE !== "1") throw new Error("LIVE_CONFIG_INVALID: LIVE_TEST_DISPOSABLE must be 1");
  const host = new URL(process.env.SUPABASE_URL!).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error("LIVE_CONFIG_INVALID: mutation tests require a disposable loopback Supabase project");
}

export type LiveDb = SupabaseClient<Database>;
export function serviceDb(): LiveDb {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } });
}
export function anonDb(): LiveDb {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } });
}
export function rpc(db: LiveDb, name: string, args: Record<string, unknown>) {
  const call = db.rpc as unknown as (name: string, args: Record<string, unknown>) =>
    Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  return call.call(db, name, args);
}
export async function required<T extends { error: { message: string } | null }>(result: PromiseLike<T> | T): Promise<T> {
  const value = await result;
  if (value.error) throw new Error(value.error.message);
  return value;
}
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const payloadHash = "a".repeat(64);
export const priceVersion = "2026-09-26-standard-v1";

export async function createOwnedFixture(db: LiveDb, walletUnits = "10000000000") {
  const identity = id("live_identity"), agent = id("live_agent");
  await required(db.from("identities").insert({ id: identity, kind: "expert", display_name: "Live acceptance",
    avatar_initial: "L", avatar_color: "#123456", origin: "live" }));
  await required(db.from("wallets").insert({ identity_id: identity, balance_units: walletUnits as never }));
  await required(db.from("agents").insert({ id: agent, owner_id: identity, slug: agent }));
  return { identity, agent };
}
export const reserveArgs = (identity: string, agent: string, max = "1000", key = id("request")) => ({
  p_id: id("op"), p_identity_id: identity, p_agent_id: agent, p_route: "sandbox",
  p_request_key: key, p_payload_hash: payloadHash, p_purpose: "sandbox",
  p_estimate_units: max, p_max_units: max, p_price_version: priceVersion,
  p_cap_units: "1000000000000000",
});
