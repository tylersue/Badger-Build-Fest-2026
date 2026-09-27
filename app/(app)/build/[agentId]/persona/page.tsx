"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NotOwnerNote, useBuilderAgent } from "@/components/app/builder";
import { Field, LinesInput, TextArea, TextInput } from "@/components/app/form";
import { PageBody, PageHeader, PlaceholderNote, buttonClass } from "@/components/app/ui";
import { displayName, savePersona, updateAgent } from "@/lib/demo-store";
import { CATEGORIES, disclaimerFor, type Category } from "@/lib/config/categories";
import { modelForCategory } from "@/lib/config/models";
import { personaToSystemPrompt } from "@/features/builder/prompt-template";
import type { Agent, PersonaForm } from "@/lib/types";

export default function PersonaPage() {
  const { s, agent, isOwner } = useBuilderAgent();
  if (!agent) return null;
  return <PersonaEditor key={agent.id + agent.updatedAt} agent={agent} isOwner={isOwner} ownerName={displayName(s, agent.ownerId)} />;
}

/* Short persona form (PERS-01) with the generated prompt behind an Advanced toggle (PERS-02). */
function PersonaEditor({ agent, isOwner, ownerName }: { agent: Agent; isOwner: boolean; ownerName: string }) {
  const [p, setP] = useState<PersonaForm>(agent.persona);
  const [advanced, setAdvanced] = useState(!!agent.systemPromptOverride);
  const [prompt, setPrompt] = useState(agent.systemPromptOverride ?? personaToSystemPrompt(agent.persona));
  const set = <K extends keyof PersonaForm>(k: K) => (v: PersonaForm[K]) => setP({ ...p, [k]: v });
  const disabled = !isOwner;

  const save = () => {
    const clean = { ...p, always: p.always.filter(Boolean), never: p.never.filter(Boolean), exampleQuestions: p.exampleQuestions.filter(Boolean) };
    savePersona(agent.id, clean);
    const generated = personaToSystemPrompt(clean);
    updateAgent(agent.id, { systemPromptOverride: advanced && prompt !== generated ? prompt : null });
    toast("Persona saved");
  };

  return (
    <PageBody>
      <PageHeader title="Persona" subtitle="Drafted from the interview. Edit anything; the system prompt is generated from this form." />
      {!isOwner && <NotOwnerNote ownerName={ownerName} />}
      <div className="grid max-w-[640px] gap-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Name">
            <TextInput value={p.name} onChange={set("name")} disabled={disabled} />
          </Field>
          <Field label="Category" hint={`Model: ${modelForCategory(p.category)} (set by the platform)`}>
            <select
              value={p.category}
              disabled={disabled}
              onChange={(e) => set("category")(e.target.value as Category)}
              className="w-full rounded border border-line-default bg-surface-2 px-2.5 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Headline">
          <TextInput value={p.headline} onChange={set("headline")} disabled={disabled} />
        </Field>
        <Field label="Description">
          <TextArea value={p.description} onChange={set("description")} disabled={disabled} />
        </Field>
        <Field label="How I work">
          <TextInput value={p.howIWork} onChange={set("howIWork")} disabled={disabled} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Always" hint="One per line">
            <LinesInput value={p.always} onChange={set("always")} disabled={disabled} />
          </Field>
          <Field label="Never" hint="One per line">
            <LinesInput value={p.never} onChange={set("never")} disabled={disabled} />
          </Field>
        </div>
        <Field label="Example questions" hint="One per line">
          <LinesInput value={p.exampleQuestions} onChange={set("exampleQuestions")} disabled={disabled} />
        </Field>
        <Field label="Greeting">
          <TextInput value={p.greeting} onChange={set("greeting")} disabled={disabled} />
        </Field>
        {disclaimerFor(p.category) && <p className="text-xs text-fg-muted">This category is regulated. The disclaimer is added to every reply and can&apos;t be removed.</p>}

        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={advanced}
            disabled={disabled}
            onChange={(e) => {
              setAdvanced(e.target.checked);
              if (e.target.checked) setPrompt(personaToSystemPrompt(p));
            }}
          />
          Advanced: system prompt
        </label>
        {advanced && <TextArea rows={12} mono value={prompt} onChange={setPrompt} disabled={disabled} />}

        <div>
          <button onClick={save} disabled={disabled} className={buttonClass("primary", "lg")}>
            Save persona
          </button>
        </div>
        <PlaceholderNote feature="persona drafting from the interview" phase={2} />
      </div>
    </PageBody>
  );
}
