import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("server-only", () => ({}));
import { apiError, demoIdentityResponse, parseRequest, requireAgentOwner, resolveDemoIdentity } from "./request";
import { DatabaseFailure } from "./db";

const url = "https://local.example/api/agents/agent-a/interview";
function post(body: string, extra: Record<string, string> = {}): Request {
  return new Request(url, { method: "POST", headers: { origin: "https://local.example", "content-type": "application/json", ...extra }, body });
}
const schema = z.object({ text: z.string().min(1).max(100) });

describe("demo request boundary", () => {
  it("accepts only the seeded switchable identities and stores a restricted cookie", () => {
    expect(resolveDemoIdentity(new Request(url))).toBe("maria");
    expect(resolveDemoIdentity(new Request(url, { headers: { cookie: "bx-demo-identity=sam" } }))).toBe("sam");
    for (const id of ["dev", "attacker", "%zz"]) {
      expect(() => resolveDemoIdentity(new Request(url, { headers: { cookie: `bx-demo-identity=${id}` } }))).toThrow();
      expect(() => demoIdentityResponse(post("{}"), id)).toThrow();
    }
    const cookie = demoIdentityResponse(post("{}"), "sam").headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("checks agent ownership on the server even when a client forges an agent ID", async () => {
    const lookup = { findAgentOwner: vi.fn(async (agentId: string) => agentId === "agent-a" ? "maria" : "sam") };
    await expect(requireAgentOwner("maria", "agent-a", lookup)).resolves.toBeUndefined();
    await expect(requireAgentOwner("maria", "agent-b", lookup)).rejects.toMatchObject({ code: "not_owner", status: 404 });
    await expect(requireAgentOwner("dev", "agent-a", lookup)).rejects.toMatchObject({ code: "not_owner" });
    expect(lookup.findAgentOwner).toHaveBeenCalledTimes(2);
    const failedLookup = { findAgentOwner: async () => { throw new DatabaseFailure(); } };
    await expect(requireAgentOwner("maria", "agent-a", failedLookup)).rejects.toBeInstanceOf(DatabaseFailure);
  });

  it("rejects cross-origin mutation, absent origin evidence, and unsupported content type", async () => {
    await expect(parseRequest(schema, post('{"text":"x"}', { origin: "https://evil.example" }))).rejects.toMatchObject({ status: 403 });
    await expect(parseRequest(schema, new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: '{"text":"x"}' }))).rejects.toMatchObject({ status: 403 });
    await expect(parseRequest(schema, post("text=x", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
  });

  it("bounds body bytes before parsing and rejects unknown and duplicate fields", async () => {
    await expect(parseRequest(schema, post(JSON.stringify({ text: "x" }), { "content-length": "999999" }))).rejects.toMatchObject({ status: 413 });
    await expect(parseRequest(schema, post(JSON.stringify({ text: "x".repeat(100) })), { maxJsonBytes: 8 })).rejects.toMatchObject({ status: 413 });
    await expect(parseRequest(schema, post('{"text":"x","ownerId":"maria"}'))).rejects.toMatchObject({ status: 400 });
    const form = new Request(url, { method: "POST", headers: { origin: "https://local.example", "content-type": "application/x-www-form-urlencoded" }, body: "text=x&text=y" });
    await expect(parseRequest(schema, form)).rejects.toMatchObject({ status: 400 });
    await expect(parseRequest(schema, post('{"text":"valid"}'))).resolves.toEqual({ text: "valid" });
  });

  it("returns typed, redacted database and unexpected failures", async () => {
    const db = apiError(new DatabaseFailure("Database request failed."));
    expect(db.status).toBe(503);
    expect(await db.json()).toMatchObject({ ok: false, error: { code: "indexing", retryable: true } });
    const unknown = apiError(new Error("secret provider key"));
    expect(JSON.stringify(await unknown.json())).not.toContain("secret provider key");
  });
});
