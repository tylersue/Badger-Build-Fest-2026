import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPersonaService, type PersonaSnapshot, type PersonaStore } from "./persona";
import { createPersonaHandlers } from "@/app/api/agents/[agentId]/persona/handlers";

const url = "https://local.example/api/agents/agent-a/persona";
const ctx = { params: Promise.resolve({ agentId: "agent-a" }) };
function fixture() {
  const snapshot: PersonaSnapshot = { agent: { category: "career_admissions", version: 1,
    promptMode: "generated", customPrompt: null, promptVersion: 1 }, fields: {} };
  const store: PersonaStore = {
    async load() { return structuredClone(snapshot); },
    async casField(_id, field, expected, next) {
      if ((snapshot.fields[field]?.version ?? 0) !== expected) return false;
      snapshot.fields[field] = { ...structuredClone(next), version: expected + 1 };
      if (field === "category") { snapshot.agent.category = next.value as PersonaSnapshot["agent"]["category"]; snapshot.agent.version++; }
      return true;
    },
    async casPrompt(_id, expected, mode, text) {
      if (snapshot.agent.promptVersion !== expected) return false;
      snapshot.agent.promptVersion++; snapshot.agent.promptMode = mode; snapshot.agent.customPrompt = text;
      return true;
    },
    async activeRevisionIds() { return new Set<string>(); },
  };
  const owner = { findAgentOwner: vi.fn(async () => "maria") };
  return { ...createPersonaHandlers(createPersonaService(store), owner), snapshot, owner };
}
function patch(body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, { method: "PATCH", headers: { origin: "https://local.example",
    "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

describe("persona route", () => {
  it("returns every form field, generated preview, and server-selected model", async () => {
    const { GET } = fixture();
    const response = await GET(new Request(url), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: { form: { name: "", category: "career_admissions" },
      state: { promptMode: "generated", fields: { description: { origin: "blank", version: 0 } } },
      model: "claude-sonnet-5", reviewFieldIds: [] } });
  });

  it("rejects wrong owner, forged model, unknown safety, and cross-origin requests", async () => {
    const { GET, PATCH, owner } = fixture();
    expect((await GET(new Request(url, { headers: { cookie: "bx-demo-identity=sam" } }), ctx)).status).toBe(404);
    expect((await PATCH(patch({ action: "save-fields", patch: { headline: "x" }, expectedVersions: { headline: 0 }, model: "claude-opus-5-5" }), ctx)).status).toBe(400);
    expect((await PATCH(patch({ action: "save-fields", patch: { safety: "off" }, expectedVersions: { safety: 0 } }), ctx)).status).toBe(400);
    expect((await PATCH(patch({ action: "save-fields", patch: { headline: "x" }, expectedVersions: { headline: 0 } }, { origin: "https://evil.example" }), ctx)).status).toBe(403);
    expect(owner.findAgentOwner).toHaveBeenCalledTimes(1);
  });

  it("keeps the custom prompt active after a normal form edit and regenerates only on confirmation", async () => {
    const { PATCH } = fixture();
    expect((await PATCH(patch({ action: "custom-prompt", text: "Use my words", expectedVersion: 1 }), ctx)).status).toBe(200);
    const form = await PATCH(patch({ action: "save-fields", patch: { howIWork: "I ask about goals" }, expectedVersions: { howIWork: 0 } }), ctx);
    expect(await form.json()).toMatchObject({ ok: true, data: { state: { promptMode: "custom" },
      activePrompt: "Use my words", generatedPrompt: "How I work: I ask about goals" } });
    expect((await PATCH(patch({ action: "regenerate-prompt", expectedVersion: 2, confirmed: false }), ctx)).status).toBe(400);
    const regenerated = await PATCH(patch({ action: "regenerate-prompt", expectedVersion: 2, confirmed: true }), ctx);
    expect(await regenerated.json()).toMatchObject({ ok: true, data: { state: { promptMode: "generated", customPrompt: null },
      activePrompt: "How I work: I ask about goals" } });
  });

  it("returns field conflicts with current server state and unsaved submitted values", async () => {
    const { PATCH } = fixture();
    await PATCH(patch({ action: "save-fields", patch: { headline: "Saved" }, expectedVersions: { headline: 0 } }), ctx);
    const response = await PATCH(patch({ action: "save-fields", patch: { headline: "Unsaved client text" }, expectedVersions: { headline: 0 } }), ctx);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "conflict", conflictFieldIds: ["headline"] },
      data: { current: { form: { headline: "Saved" } }, submittedPatch: { headline: "Unsaved client text" } } });
  });

  it("bounds field lengths and list counts", async () => {
    const { PATCH } = fixture();
    expect((await PATCH(patch({ action: "save-fields", patch: { name: "x".repeat(201) }, expectedVersions: { name: 0 } }), ctx)).status).toBe(400);
    expect((await PATCH(patch({ action: "save-fields", patch: { always: Array(31).fill("x") }, expectedVersions: { always: 0 } }), ctx)).status).toBe(400);
  });
});
