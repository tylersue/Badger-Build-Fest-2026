import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPersonaService, personaView, type PersonaSnapshot, type PersonaStore } from "./persona";
import { personaToSystemPrompt } from "./prompt-template";
import type { PersonaFieldName } from "@/lib/contracts/phase2";

function fixture() {
  const snapshot: PersonaSnapshot = { agent: { category: "career_admissions", version: 1,
    promptMode: "generated", customPrompt: null, promptVersion: 1 }, fields: {} };
  const active = new Set(["rev-1", "rev-2"]);
  const store: PersonaStore = {
    async load() { return structuredClone(snapshot); },
    async casField(_agent, field, expected, next) {
      const current = snapshot.fields[field];
      if ((current?.version ?? 0) !== expected) return false;
      snapshot.fields[field] = { ...structuredClone(next), version: expected + 1 };
      if (field === "category") { snapshot.agent.category = next.value as PersonaSnapshot["agent"]["category"]; snapshot.agent.version++; }
      return true;
    },
    async casPrompt(_agent, expected, mode, text) {
      if (snapshot.agent.promptVersion !== expected) return false;
      snapshot.agent.promptMode = mode;
      snapshot.agent.customPrompt = text;
      snapshot.agent.promptVersion++;
      return true;
    },
    async activeRevisionIds(_agent, ids) { return new Set(ids.filter((id) => active.has(id))); },
  };
  return { service: createPersonaService(store), snapshot, active, store };
}
const patch = (value: string, id = "rev-1") => ({ field: "description" as const, value, evidenceRevisionIds: [id] });
const version = (snapshot: PersonaSnapshot, field: PersonaFieldName) => snapshot.fields[field]?.version ?? 0;

describe("persona ownership", () => {
  it("leaves unsupported fields blank and applies supported successive interview drafts", async () => {
    const { service, snapshot } = fixture();
    expect((await service.read("a"))?.fields.headline.value).toBe("");
    expect((await service.applyPersonaSuggestions("a", [patch("I explain the process")], { description: 0 })).ok).toBe(true);
    expect(snapshot.fields.description).toMatchObject({ value: "I explain the process", origin: "interview", evidenceRevisionIds: ["rev-1"] });
    expect((await service.applyPersonaSuggestions("a", [patch("I explain the process with examples", "rev-2")], { description: 1 })).ok).toBe(true);
    expect(snapshot.fields.description?.value).toBe("I explain the process with examples");
    expect(snapshot.fields.name).toBeUndefined();
  });

  it("rejects foreign or inactive evidence and never invents unsupported copy", async () => {
    const { service, snapshot } = fixture();
    expect((await service.applyPersonaSuggestions("a", [patch("Certified specialist", "other-agent-rev")], { description: 0 })).ok).toBe(false);
    expect((await service.applyPersonaSuggestions("a", [patch("")], { description: 0 })).ok).toBe(false);
    expect(snapshot.fields.description).toBeUndefined();
  });

  it("keeps expert edits when stale suggestions arrive, then accepts or dismisses them explicitly", async () => {
    const { service, snapshot } = fixture();
    expect((await service.savePersonaFields("a", { description: "My exact wording" }, { description: 0 })).ok).toBe(true);
    const stale = await service.applyPersonaSuggestions("a", [patch("Proposed wording")], { description: 0 });
    expect(stale.ok).toBe(true);
    expect(snapshot.fields.description).toMatchObject({ value: "My exact wording", origin: "expert",
      pendingSuggestion: { value: "Proposed wording" } });
    const kept = await service.keepSuggestion("a", "description", version(snapshot, "description"));
    expect(kept.ok).toBe(true);
    expect(snapshot.fields.description).toMatchObject({ value: "My exact wording", pendingSuggestion: null });
    await service.applyPersonaSuggestions("a", [patch("New wording", "rev-2")], { description: version(snapshot, "description") });
    const accepted = await service.acceptSuggestion("a", "description", version(snapshot, "description"));
    expect(accepted.ok).toBe(true);
    expect(snapshot.fields.description).toMatchObject({ value: "New wording", origin: "interview", evidenceRevisionIds: ["rev-2"] });
  });

  it("returns current state and submitted values on unsaved-client version conflict", async () => {
    const { service } = fixture();
    await service.savePersonaFields("a", { headline: "Saved" }, { headline: 0 });
    const result = await service.savePersonaFields("a", { headline: "Unsaved typing" }, { headline: 0 });
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", conflictFieldIds: ["headline"],
      submittedPatch: { headline: "Unsaved typing" }, current: { fields: { headline: { value: "Saved" } } } } });
  });

  it("keeps category metadata aligned with the versioned category field", async () => {
    const { service, snapshot } = fixture();
    const saved = await service.savePersonaFields("a", { category: "tax_finance" }, { category: 0 });
    expect(saved.ok).toBe(true);
    expect(snapshot.agent.category).toBe("tax_finance");
    expect(snapshot.fields.category).toMatchObject({ value: "tax_finance", origin: "expert", version: 1 });
    expect(personaView((await service.read("a"))!).model).toBe("gpt-4.1-mini");
  });

  it("clears interview copy after source deletion and flags unsupported expert copy for review", async () => {
    const { service, active, snapshot } = fixture();
    await service.applyPersonaSuggestions("a", [patch("Supported draft")], { description: 0 });
    await service.applyPersonaSuggestions("a", [{ field: "headline", value: "Interview headline", evidenceRevisionIds: ["rev-1"] }], { headline: 0 });
    await service.savePersonaFields("a", { description: "My adapted copy" }, { description: 1 });
    active.delete("rev-1");
    expect((await service.reconcilePersonaEvidence("a")).ok).toBe(true);
    expect(snapshot.fields.headline).toMatchObject({ value: "", origin: "blank" });
    expect(snapshot.fields.description).toMatchObject({ value: "My adapted copy", origin: "expert" });
    expect(await service.reviewFieldIds("a", (await service.read("a"))!)).toEqual(["description"]);
  });

  it("preserves custom prompt through form updates and needs confirmation plus current version to regenerate", async () => {
    const { service } = fixture();
    expect((await service.setCustomPrompt("a", "My custom instructions", 1)).ok).toBe(true);
    await service.savePersonaFields("a", { howIWork: "I ask about goals" }, { howIWork: 0 });
    const state = (await service.read("a"))!;
    expect(personaView(state)).toMatchObject({ activePrompt: "My custom instructions", generatedPrompt: "How I work: I ask about goals" });
    expect((await service.regeneratePrompt("a", 2, false)).ok).toBe(false);
    expect((await service.regeneratePrompt("a", 1, true)).ok).toBe(false);
    expect((await service.regeneratePrompt("a", 2, true)).ok).toBe(true);
    expect((await service.read("a"))?.promptMode).toBe("generated");
  });

  it("generates only form text; immutable safety and invented credential fallbacks stay outside", () => {
    const { service } = fixture();
    return service.read("a").then((state) => {
      const prompt = personaToSystemPrompt(personaView(state!).form);
      expect(prompt).toBe("");
      expect(prompt).not.toMatch(/citation|disclaimer|credential|contact link|knowledge/i);
    });
  });
});
