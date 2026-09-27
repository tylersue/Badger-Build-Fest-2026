"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, FileText, Plus } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { SourceIntake } from "@/components/app/source-intake";
import { buttonClass } from "@/components/app/ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, apiRequest, ApiClientError, newRequestKey } from "@/lib/api-client";
import type { SourceEstimate } from "@/lib/contracts/phase2";
import { refreshDemo, useDemo } from "@/lib/demo-store";
import { formatCreditUnits, formatNumber } from "@/lib/format";
import type { Agent } from "@/lib/types";
import type { InterviewView } from "@/features/builder/interview";
import type { SourceListItem, SourceOverview } from "@/features/knowledge/intake";

export type KnowledgeAnswer = InterviewView["answers"][number];
type RetryReview = { sourceId: string; estimate: SourceEstimate; requestKey: string };
const errorText = (error: unknown) => error instanceof Error ? error.message : "The request failed. Try again.";
const deleteSourceName = (overview: SourceOverview | null, id: string) => overview?.sources.find(source => source.id === id)?.name ?? "this source";
const expired = (estimate: SourceEstimate) => Date.parse(estimate.expiresAt) <= Date.now();
const sourceStatus = (source: SourceListItem) => {
  if (source.state === "ready") return "Ready";
  if (source.state === "processing") return "Processing";
  if (source.state === "queued") return "Queued";
  return "Failed";
};
const answerStatus = (answer: KnowledgeAnswer) => {
  if (answer.state === "ready" && answer.revisionId === answer.indexedRevisionId) return "Ready";
  if (answer.state === "failed") return answer.previousActive ? "Update failed · previous answer searchable" : "Indexing failed";
  if (answer.state === "indexing") return answer.previousActive ? "Updating knowledge · previous answer searchable" : "Updating knowledge";
  return answer.indexedRevisionId && answer.revisionId !== answer.indexedRevisionId
    ? "Current answer awaiting update · previous answer searchable" : "Captured · not searchable yet";
};

/** The optional action slot lets the builder mount plan 13's AnswerEditor without a wave dependency. */
export function KnowledgeView({ agent, isOwner, renderAnswerActions }: {
  agent: Agent; isOwner: boolean; renderAnswerActions?: (answer: KnowledgeAnswer, onChange: () => void) => ReactNode;
}) {
  const identityId = useDemo().identityId;
  return <AgentKnowledgeView key={`${identityId}:${agent.id}:${isOwner}`} agent={agent} isOwner={isOwner}
    identityId={identityId} renderAnswerActions={renderAnswerActions} />;
}

