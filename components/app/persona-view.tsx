"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/config/categories";
import { modelForCategory } from "@/lib/config/models";
import type { PersonaFieldName, PersonaState } from "@/lib/contracts/phase2";
import type { Agent, PersonaForm } from "@/lib/types";
import { api, apiRequest } from "@/lib/api-client";
import { clearDraft, displayName, getDraft, readDemoState, refreshDemo, saveDraft, useDemo } from "@/lib/demo-store";
import { personaToSystemPrompt } from "@/features/builder/prompt-template";
import { EmptyState, PageBody, PageHeader, buttonClass } from "@/components/app/ui";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserRound } from "lucide-react";
import { VoiceTone, type VoiceSettings } from "@/components/app/voice-tone";

export type PersonaPayload = { state: PersonaState; form: PersonaForm; generatedPrompt: string; activePrompt: string; model: string; reviewFieldIds: PersonaFieldName[];
  /** Demo backend only: tone traits and reply style. */
  voice?: VoiceSettings };
export type PersonaDraft = { values: PersonaForm; dirty: Partial<Record<PersonaFieldName, boolean>>;
  customPrompt: string; customDirty: boolean; promptVersion: number };
const FIELDS: PersonaFieldName[] = ["name", "category", "headline", "description", "howIWork", "always", "never", "exampleQuestions", "greeting"];
const LABELS: Record<PersonaFieldName, string> = {
  name: "Name", category: "Category", headline: "Headline", description: "Description", howIWork: "How I work",
  always: "Always do", never: "Never do", exampleQuestions: "Example questions", greeting: "Greeting",
};

/** Incoming interview suggestions update only fields the expert has not touched locally. */
export function mergePersonaDraft(previous: PersonaDraft | null, state: PersonaState): PersonaDraft {
  const values = {} as PersonaForm;
  for (const field of FIELDS) {
    // The cast is confined to this heterogeneous mapped-type assignment.
    (values as unknown as Record<string, unknown>)[field] = previous?.dirty[field]
      ? previous.values[field] : state.fields[field].value;
  }
  return { values, dirty: previous?.dirty ?? {},
    customPrompt: previous?.customDirty ? previous.customPrompt : state.customPrompt ?? "",
    customDirty: previous?.customDirty ?? false, promptVersion: state.promptVersion };
}

function storedPersonaDraft(agentId: string): PersonaDraft | null {
  const raw = getDraft("persona", agentId)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PersonaDraft;
    if (value && value.values && value.dirty && typeof value.customPrompt === "string") return value;
  } catch { /* Older form-only drafts are ignored; live state remains authoritative. */ }
  return null;
}

function persistPersonaDraft(agentId: string, next: PersonaDraft) { saveDraft("persona", agentId, JSON.stringify(next)); }
const fieldClass = "w-full rounded border border-line-default bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-border disabled:opacity-60";

