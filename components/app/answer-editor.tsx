"use client";

import { useState } from "react";
import { api, ApiClientError, newRequestKey } from "@/lib/api-client";
import { readInterview, refreshDemo } from "@/lib/demo-store";
import type { InterviewView as InterviewSnapshot } from "@/features/builder/interview";
import { buttonClass } from "@/components/app/ui";
import { AddCreditsButton } from "@/components/app/add-credits";

export type CapturedAnswer = InterviewSnapshot["answers"][number];
type Action = "edit" | "add-detail" | "retry-index" | "delete";

export function AnswerEditor({ agentId, answer, isOwner, onChange }: {
  agentId: string; answer: CapturedAnswer; isOwner: boolean; onChange?: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"read" | "edit" | "detail" | "delete">("read");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<{ action: Action; text?: string; key: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [needsCredits, setNeedsCredits] = useState(false);

  async function perform(action: Action, content?: string) {
    if (!isOwner || busy) return;
    const submitted = content?.trim();
    if ((action === "edit" || action === "add-detail") && !submitted) {
      setError("Write an answer before saving."); return;
    }
    const key = pendingKey?.action === action && pendingKey.text === submitted ? pendingKey.key : newRequestKey();
    setPendingKey({ action, text: submitted, key });
    setBusy(true); setError(null); setNeedsCredits(false);
    setAnnouncement(action === "retry-index" ? "Updating knowledge" : action === "delete" ? "Deleting answer" : "Saving answer");
    try {
      if (action === "delete") await api.deleteAnswer(agentId, answer.id, answer.version, key);
      else await api.answerAction(agentId, answer.id, action, answer.version, key, submitted);
      setPendingKey(null); setMode("read"); setText("");
      setAnnouncement(action === "delete" ? "Answer deleted" : action === "retry-index" ? "Updating knowledge" : "Answer saved. Updating knowledge");
      try { await readInterview(agentId); await refreshDemo(); await onChange?.(); }
      catch { setError("Saved, but the latest status could not load. Refresh to check knowledge indexing."); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save your changes. Your draft is still here. Check your connection and try again.");
      setNeedsCredits(cause instanceof ApiClientError && cause.detail.code === "insufficient_credits");
      setAnnouncement("Update failed");
    } finally { setBusy(false); }
  }

  const status = answer.state === "ready" && answer.indexedRevisionId === answer.revisionId ? "Ready" :
    answer.state === "failed" ? "Update failed" : "Updating knowledge";
  return <article className="rounded-xl border border-line-subtle bg-surface-1 p-4 text-sm">
    <p className="text-xs font-medium text-fg-muted">{answer.parentAnswerId ? "Added detail for" : "Question"}</p>
    <p className="mt-1 whitespace-pre-wrap text-base">{answer.question}</p>
    {mode === "edit" || mode === "detail" ? <div className="mt-4 grid gap-3">
      <label className="grid gap-2 text-sm font-semibold">{mode === "edit" ? "Edit answer" : "Add detail"}
        <textarea aria-label={mode === "edit" ? "Edit answer" : "Add detail"} className="min-h-28 w-full resize-y rounded border border-line-default bg-surface-2 p-3 font-normal outline-none focus:border-brand-border" value={text} onChange={e => setText(e.target.value)} disabled={busy} maxLength={100000} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass("primary", "lg")} disabled={busy || !text.trim()} onClick={() => void perform(mode === "edit" ? "edit" : "add-detail", text)}>{busy ? "Saving answer" : mode === "edit" ? "Save answer" : "Save detail"}</button>
        <button type="button" className={buttonClass("secondary", "lg")} disabled={busy} onClick={() => { setMode("read"); setText(""); setError(null); setPendingKey(null); }}>Discard changes</button>
      </div>
    </div> : <p className="mt-3 whitespace-pre-wrap leading-relaxed">{answer.text}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
      <span aria-live="polite" className={status === "Update failed" ? "text-danger" : status === "Ready" ? "text-success" : "text-warning"}>{status}</span>
      <time dateTime={answer.createdAt}>{new Date(answer.createdAt).toLocaleString()}</time>
      {answer.previousActive && <span>Previous indexed version remains active.</span>}
      {answer.progress && answer.state === "indexing" && <span>{answer.progress.completedBatches}/{answer.progress.totalBatches} batches</span>}
    </div>
    {answer.state === "failed" && <p className="mt-2 text-xs text-danger">{answer.previousActive ? "This update isn't searchable yet; the previous indexed version remains active." : "Your answer was saved, but isn't searchable yet. Retry indexing to use it in replies."}</p>}
    {isOwner && mode === "read" && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={buttonClass()} disabled={busy} onClick={() => { setText(answer.text); setMode("edit"); setError(null); }}>Edit answer</button>
      <button type="button" className={buttonClass()} disabled={busy} onClick={() => { setText(""); setMode("detail"); setError(null); }}>Add detail</button>
      {answer.state === "failed" && <button type="button" className={buttonClass()} disabled={busy} onClick={() => void perform("retry-index")}>{answer.previousActive ? "Retry update" : "Retry indexing"}</button>}
      <button type="button" className={buttonClass("destructive")} disabled={busy} onClick={() => setMode("delete")}>Delete answer</button>
    </div>}
    {isOwner && mode === "delete" && <div className="mt-4 rounded border border-danger/40 bg-danger-surface p-3">
      <p>Delete this answer? It and its linked details will stop being used as knowledge. The question stays in the transcript.</p>
      <div className="mt-3 flex gap-2"><button type="button" className={buttonClass()} disabled={busy} onClick={() => setMode("read")}>Keep answer</button><button type="button" className={buttonClass("destructive", "lg")} disabled={busy} onClick={() => void perform("delete")}>Delete answer</button></div>
    </div>}
    {error && <div role="alert" className="mt-3 text-xs text-danger"><p>{error}</p>{needsCredits && <div className="mt-2"><AddCreditsButton size="sm" /></div>}</div>}
    <span className="sr-only" aria-live="polite">{announcement}</span>
  </article>;
}
