"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { buttonClass } from "@/components/app/ui";
import type { Agent } from "@/lib/types";

export type VoiceSettings = { tone: string[]; styles: string[]; options: Record<string, string> };

const sentences = (text: string) => text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [];

/** A sample of how the agent's reply opens, so the expert hears the voice before saving. */
function preview(agent: Agent, expertFirst: string, styles: Set<string>): string {
  const source = agent.persona.howIWork || agent.persona.description || "Start with the problem, then the customer.";
  const core = styles.has("concise") ? sentences(source).slice(0, 1).join(" ") : source;
  const body = styles.has("bullets") ? sentences(core).map((s) => `- ${s}`).join("\n") : core;
  const lead = styles.has("voice") ? body : `In ${expertFirst}'s words: "${core}"`;
  const close = styles.has("action") ? "\n\nNext step: pick the one point that fits you and act on it this week."
    : styles.has("concise") ? "" : `\n\nIf your situation is different, ${expertFirst}'s contact link is at the top of this chat.`;
  return `${lead}${close}`;
}

/* Persona › Voice & tone: tone traits and how the agent talks back. Changes apply to Test and published chats. */
export function VoiceTone({ agent, expertFirst, voice, isOwner, onSave }: {
  agent: Agent; expertFirst: string; voice: VoiceSettings; isOwner: boolean;
  onSave: (next: { tone?: string[]; styles?: string[] }) => Promise<void>;
}) {
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const styles = new Set(voice.styles);
  const save = async (next: { tone?: string[]; styles?: string[] }) => {
    setBusy(true);
    try { await onSave(next); } finally { setBusy(false); }
  };
  const addTone = () => {
    const value = adding.trim();
    if (!value || voice.tone.includes(value)) return;
    setAdding("");
    void save({ tone: [...voice.tone, value] });
  };

  return (
    <section aria-labelledby="voice-tone-heading" className="mb-6 rounded-xl border border-line-subtle bg-surface-1 p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="voice-tone-heading" className="text-base font-semibold">Voice &amp; tone</h2>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Tone</h3>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Tone traits">
        {voice.tone.map((trait) => (
          <li key={trait} className="inline-flex items-center gap-1 rounded-full border border-line-default bg-surface-2 py-1 pr-1.5 pl-3 text-sm">
            {trait}
            {isOwner && (
              <button type="button" aria-label={`Remove ${trait}`} disabled={busy} onClick={() => void save({ tone: voice.tone.filter((t) => t !== trait) })}
                className="grid size-5 place-items-center rounded-full text-fg-muted hover:bg-surface-3 hover:text-foreground">
                <X className="size-3" />
              </button>
            )}
          </li>
        ))}
        {!voice.tone.length && <li className="text-sm text-fg-muted">Answer the interview to draft a tone.</li>}
      </ul>
      {isOwner && (
        <div className="mt-3 flex max-w-[420px] gap-2">
          <input value={adding} onChange={(event) => setAdding(event.target.value)} placeholder="Add a trait, e.g. Blunt but kind"
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTone(); } }}
            aria-label="Add a tone trait" className="w-full rounded border border-line-default bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-border" />
          <button type="button" className={buttonClass()} disabled={busy || !adding.trim()} onClick={addTone}>Add</button>
        </div>
      )}

      <h3 className="mt-6 text-sm font-semibold">How it talks back</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {Object.entries(voice.options).map(([id, label]) => (
          <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${styles.has(id) ? "border-brand-border bg-surface-2" : "border-line-subtle"}`}>
            <input type="checkbox" className="mt-0.5" checked={styles.has(id)} disabled={!isOwner || busy}
              onChange={() => void save({ styles: styles.has(id) ? voice.styles.filter((s) => s !== id) : [...voice.styles, id] })} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold">Sample reply</h3>
      <p className="mt-2 rounded-lg border border-line-subtle bg-surface-2 p-3 text-sm whitespace-pre-wrap">{preview(agent, expertFirst, styles)}</p>
    </section>
  );
}
