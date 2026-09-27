import { describe, expect, it, vi } from "vitest";
// Next enforces this marker at bundle time; tests explicitly replace only the marker.
vi.mock("server-only", () => ({}));
import { getDatabaseEnv, getPolicyEnv, getServerEnv, getVoyageEnv, sourceLimitsFromEnv } from "./env";

describe("lazy server configuration", () => {
  it("imports with no keys and returns typed service failures", () => {
    expect(getServerEnv({})).toMatchObject({ ok: false, error: { code: "configuration", retryable: false } });
    expect(getVoyageEnv({})).toMatchObject({ ok: false, error: { message: "Configure server environment: VOYAGE_API_KEY." } });
  });
  it("exposes invalid names without echoing sensitive values", () => {
    const result = getDatabaseEnv({ SUPABASE_URL: "secret-private-url", SUPABASE_SERVICE_ROLE_KEY: "secret-key" });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain("SUPABASE_URL");
    expect(JSON.stringify(result)).not.toContain("secret-private-url");
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });
  it("accepts server configuration without consuming public key aliases", () => {
    const values = { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-only-key", ANTHROPIC_API_KEY: "test-only", VOYAGE_API_KEY: "test-only" };
    expect(getServerEnv(values).ok).toBe(true);
    expect(getDatabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: values.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: values.SUPABASE_SERVICE_ROLE_KEY }).ok).toBe(false);
  });
  it("validates finite budgets and exact decimal caps", () => {
    for (const env of [{ SOURCE_MAX_COUNT: "Infinity" }, { LLM_TIMEOUT_MS: "-1" }, { LLM_DAILY_SPEND_CAP_USD: "1e3" }, { WEB_MAX_FETCHES: "3" }, { SOURCE_CHUNK_TARGET_CHARS: "100", SOURCE_CHUNK_OVERLAP_CHARS: "200" }]) expect(getPolicyEnv(env).ok).toBe(false);
    const result = getPolicyEnv({ LLM_DAILY_SPEND_CAP_USD: "0.000000001" });
    expect(result.ok && result.data.LLM_DAILY_SPEND_CAP_USD).toBe("0.000000001");
    if (result.ok) expect(sourceLimitsFromEnv(result.data)).toMatchObject({ maxSources: 10, maxActiveChunks: 1000, parserTimeoutMs: 15_000 });
  });
  it("rejects URLs in domain policy and conflicting allow/block policies", () => {
    expect(getPolicyEnv({ WEB_ALLOWED_DOMAINS: "https://secret.example/path" }).ok).toBe(false);
    expect(getPolicyEnv({ WEB_ALLOWED_DOMAINS: "example.com", WEB_BLOCKED_DOMAINS: "other.com" }).ok).toBe(false);
    expect(getPolicyEnv({ WEB_ALLOWED_DOMAINS: "example.com,docs.example.com" }).ok).toBe(true);
  });
});
