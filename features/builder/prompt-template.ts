/** Deterministic, editable persona text. Runtime policy and citations live elsewhere. */
import type { PersonaForm } from "@/lib/types";

export const EMPTY_PERSONA: PersonaForm = {
  name: "",
  category: "career_admissions",
  headline: "",
  description: "",
  howIWork: "",
  always: [],
  never: [],
  exampleQuestions: [],
  greeting: "",
};

export function personaToSystemPrompt(persona: PersonaForm): string {
  const lines: string[] = [];
  if (persona.name) lines.push(`Name: ${persona.name}`);
  if (persona.headline) lines.push(`Headline: ${persona.headline}`);
  if (persona.description) lines.push(`About: ${persona.description}`);
  if (persona.howIWork) lines.push(`How I work: ${persona.howIWork}`);
  for (const [label, values] of [
    ["Always do", persona.always], ["Never do", persona.never],
    ["Example questions", persona.exampleQuestions],
  ] as const) {
    if (values.length) lines.push(`${label}:`, ...values.map((value) => `- ${value}`));
  }
  if (persona.greeting) lines.push(`Greeting: ${persona.greeting}`);
  return lines.join("\n\n");
}