function AgentKnowledgeView({ agent, isOwner, identityId, renderAnswerActions }: {
  agent: Agent; isOwner: boolean; identityId: string;
  renderAnswerActions?: (answer: KnowledgeAnswer, onChange: () => void) => ReactNode;
}) {
  const [interview, setInterview] = useState<InterviewView | null>(null);
  const [overview, setOverview] = useState<SourceOverview | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);
  const [reload, setReload] = useState(0);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [retryReview, setRetryReview] = useState<RetryReview | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumeKeys, setResumeKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOwner) return;
    let live = true;
    void api.interview(agent.id).then(value => { if (live) { setInterview(value); setAnswerError(null); } },
      error => { if (live) setAnswerError(errorText(error)); });
    void apiRequest<SourceOverview>(`/api/agents/${encodeURIComponent(agent.id)}/sources`).then(value => {
      if (live) { setOverview(value); setSourceError(null); }
    }, error => { if (live) setSourceError(errorText(error)); });
    return () => { live = false; };
  }, [agent.id, identityId, isOwner, reload]);

  const refresh = () => {
    setReload(value => value + 1);
    void refreshDemo().catch(error => setActionError(`The action was accepted, but the overview could not refresh: ${errorText(error)}`));
  };
  const report = (error: unknown) => {
    setActionError(errorText(error));
    setNeedsCredits(error instanceof ApiClientError && error.detail.code === "insufficient_credits");
  };
  const startRetry = async (source: SourceListItem) => {
    setBusyId(source.id); setActionError(null); setNeedsCredits(false);
    try {
      const estimate = await api.sourceRetryPreflight(agent.id, source.id);
      setRetryReview({ sourceId: source.id, estimate, requestKey: newRequestKey() });
    } catch (error) { report(error); }
    finally { setBusyId(null); }
  };
  const confirmRetry = async () => {
    if (!retryReview) return;
    if (expired(retryReview.estimate)) {
      setRetryReview(null);
      setActionError("The retry estimate expired. Get a fresh estimate and confirm it again.");
      return;
    }
    setBusyId(retryReview.sourceId); setActionError(null);
    try {
      await api.sourceRetry(agent.id, retryReview.sourceId, retryReview.estimate.estimateToken, retryReview.requestKey);
      setRetryReview(null);
      refresh();
    } catch (error) {
      if (error instanceof ApiClientError && (error.detail.code === "stale_estimate" || error.detail.code === "insufficient_credits"))
        setRetryReview(null);
      report(error);
    } finally { setBusyId(null); }
  };
  const resume = async (source: SourceListItem) => {
    const key = resumeKeys[source.id] ?? newRequestKey();
    setResumeKeys(keys => ({ ...keys, [source.id]: key }));
    setBusyId(source.id); setActionError(null);
    try {
      await api.sourceResume(agent.id, source.id, key);
      setResumeKeys(keys => { const next = { ...keys }; delete next[source.id]; return next; });
      refresh();
    } catch (error) { report(error); }
    finally { setBusyId(null); }
  };
  const remove = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeletingId(id); setActionError(null);
    try {
      await api.sourceDelete(agent.id, id);
      setOverview(current => current ? { ...current, sources: current.sources.filter(source => source.id !== id) } : current);
      setDeleteId(null);
      refresh();
    } catch (error) {
      setActionError(`Couldn't delete ${deleteSourceName(overview, id)}. It is still available. ${errorText(error)}`);
    }
    finally { setDeletingId(null); }
  };

  if (!isOwner) return <div className="px-4 py-6 text-sm text-fg-muted">Switch to this agent&apos;s owner to view its private knowledge.</div>;
  const answers = interview?.answers ?? [];
  const topAnswers = answers.filter(answer => !answer.parentAnswerId || !answers.some(parent => parent.id === answer.parentAnswerId));
  const documents = overview?.sources.filter(source => !source.deletedAt && source.kind !== "interview") ?? [];
  const deleteSource = documents.find(source => source.id === deleteId);
  const retrySource = documents.find(source => source.id === retryReview?.sourceId);
  const renderAnswer = (answer: KnowledgeAnswer, linked = false) => <article key={answer.id} className="min-w-0 rounded-xl border border-line-muted bg-surface-2 p-4">
    {linked && <p className="text-xs font-semibold text-fg-muted">Linked detail</p>}
    <h3 className="break-words text-sm font-semibold">{answer.question}</h3>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{answer.text}</p>
    <p className="mt-2 text-xs text-fg-muted" aria-live="polite">{answerStatus(answer)}</p>
    {renderAnswerActions ? <div className="mt-3">{renderAnswerActions(answer, refresh)}</div> :
      <Link href={`/build/${agent.id}/interview`} className="mt-3 inline-flex min-h-11 items-center text-sm text-selected-fg underline">Edit answer in interview</Link>}
  </article>;

  return <main className="mx-auto w-full max-w-[900px] min-w-0 space-y-8 px-4 py-6 sm:px-6">
    <header><h1 className="text-2xl font-semibold">Knowledge</h1><p className="mt-1 text-sm text-fg-muted">Saved interview answers and optional documents used by your agent.</p></header>
    <section aria-labelledby="interview-answers-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="interview-answers-heading" className="text-base font-semibold">Interview answers</h2>
        <p className="text-xs text-fg-muted">{formatNumber(answers.length)} saved answers and linked details</p></div>
        <Link href={`/build/${agent.id}/interview`} className={buttonClass("secondary", "lg")}>Open interview</Link></div>
      {answerError && <div role="alert" className="text-sm text-danger">Couldn&apos;t load interview answers: {answerError} <button className="underline" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
      {!interview && !answerError && <p role="status" className="text-sm text-fg-muted">Loading interview answers…</p>}
      {interview && !answers.length && <div className="rounded-xl border border-line-muted bg-surface-2 p-6 text-center"><BookOpen className="mx-auto size-6 text-fg-muted" aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold">No interview answers yet</h3><p className="mt-1 text-sm text-fg-muted">Your saved answers and their questions will appear here.</p>
        <Link href={`/build/${agent.id}/interview`} className={buttonClass("primary", "lg") + " mt-4 inline-flex"}>Start interview</Link></div>}
      {topAnswers.map(answer => <div key={answer.id} className="space-y-2">{renderAnswer(answer)}
        {answers.filter(detail => detail.parentAnswerId === answer.id).map(detail => <div key={detail.id} className="ml-4 border-l border-line-muted pl-4">{renderAnswer(detail, true)}</div>)}
      </div>)}
    </section>
    <section aria-labelledby="documents-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="documents-heading" className="text-base font-semibold">Documents</h2>
        <p className="text-xs text-fg-muted">{formatNumber(documents.length)} document sources</p></div>
        <button type="button" onClick={() => setIntakeOpen(true)} className={buttonClass("primary", "lg")}><Plus className="size-4" aria-hidden="true" />Add document</button></div>
      {overview && <p className="break-words text-xs text-fg-muted">Remaining: {formatNumber(overview.remaining.sources)} files · {formatNumber(overview.remaining.bytes)} bytes · {formatNumber(overview.remaining.chunks)} chunks</p>}
      {sourceError && <div role="alert" className="text-sm text-danger">Couldn&apos;t load documents: {sourceError} <button className="underline" onClick={() => setReload(value => value + 1)}>Retry</button></div>}
      {!overview && !sourceError && <p role="status" className="text-sm text-fg-muted">Loading documents…</p>}
      {overview && !documents.length && <div className="rounded-xl border border-line-muted bg-surface-2 p-6 text-center"><FileText className="mx-auto size-6 text-fg-muted" aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold">No documents added</h3><p className="mt-1 text-sm text-fg-muted">Documents are optional. Upload a file or paste text to add more knowledge.</p>
        <button type="button" onClick={() => setIntakeOpen(true)} className={buttonClass("primary", "lg") + " mt-4"}>Add document</button></div>}
      {documents.map(source => <article key={source.id} className="min-w-0 rounded-xl border border-line-muted bg-surface-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{source.name}</h3>
          <p className="mt-1 text-xs text-fg-muted">{source.kind.toUpperCase()} · {deletingId === source.id ? "Deleting source" : sourceStatus(source)}</p></div>
          <p className="text-xs tabular-nums text-fg-muted">Pages: {source.pageCount ?? "—"} · Chunks: {formatNumber(source.chunkCount)}</p></div>
        {source.progress && source.state !== "ready" && <p className="mt-2 text-xs text-fg-muted">Indexed {source.progress.completedBatches} of {source.progress.totalBatches} batches</p>}
        {(source.chargedUnits !== null || source.pendingUnits !== null) && <p className="mt-2 text-xs text-fg-muted">
          {source.chargedUnits !== null && <>Charged {formatCreditUnits(source.chargedUnits)}</>}
          {source.chargedUnits !== null && source.pendingUnits !== null && " · "}
          {source.pendingUnits !== null && <>Pending settlement {formatCreditUnits(source.pendingUnits)}</>}
        </p>}
        {source.error && <p className="mt-2 break-words text-xs text-danger">{source.error.message}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {source.state === "failed" && <button type="button" disabled={!!busyId || !!deletingId} className={buttonClass("secondary", "lg")} onClick={() => startRetry(source)}>Retry processing</button>}
          {(source.state === "queued" || source.state === "processing") && <button type="button" disabled={!!busyId || !!deletingId} className={buttonClass("secondary", "lg")} onClick={() => resume(source)}>Resume processing</button>}
          <button type="button" disabled={!!busyId || !!deletingId} className={buttonClass("destructive", "lg")} onClick={() => { setActionError(null); setDeleteId(source.id); }}>Delete source</button>
        </div>
      </article>)}
      {actionError && <div role="alert" className="rounded-xl border border-line-muted bg-surface-2 p-4 text-sm text-danger">{actionError} {needsCredits && <span className="mt-3 block"><AddCreditsButton size="sm" /> After adding credits, request a fresh estimate and confirm it.</span>}</div>}
      {busyId && <p role="status" className="text-xs text-fg-muted">Working on source…</p>}
    </section>
    <SourceIntake agentId={agent.id} open={intakeOpen} onOpenChange={setIntakeOpen} onComplete={refresh} />
    <Dialog open={!!retryReview} onOpenChange={open => { if (!open) setRetryReview(null); }}><DialogContent><DialogHeader><DialogTitle>Retry processing?</DialogTitle>
      <DialogDescription>Review the fresh estimate before processing {retrySource?.name ?? "this source"} again.</DialogDescription></DialogHeader>
      {retryReview && <div className="space-y-2 text-sm"><p>About {formatCreditUnits(retryReview.estimate.estimateUnits)}. Final cost depends on actual processing.</p>
        <p>Maximum hold: {formatCreditUnits(retryReview.estimate.maxUnits)} · Available: {formatCreditUnits(retryReview.estimate.walletAvailableUnits)}</p>
        <p>Remaining: {retryReview.estimate.remaining.sources} files · {formatNumber(retryReview.estimate.remaining.bytes)} bytes · {retryReview.estimate.remaining.chunks} chunks.</p>
        <p>Pages: {retryReview.estimate.projectedPageCount ?? "Available after processing"} · Chunks: {retryReview.estimate.projectedChunkCount ?? "Estimated after processing"}</p>
        <p className="text-xs text-fg-muted">Expires {new Date(retryReview.estimate.expiresAt).toLocaleTimeString()}.</p></div>}
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass("secondary", "lg")} onClick={() => setRetryReview(null)}>Keep source</button>
        <button type="button" disabled={!!busyId} className={buttonClass("primary", "lg")} onClick={confirmRetry}>Retry processing</button></div>
    </DialogContent></Dialog>
    <Dialog open={!!deleteId} onOpenChange={open => { if (!open && !deletingId) setDeleteId(null); }}><DialogContent><DialogHeader><DialogTitle>Delete {deleteSource?.name ?? "source"}?</DialogTitle>
      <DialogDescription>Its {deleteSource?.chunkCount ?? 0} chunks will stop being used in new answers. Historical citations remain.</DialogDescription></DialogHeader>
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={!!deletingId} className={buttonClass("secondary", "lg")} onClick={() => setDeleteId(null)}>Keep source</button>
        <button type="button" disabled={!!deletingId} className={buttonClass("destructive", "lg")} onClick={remove}>{deletingId ? "Deleting source…" : "Delete source"}</button></div>
    </DialogContent></Dialog>
  </main>;
}
