/**
 * Builder lane contract: persona form -> system prompt (PERS-02).
 * Deterministic (no dates, no randomness) so prompt caching can hit.
 */
import { disclaimerFor } from "@/lib/config/categories";
import type { PersonaForm } from "@/lib/types";

export const EMPTY_PERSONA: PersonaForm = {
  name: "",
  category: "health_pt",
  headline: "",
  description: "",
  howIWork: "",
  always: [],
  never: [],
  exampleQuestions: [],
  greeting: "",
};

export function personaToSystemPrompt(persona: PersonaForm): string {
  const lines = [
    `You are ${persona.name || "an expert's agent"}${persona.headline ? `: ${persona.headline}` : ""}.`,
    persona.description,
    "",
    `How I work: ${persona.howIWork || "Not set yet."}`,
    "",
    "Always:",
    ...(persona.always.length ? persona.always.map((a) => `- ${a}`) : ["- Cite the source of every claim"]),
    "",
    "Never:",
    ...(persona.never.length ? persona.never.map((n) => `- ${n}`) : ["- Answer beyond the provided knowledge"]),
    "",
    "Grounding: answer only from the numbered context. Cite it inline as [n]. If the context does not cover the question, say \"I don't have that in my knowledge\" and point to the expert's contact link.",
  ];
  const disclaimer = disclaimerFor(persona.category);
  if (disclaimer) lines.push("", `Disclaimer rule: open your first reply with "${disclaimer}" and keep this rule on every turn.`);
  return lines.join("\n").trim();
}
