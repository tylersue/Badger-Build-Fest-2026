"use client";

import { useState } from "react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { buttonClass } from "@/components/app/ui";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, ApiClientError, newRequestKey } from "@/lib/api-client";
import type { SourceEstimate } from "@/lib/contracts/phase2";
import { clearDraft, getDraft, refreshDemo, saveDraft } from "@/lib/demo-store";
import { formatCreditUnits, formatNumber } from "@/lib/format";

type Mode = "file" | "text";
export type IntakeDraft = { mode: Mode; file: File | null; name: string; text: string;
  estimate: SourceEstimate | null; stage: "edit" | "confirm"; requestKey: string | null };
export const emptyIntakeDraft = (): IntakeDraft => ({ mode: "file", file: null, name: "", text: "", estimate: null, stage: "edit", requestKey: null });
function restoredIntakeDraft(agentId: string): IntakeDraft {
  const draft = emptyIntakeDraft();
  const saved = getDraft("source", agentId);
  if (!saved) return draft;
  try {
    const value = JSON.parse(saved.value) as { mode?: string; name?: string; text?: string };
    return value.mode === "text" && typeof value.text === "string"
      ? editIntake(draft, { mode: "text", name: value.name ?? "", text: value.text }) : draft;
  } catch { return draft; }
}
export function editIntake(draft: IntakeDraft, patch: Partial<Pick<IntakeDraft, "mode" | "file" | "name" | "text">>): IntakeDraft {
  return { ...draft, ...patch, estimate: null, stage: "edit", requestKey: null };
}
export function reviewIntake(draft: IntakeDraft, estimate: SourceEstimate): IntakeDraft {
  if (!intakePayload(draft) || estimate.name !== (draft.mode === "file" ? draft.file?.name : draft.name.trim())) return draft;
  return { ...draft, estimate, stage: "confirm", requestKey: newRequestKey() };
}
export function intakePayload(draft: IntakeDraft): { fileOrText: File | string; name: string } | null {
  if (draft.mode === "file") return draft.file ? { fileOrText: draft.file, name: draft.file.name } : null;
  return draft.text.trim() && draft.name.trim() ? { fileOrText: draft.text, name: draft.name.trim() } : null;
}
export function canConfirmIntake(draft: IntakeDraft, now = Date.now()): boolean {
  const payload = intakePayload(draft);
  return !!payload && draft.stage === "confirm" && !!draft.estimate && !!draft.requestKey &&
    draft.estimate.name === payload.name && Date.parse(draft.estimate.expiresAt) > now;
}

const allowed = /\.(pdf|docx|txt|md)$/i;
const size = (bytes: number) => `${formatNumber(bytes)} bytes`;
const messageFor = (error: unknown) => {
  if (error instanceof ApiClientError) {
    if (error.detail.code === "quota") return `${error.message} Choose a smaller source or remove an existing document.`;
    if (error.detail.code === "invalid_input") return `${error.message} Choose a PDF, DOCX, TXT, or MD file, or shorten your text.`;
    if (error.detail.code === "stale_estimate") return "The estimate changed or expired. Get a new estimate and confirm it again.";
  }
  return error instanceof Error ? error.message : "The source could not be processed. Your input is still here.";
};

export function SourceIntake({ agentId, open, onOpenChange, onComplete }: {
  agentId: string; open: boolean; onOpenChange: (open: boolean) => void; onComplete?: () => void;
}) {
  return <AgentSourceIntake key={agentId} agentId={agentId} open={open} onOpenChange={onOpenChange} onComplete={onComplete} />;
}