export function PersonaView({ agent, isOwner }: { agent: Agent; isOwner: boolean }) {
  const demo = useDemo();
  const [payload, setPayload] = useState<PersonaPayload | null>(null);
  const [loadedFor, setLoadedFor] = useState("");
  const [draft, setDraft] = useState<PersonaDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const identity = demo.identityId;
    if (demo.status === "ready") void api.persona(agent.id).then(result => {
      if (!active || readDemoState().identityId !== identity) return;
      const next = result as PersonaPayload;
      setPayload(next); setLoadedFor(`${identity}:${agent.id}`); setError("");
      setDraft(mergePersonaDraft(storedPersonaDraft(agent.id), next.state));
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Persona unavailable."); });
    return () => { active = false; };
  }, [agent.id, demo.identityId, demo.status]);

  async function refresh(keepDraft = true) {
    const next = await api.persona(agent.id) as PersonaPayload;
    setPayload(next);
    setDraft(previous => mergePersonaDraft(keepDraft ? previous : null, next.state));
    return next;
  }

  function editField<K extends PersonaFieldName>(field: K, value: PersonaForm[K]) {
    if (!isOwner || busy || !draft) return;
    const next = { ...draft, values: { ...draft.values, [field]: value }, dirty: { ...draft.dirty, [field]: true } };
    setDraft(next); persistPersonaDraft(agent.id, next);
    setNotice(""); setError("");
  }

  async function saveFields() {
    if (!isOwner || !draft || !payload || busy) return;
    const changed = FIELDS.filter(field => draft.dirty[field]);
    if (!changed.length) { setNotice("No changes to save."); return; }
    const patch = Object.fromEntries(changed.map(field => [field, draft.values[field]])) as Partial<PersonaForm>;
    const expectedVersions = Object.fromEntries(changed.map(field => [field, payload.state.fields[field].version]));
    setBusy(true); setNotice("Saving persona"); setError("");
    try {
      const saved = await api.savePersona(agent.id, patch, expectedVersions) as PersonaPayload;
      const remaining = { ...draft.dirty };
      for (const field of changed) delete remaining[field];
      const clean = { ...draft, dirty: remaining };
      setPayload(saved); setDraft(mergePersonaDraft(clean, saved.state));
      if (Object.keys(remaining).length || clean.customDirty) persistPersonaDraft(agent.id, clean);
      else clearDraft("persona", agent.id);
      await refreshDemo().catch(() => undefined); setNotice("Persona saved");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save your changes. Your draft is still here. Check your connection and try again."); setNotice("Save failed"); }
    finally { setBusy(false); }
  }

  async function suggestion(field: PersonaFieldName, action: "accept-suggestion" | "keep-suggestion") {
    if (!isOwner || !payload || busy) return;
    setBusy(true); setError(""); setNotice(action === "accept-suggestion" ? "Using suggestion" : "Keeping your text");
    try {
      const next = await apiRequest<PersonaPayload>(`/api/agents/${encodeURIComponent(agent.id)}/persona`, {
        method: "PATCH", body: { action, field, expectedVersion: payload.state.fields[field].version },
      });
      setPayload(next);
      const dirty = { ...draft?.dirty };
      if (action === "accept-suggestion") delete dirty[field];
      const merged = mergePersonaDraft(draft ? { ...draft, dirty } : null, next.state);
      setDraft(merged);
      if (Object.keys(dirty).length || merged.customDirty) persistPersonaDraft(agent.id, merged);
      else clearDraft("persona", agent.id);
      await refreshDemo().catch(() => undefined); setNotice(action === "accept-suggestion" ? "Suggestion applied" : "Your text kept");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update suggestion. Your text is still here."); setNotice("Update failed"); }
    finally { setBusy(false); }
  }

  function editCustom(value: string) {
    if (!isOwner || busy || !draft) return;
    const next = { ...draft, customPrompt: value, customDirty: true };
    setDraft(next); persistPersonaDraft(agent.id, next);
    setNotice(""); setError("");
  }

  async function saveVoice(next: { tone?: string[]; styles?: string[] }) {
    if (!isOwner) return;
    setError("");
    try {
      const saved = await apiRequest<PersonaPayload>(`/api/agents/${encodeURIComponent(agent.id)}/persona`, { method: "PATCH", body: { action: "voice", ...next } });
      setPayload(saved); setNotice("Voice & tone saved");
      await refreshDemo().catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save voice & tone."); }
  }

  async function saveCustom() {
    if (!isOwner || !draft || !payload || busy) return;
    setBusy(true); setNotice("Saving custom prompt"); setError("");
    try {
      const saved = await apiRequest<PersonaPayload>(`/api/agents/${encodeURIComponent(agent.id)}/persona`, {
        method: "PATCH", body: { action: "custom-prompt", text: draft.customPrompt, expectedVersion: payload.state.promptVersion },
      });
      setPayload(saved);
      const clean = { ...draft, customDirty: false };
      setDraft(mergePersonaDraft(clean, saved.state));
      if (Object.keys(clean.dirty).length) persistPersonaDraft(agent.id, clean);
      else clearDraft("persona", agent.id);
      await refreshDemo().catch(() => undefined); setNotice("Custom prompt saved");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't save your custom prompt. Your draft is still here."); setNotice("Save failed"); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    if (!isOwner || !payload || busy) return;
    setBusy(true); setNotice("Regenerating prompt"); setError("");
    try {
      const saved = await apiRequest<PersonaPayload>(`/api/agents/${encodeURIComponent(agent.id)}/persona`, {
        method: "PATCH", body: { action: "regenerate-prompt", expectedVersion: payload.state.promptVersion, confirmed: true },
      });
      const clean = draft ? { ...draft, customDirty: false } : null;
      const merged = mergePersonaDraft(clean, saved.state);
      setPayload(saved); setDraft(merged);
      if (Object.keys(merged.dirty).length) persistPersonaDraft(agent.id, merged);
      else clearDraft("persona", agent.id);
      setConfirmRegenerate(false); await refreshDemo().catch(() => undefined); setNotice("Generated from form");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't regenerate the prompt. Your custom prompt is still here."); setNotice("Update failed"); }
    finally { setBusy(false); }
  }

  if (loadedFor !== `${demo.identityId}:${agent.id}` || !payload || !draft) return <PageBody><PageHeader title="Persona" />{error || demo.error ? <p role="alert" className="text-sm text-danger">{error || demo.error}<button type="button" className={`${buttonClass()} ml-3`} onClick={() => void refresh().then(() => setLoadedFor(`${demo.identityId}:${agent.id}`)).catch(cause => setError(cause instanceof Error ? cause.message : "Could not load persona."))}>Retry loading</button></p> : <p className="text-sm text-fg-muted">Loading persona…</p>}</PageBody>;

  const hasContent = FIELDS.some(field => field !== "category" && (Array.isArray(draft.values[field]) ? draft.values[field].length : draft.values[field]));
  const custom = payload.state.promptMode === "custom" || draft.customDirty;
  return <PageBody className="max-w-[800px]"><PageHeader title="Persona" />
    {demo.status === "error" && <p role="alert" className="mb-4 rounded border border-warning/40 bg-warning-surface p-3 text-sm">{demo.error ?? "The latest agent summary could not load. Your persona draft is still here."}</p>}
    {payload.voice && <VoiceTone agent={agent} expertFirst={(displayName(demo, agent.ownerId).split(" ")[0]) || "The expert"} voice={payload.voice} isOwner={isOwner} onSave={saveVoice} />}
    {!hasContent && <EmptyState icon={UserRound} heading="Your persona will take shape here" body="Answer the opening questions or add your own details." action={{ label: "Continue interview", href: `/build/${agent.id}/interview` }} />}
    <div className="space-y-5 rounded-xl border border-line-subtle bg-surface-1 p-4 sm:p-6">
      {FIELDS.map(field => {
        const serverField = payload.state.fields[field];
        const value = draft.values[field];
        const provenance = draft.dirty[field] || serverField.origin === "expert" ? "Edited by you" : serverField.origin === "interview" ? "Drafted from interview" : "Add your own details";
        const suggestion = serverField.pendingSuggestion;
        return <div key={field} className="grid gap-2 border-b border-line-faint pb-4 last:border-0 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><label htmlFor={`persona-${field}`} className="text-sm font-semibold">{LABELS[field]}</label><span className="text-xs text-fg-muted">{provenance}</span></div>
          {field === "category" ? <select id={`persona-${field}`} value={String(value)} disabled={!isOwner || busy} onChange={event => editField("category", event.target.value as PersonaForm["category"])} className={fieldClass}>{CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select> :
            Array.isArray(value) ? <textarea id={`persona-${field}`} value={value.join("\n")} rows={3} disabled={!isOwner || busy} onChange={event => editField(field, event.target.value.split("\n"))} className={fieldClass} aria-describedby={`persona-${field}-hint`} /> :
            field === "name" || field === "headline" || field === "greeting" ? <input id={`persona-${field}`} value={String(value)} disabled={!isOwner || busy} onChange={event => editField(field, event.target.value)} className={fieldClass} /> :
            <textarea id={`persona-${field}`} value={String(value)} rows={4} disabled={!isOwner || busy} onChange={event => editField(field, event.target.value)} className={fieldClass} />}
          {Array.isArray(value) && <p id={`persona-${field}-hint`} className="text-xs text-fg-muted">One item per line.</p>}
          {suggestion && <div className="rounded border border-line-default bg-surface-2 p-3 text-sm"><p className="text-xs font-semibold text-fg-muted">New interview suggestion</p><p className="mt-1 whitespace-pre-wrap">{Array.isArray(suggestion.value) ? suggestion.value.join("\n") : suggestion.value}</p>{isOwner && <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass()} disabled={busy} onClick={() => void suggestionAction(field, "accept-suggestion")}>Use suggestion</button><button type="button" className={buttonClass()} disabled={busy} onClick={() => void suggestionAction(field, "keep-suggestion")}>Keep my text</button></div>}</div>}
        </div>;
      })}
      <div className="flex flex-wrap items-center gap-3"><button type="button" className={buttonClass("primary", "lg")} disabled={!isOwner || busy || !Object.values(draft.dirty).some(Boolean)} onClick={() => void saveFields()}>{busy && notice === "Saving persona" ? "Saving persona" : "Save persona"}</button><span role="status" aria-live="polite" className="text-xs text-fg-muted">{notice}</span></div>
      {error && <div role="alert" className="rounded border border-danger/40 bg-danger-surface p-3 text-sm">{error} <button type="button" className={buttonClass()} disabled={busy} onClick={() => void refresh().catch(cause => setError(cause instanceof Error ? cause.message : "Could not refresh persona."))}>Refresh latest</button></div>}
    </div>
    <section className="mt-6 rounded-xl border border-line-subtle bg-surface-1 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Advanced</h2><p className="mt-1 text-xs text-fg-muted">{custom ? "Custom prompt" : "Generated from form"}</p></div><button type="button" className={buttonClass()} aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>{advanced ? "Hide advanced" : "Show advanced"}</button></div>
      {advanced && <div className="mt-4 grid gap-4"><p className="text-sm text-fg-muted">Platform model: <span className="text-foreground">{modelForCategory(draft.values.category)}</span> · assigned by category</p><p className="text-sm text-fg-muted">Platform safety rules always apply.</p>
        {custom && <p className="text-sm text-warning">Your custom prompt is still active.</p>}
        <label className="grid gap-2 text-sm font-semibold" htmlFor="persona-system-prompt">{custom ? "Custom prompt" : "Generated from form"}</label>
        <textarea id="persona-system-prompt" value={custom ? draft.customPrompt : personaToSystemPrompt(draft.values)} rows={10} readOnly={!isOwner || !custom} disabled={busy} onChange={event => editCustom(event.target.value)} className={`${fieldClass} font-mono text-xs`} />
        {isOwner && <div className="flex flex-wrap gap-2">{custom ? <><button type="button" className={buttonClass("primary", "lg")} disabled={busy || !draft.customDirty} onClick={() => void saveCustom()}>Save custom prompt</button><button type="button" className={buttonClass()} disabled={busy} onClick={() => setConfirmRegenerate(true)}>Regenerate from form</button></> : <button type="button" className={buttonClass()} disabled={busy} onClick={() => editCustom(personaToSystemPrompt(draft.values))}>Customize prompt</button>}</div>}
        <Dialog open={confirmRegenerate} onOpenChange={open => { if (!busy) setConfirmRegenerate(open); }}><DialogContent className="border border-line-subtle bg-surface-1"><DialogTitle>Replace custom prompt?</DialogTitle><DialogDescription>Replace your custom prompt with the current persona form? Your custom wording will be replaced.</DialogDescription><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass()} disabled={busy} onClick={() => setConfirmRegenerate(false)}>Keep custom prompt</button><button type="button" className={buttonClass("destructive", "lg")} disabled={busy} onClick={() => void regenerate()}>Regenerate from form</button></div></DialogContent></Dialog>
      </div>}
    </section>
    <p className="mt-4 text-xs text-fg-muted">Need more source material? <Link className="text-selected-fg underline" href={`/build/${agent.id}/interview`}>Continue interview</Link>.</p>
  </PageBody>;

  function suggestionAction(field: PersonaFieldName, action: "accept-suggestion" | "keep-suggestion") { void suggestion(field, action); }
}
