/**
 * Marketplace lane contract: the publish gate (PUB-03).
 * Pure: persona + knowledge count in, checklist out. The demo store and the
 * Publish page both read it so the button and the copy never disagree.
 */
import { MIN_PUBLISH_CHUNKS } from "@/lib/config/publish";
import type { PersonaForm } from "@/lib/types";

export type ChecklistItem = {
  id: "name" | "category" | "headline" | "description" | "example" | "knowledge";
  label: string;
  detail: string;
  ok: boolean;
  /** Which builder tab fixes it. */
  fix: "persona" | "interview";
};

export function publishChecklist(persona: PersonaForm, chunkCount: number): ChecklistItem[] {
  const has = (s: string) => s.trim().length > 0;
  return [
    { id: "name", label: "Agent name", detail: persona.name || "Not set", ok: has(persona.name), fix: "persona" },
    { id: "category", label: "Category", detail: persona.category, ok: has(persona.category), fix: "persona" },
    { id: "headline", label: "Headline", detail: persona.headline || "Not set", ok: has(persona.headline), fix: "persona" },
    { id: "description", label: "Description", detail: persona.description || "Not set", ok: has(persona.description), fix: "persona" },
    {
      id: "example",
      label: "At least one example question",
      detail: `${persona.exampleQuestions.filter(has).length} written`,
      ok: persona.exampleQuestions.some(has),
      fix: "persona",
    },
    {
      id: "knowledge",
      label: `At least ${MIN_PUBLISH_CHUNKS} knowledge chunks`,
      detail: `${chunkCount} of ${MIN_PUBLISH_CHUNKS}`,
      ok: chunkCount >= MIN_PUBLISH_CHUNKS,
      fix: "interview",
    },
  ];
}

export function canPublish(persona: PersonaForm, chunkCount: number): boolean {
  return publishChecklist(persona, chunkCount).every((item) => item.ok);
}

export function publishBlockers(persona: PersonaForm, chunkCount: number): string[] {
  return publishChecklist(persona, chunkCount)
    .filter((item) => !item.ok)
    .map((item) => item.label);
}