function AgentSourceIntake({ agentId, open, onOpenChange, onComplete }: {
  agentId: string; open: boolean; onOpenChange: (open: boolean) => void; onComplete?: () => void;
}) {
  const [draft, setDraft] = useState<IntakeDraft>(() => restoredIntakeDraft(agentId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);

  const change = (patch: Partial<Pick<IntakeDraft, "mode" | "file" | "name" | "text">>) => {
    const next = editIntake(draft, patch);
    setDraft(next);
    if (next.mode === "text") saveDraft("source", agentId, JSON.stringify({ mode: "text", name: next.name, text: next.text }));
    else clearDraft("source", agentId);
    setError(null); setNeedsCredits(false);
  };
  const estimate = async () => {
    const payload = intakePayload(draft);
    if (!payload) { setError("Choose a file or enter a source name and text."); return; }
    if (draft.mode === "file" && (!allowed.test(payload.name) || (draft.file?.size ?? 0) > 5 * 1024 * 1024)) {
      setError(allowed.test(payload.name) ? "This file exceeds the 5 MiB limit. Choose a smaller file." : "This file type isn't supported. Choose a PDF, DOCX, TXT, or MD file, or paste text."); return;
    }
    setBusy(true); setError(null); setNeedsCredits(false);
    try {
      const response = await api.sourcePreflight(agentId, payload.fileOrText, payload.name);
      setDraft(current => current === draft ? reviewIntake(current, response) : current);
    }
    catch (cause) { setError(messageFor(cause)); setNeedsCredits(cause instanceof ApiClientError && cause.detail.code === "insufficient_credits"); }
    finally { setBusy(false); }
  };
  const process = async () => {
    if (!canConfirmIntake(draft)) {
      setDraft(current => ({ ...current, estimate: null, stage: "edit", requestKey: null }));
      setError("The estimate expired. Get a new estimate and confirm it again."); return;
    }
    const payload = intakePayload(draft)!;
    setBusy(true); setError(null);
    try {
      await api.sourceConfirm(agentId, payload.fileOrText, payload.name, draft.estimate!.estimateToken, draft.requestKey!);
      clearDraft("source", agentId);
      setDraft(emptyIntakeDraft());
      onComplete?.();
      onOpenChange(false);
      if (!onComplete) await refreshDemo();
    } catch (cause) {
      setError(messageFor(cause));
      setNeedsCredits(cause instanceof ApiClientError && cause.detail.code === "insufficient_credits");
      if (cause instanceof ApiClientError && cause.detail.code === "stale_estimate")
        setDraft(current => ({ ...current, estimate: null, stage: "edit", requestKey: null }));
      if (cause instanceof ApiClientError && cause.detail.code === "insufficient_credits")
        setDraft(current => ({ ...current, estimate: null, stage: "edit", requestKey: null }));
    } finally { setBusy(false); }
  };
  const e = draft.estimate;
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full max-w-full overflow-y-auto border-line-faint bg-surface-1 sm:max-w-[480px]">
      <SheetHeader><SheetTitle>Add document</SheetTitle><SheetDescription>Upload a file or paste text, then review the limits and approximate cost before processing.</SheetDescription></SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
        <div className="flex gap-2" role="group" aria-label="Source type">
          <button type="button" disabled={busy} aria-pressed={draft.mode === "file"} className={buttonClass(draft.mode === "file" ? "primary" : "secondary", "lg")} onClick={() => change({ mode: "file" })}>Upload file</button>
          <button type="button" disabled={busy} aria-pressed={draft.mode === "text"} className={buttonClass(draft.mode === "text" ? "primary" : "secondary", "lg")} onClick={() => change({ mode: "text" })}>Paste text</button>
        </div>
        {draft.mode === "file" ? <div className="space-y-2"><label htmlFor="source-file" className="font-semibold">PDF, DOCX, TXT, or MD file</label>
          <input id="source-file" type="file" disabled={busy} accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full max-w-full text-sm" onChange={event => change({ file: event.target.files?.[0] ?? null })} />
          {draft.file && <p className="break-words text-fg-muted">{draft.file.name} · {size(draft.file.size)}</p>}
        </div> : <><div className="space-y-2"><label htmlFor="source-name" className="font-semibold">Source name</label>
          <input id="source-name" maxLength={200} disabled={busy} value={draft.name} onChange={event => change({ name: event.target.value })} className="min-h-11 w-full rounded border border-line-muted bg-surface-2 px-3" /></div>
          <div className="space-y-2"><label htmlFor="source-text" className="font-semibold">Text</label>
            <textarea id="source-text" maxLength={100000} disabled={busy} value={draft.text} onChange={event => change({ text: event.target.value })} rows={8} className="w-full rounded border border-line-muted bg-surface-2 p-3" /></div></>}
        {e && draft.stage === "confirm" && <div className="space-y-3 rounded-xl border border-line-muted bg-surface-2 p-4" aria-label="Source estimate">
          <h3 className="font-semibold break-words">Process {e.name}?</h3>
          <p>About {formatCreditUnits(e.estimateUnits)}. Final cost depends on actual processing.</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs tabular-nums">
            <dt>Remaining files</dt><dd>{formatNumber(e.remaining.sources)}</dd>
            <dt>Remaining bytes</dt><dd>{size(e.remaining.bytes)}</dd>
            <dt>Remaining chunks</dt><dd>{formatNumber(e.remaining.chunks)}</dd>
            <dt>Projected files</dt><dd>{formatNumber(e.projectedUse.sources)}</dd>
            <dt>Projected bytes</dt><dd>{size(e.projectedUse.bytes)}</dd>
            <dt>Projected pages</dt><dd>{e.projectedPageCount === null ? "Available after processing" : formatNumber(e.projectedPageCount)}</dd>
            <dt>Projected chunks</dt><dd>{e.projectedChunkCount === null ? "Estimated after processing" : formatNumber(e.projectedChunkCount)}</dd>
            <dt>Maximum hold</dt><dd>{formatCreditUnits(e.maxUnits)}</dd>
            <dt>Available credits</dt><dd>{formatCreditUnits(e.walletAvailableUnits)}</dd>
            <dt>Credits held</dt><dd>{formatCreditUnits(e.walletHeldUnits)}</dd>
          </dl>
          <p className="text-xs text-fg-muted">Estimate expires {new Date(e.expiresAt).toLocaleTimeString()}.</p>
        </div>}
        {error && <p role="alert" className="break-words text-danger">{error}</p>}
        {needsCredits && <div><AddCreditsButton size="sm" /><p className="mt-2 text-xs text-fg-muted">After adding credits, get a new estimate and confirm it.</p></div>}
        <div aria-live="polite" className="text-xs text-fg-muted">{busy ? "Working…" : "Your source stays here until processing is acknowledged."}</div>
        {draft.stage === "confirm" ? <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={buttonClass("secondary", "lg")} onClick={() => setDraft(current => ({ ...current, stage: "edit" }))}>Keep editing</button>
          <button type="button" disabled={busy} className={buttonClass("primary", "lg")} onClick={process}>Process source</button>
        </div> : <button type="button" disabled={busy || !intakePayload(draft)} className={buttonClass("primary", "lg")} onClick={estimate}>Review limits and cost</button>}
      </div>
    </SheetContent>
  </Sheet>;
}
