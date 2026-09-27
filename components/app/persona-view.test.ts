import { describe, expect, it } from "vitest";
import { EMPTY_PERSONA } from "@/features/builder/prompt-template";
import type { PersonaFieldName, PersonaState } from "@/lib/contracts/phase2";
import { mergePersonaDraft, type PersonaDraft } from "./persona-view";

const fields: PersonaFieldName[] = ["name", "category", "headline", "description", "howIWork", "always", "never", "exampleQuestions", "greeting"];
function state(headline: string, description: string, customPrompt: string | null = null): PersonaState {
  const form = { ...EMPTY_PERSONA, headline, description };
  return { fields: Object.fromEntries(fields.map(field => [field, {
    value: form[field], origin: field === "category" ? "blank" : "interview", version: 2,
    evidenceRevisionIds: [], pendingSuggestion: null,
  }])) as unknown as PersonaState["fields"], version: 2, promptMode: customPrompt ? "custom" : "generated",
    customPrompt, promptVersion: 3 };
}

describe("persona draft merge", () => {
  it("updates untouched interview fields while preserving dirty expert typing", () => {
    const initial = mergePersonaDraft(null, state("First draft", "Initial description"));
    const typed: PersonaDraft = { ...initial, values: { ...initial.values, headline: "My unfinished headline" }, dirty: { headline: true } };
    const incoming = state("New interview headline", "New supported description");
    incoming.fields.headline.pendingSuggestion = { value: "New interview headline", evidenceRevisionIds: ["revision-1"], observedVersion: 2 };
    const merged = mergePersonaDraft(typed, incoming);
    expect(merged.values.headline).toBe("My unfinished headline");
    expect(merged.values.description).toBe("New supported description");
    expect(merged.dirty.headline).toBe(true);
    expect(incoming.fields.headline.pendingSuggestion?.value).toBe("New interview headline");
  });

  it("keeps a custom prompt draft through form updates and refreshes its observed version", () => {
    const initial = mergePersonaDraft(null, state("Before", "", "Saved custom"));
    const typed: PersonaDraft = { ...initial, customPrompt: "My unsaved custom wording", customDirty: true,
      values: { ...initial.values, headline: "Edited form" }, dirty: { headline: true } };
    const incoming = state("Interview suggestion", "New body", "Saved custom");
    incoming.promptVersion = 4;
    const merged = mergePersonaDraft(typed, incoming);
    expect(merged.customPrompt).toBe("My unsaved custom wording");
    expect(merged.values.headline).toBe("Edited form");
    expect(merged.values.description).toBe("New body");
    expect(merged.promptVersion).toBe(4);
  });

  it("uses acknowledged server values after fields become clean", () => {
    const previous = mergePersonaDraft(null, state("Before", ""));
    const typed: PersonaDraft = { ...previous, values: { ...previous.values, headline: "Typed" }, dirty: {} };
    expect(mergePersonaDraft(typed, state("Typed", "Fresh")).values).toMatchObject({ headline: "Typed", description: "Fresh" });
  });
});
