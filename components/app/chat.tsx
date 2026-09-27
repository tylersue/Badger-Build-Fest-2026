"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, ChevronRight, Database, Paperclip, Plus, Search, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { AddCreditsButton } from "@/components/app/add-credits";
import { formatCredits, formatCreditUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Citation, Message } from "@/lib/types";
import type { EvidenceCitation, RetrievedChunk } from "@/lib/contracts/phase2";
import { evidenceGroups, retainDraftOnResult, type StreamCost } from "./chat-state";

export function safeExternalUrl(value: string): string | null {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="mb-5 flex justify-end">
      <span className="max-w-[70%] rounded-xl bg-surface-2 px-4 py-3 text-base leading-[1.6] whitespace-pre-line">{content}</span>
    </div>
  );
}

/* Native disclosures make citations available to click, touch and keyboard. */
export function AssistantMessage({ content, citations = [], caption, gap }: { content: string; citations?: Citation[] | EvidenceCitation[]; caption?: ReactNode; gap?: string | null }) {
  const modern = citations.filter((c): c is EvidenceCitation => "evidenceId" in c);
  const legacy = citations.filter((c): c is Citation => "n" in c);
  const parts = content.split(/(\[(?:\d+|(?:expert|web):[^\]\s]+)\])/g);
  return (
    <div className="mb-5">
      <div className="text-base leading-[1.6] whitespace-pre-line">
        {parts.map((part, i) => {
          const m = part.match(/^\[([^\]]+)\]$/);
          if (!m) return <span key={i}>{part}</span>;
          const c = modern.find(x => x.evidenceId === m[1]) ?? legacy.find(x => String(x.n) === m[1]);
          if (!c) return <span key={i}>{part}</span>;
          return (
            <details key={i} className="relative inline-block align-baseline text-sm whitespace-normal">
              <summary className="mx-0.5 cursor-pointer rounded bg-surface-3 px-1.5 py-1 text-xs text-selected-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={`Citation ${"ordinal" in c ? c.ordinal : c.n}: ${c.sourceName}`}>
                [{"ordinal" in c ? c.ordinal : c.n}]
              </summary>
              <div className="absolute z-20 mt-1 w-72 max-w-[85vw] rounded-lg border border-line-muted bg-surface-1 p-3 shadow-lg">
                <EvidenceDetail citation={c} />
              </div>
            </details>
          );
        })}
      </div>
      {gap && <p className="mt-3 rounded-lg border border-warning/40 bg-warning-surface/20 p-3 text-sm">Knowledge gap: {gap} This part uses online sources, not the expert&apos;s own views.</p>}
      {modern.length > 0 && <SupportingSources citations={modern} />}
      {caption && <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">{caption}</div>}
    </div>
  );
}

function EvidenceDetail({ citation }: { citation: Citation | EvidenceCitation }) {
  const modern = "evidenceId" in citation;
  const online = modern && citation.sourceType === "web";
  const sourceType = citation.sourceType;
  const label = online ? "Online source" : sourceType === "document" ? "Expert · Document" : "Expert · Interview";
  const url = online ? safeExternalUrl(citation.url) : null;
  return <div className="space-y-1 break-words">
    <div className="font-semibold">{label}</div>
    <div>{citation.sourceName}</div>
    {online && <div>{citation.title}</div>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-selected-fg underline break-all">{url}</a>}
    {!online && <div className="text-fg-muted">{citation.page ? `Page ${citation.page}` : citation.question ? `Question: ${citation.question}` : "Interview answer"}{citation.headingPath ? ` · ${citation.headingPath}` : ""}</div>}
    {modern && <p className="text-fg-muted">{citation.excerpt}</p>}
    {modern && !online && citation.historical && <p className="text-fg-muted">Source deleted · historical citation</p>}
  </div>;
}

function SupportingSources({ citations }: { citations: EvidenceCitation[] }) {
  const groups = evidenceGroups(citations);
  return <div className="mt-3 flex flex-wrap gap-3 text-xs text-fg-muted">
    {([['Expert sources', groups.expert], ['Online sources', groups.online]] as const).map(([label, group]) => group.length > 0 &&
      <div key={label}><span className="font-medium">{label}:</span> {group.map(c => c.sourceName).join(", ")}</div>)}
  </div>;
}

export function ToolChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
      <Icon className="size-3" />
      {label}
    </div>
  );
}

/* Fleet-style collapsible tool chip listing retrieved chunks and scores (SBOX-02). */
export function RetrievedSources({ items }: { items: NonNullable<Message["retrieved"]> | RetrievedChunk[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-1.5 rounded bg-surface-2 px-3 py-1 text-xs text-fg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand">
        <Search className="size-3" />
        Retrieved sources ({items.length})
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1 rounded-lg border border-line-muted bg-surface-1 p-2 text-xs">
          {items.length === 0 && <p>No matching expert sources. The expert&apos;s saved material did not cover this question.</p>}
          {items.map((r, i) => (
            <div key={"id" in r ? r.id : i} className="min-w-0 rounded bg-surface-2 p-2">
              <div className="font-medium break-words">{r.sourceName}{r.page ? ` · page ${r.page}` : ""}{"headingPath" in r && r.headingPath ? ` · ${r.headingPath}` : ""}</div>
              {r.question && <div className="mt-1 break-words">Question: {r.question}</div>}
              {"content" in r && <p className="mt-1 whitespace-pre-wrap break-words text-fg-muted">{r.content}</p>}
              <div className="mt-1 tabular-nums text-fg-muted">Relevance score {Number.isFinite(r.score) ? r.score.toFixed(2) : "unavailable"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CostCaption({ message }: { message: Message }) {
  return (
    <>
      <span>{message.costCents === null ? "Charge pending" : `Charged ${formatCredits(message.costCents)}`}</span>
      <ThumbsUp className={cn("size-3", message.feedback === "up" && "text-success")} />
      <ThumbsDown className={cn("size-3", message.feedback === "down" && "text-danger")} />
    </>
  );
}

export function StreamCostCaption({ cost, estimateUnits }: { cost?: StreamCost | null; estimateUnits?: string | null }) {
  if (cost?.status === "settled" && cost.chargedUnits !== null) return <span>Charged {formatCreditUnits(cost.chargedUnits)}</span>;
  if (cost?.status === "pending") return <span>Charge pending · Estimated {formatCreditUnits(cost.estimateUnits)}</span>;
  return estimateUnits ? <span>Estimated {formatCreditUnits(estimateUnits)}</span> : <span>Charge pending</span>;
}

export function SavedChip({ credits }: { credits: number }) {
  return <ToolChip icon={Database} label={`Saved as knowledge · 1 chunk · ${formatCredits(credits)}`} />;
}

/* Composer: 96px min height, 12px radius, surface-2 (UI-SPEC). Enter sends, Shift+Enter breaks a line.
   onSend returns false when the call was refused, so the typed text is kept. */
export function Composer({ placeholder, onSend, disabled, attach, hint, draft, onError, sendLabel = "Send message" }: { placeholder: string; onSend: (text: string) => Promise<boolean> | boolean; disabled?: boolean; attach?: boolean; hint?: ReactNode; draft?: { value: string; onChange: (value: string) => void }; onError?: (error: unknown) => void; sendLabel?: string }) {
  const [localText, setLocalText] = useState("");
  const text = draft ? draft.value : localText;
  const setText = draft ? draft.onChange : setLocalText;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const submit = async () => {
    const t = text.trim();
    if (!t || busyRef.current || disabled) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const acknowledged = (await onSend(t)) !== false;
      if (text === t) setText(retainDraftOnResult(acknowledged, text));
    } catch (error) {
      onError?.(error);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="flex shrink-0 justify-center px-4 pt-3 pb-4">
      <div className="flex min-h-24 w-full max-w-[752px] flex-col gap-3 rounded-xl border border-line-subtle bg-surface-2 p-4">
        <textarea
          data-testid="composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled}
          aria-label={placeholder}
          rows={2}
          placeholder={busy ? "Send a message to queue it up…" : placeholder}
          className="resize-none bg-transparent text-[15px] outline-none placeholder:text-fg-muted disabled:opacity-60"
        />
        <div className="mt-auto flex items-center gap-2.5 text-fg-muted">
          {attach ? (
            <>
              <Paperclip className="size-4" />
              <span className="text-xs">Upload one file (PDF, DOCX, TXT)</span>
            </>
          ) : (
            <Plus className="size-4" />
          )}
          {hint && <span className="text-xs">{hint}</span>}
          <button
            data-testid="composer-send"
            onClick={() => void submit()}
            disabled={disabled || busy || !text.trim()}
            className="ml-auto grid size-11 place-items-center rounded-full bg-brand text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label={sendLabel}
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Pre-call reservation refused (D-10). */
export function NotEnoughCredits({ needed, available, onDismiss }: { needed: number; available: number; onDismiss: () => void }) {
  return (
    <div data-testid="not-enough-credits" className="mb-5 rounded-xl border border-warning/40 bg-warning-surface/40 p-4">
      <div className="text-sm font-semibold">Not enough credits</div>
      <p className="mt-1 text-[13px] text-fg-tertiary">
        This needs about {formatCredits(needed)}; you have {formatCredits(available)}. Add credits to continue.
      </p>
      <div className="mt-3 flex gap-2">
        <AddCreditsButton size="sm" />
        <button onClick={onDismiss} className="h-6 px-2 text-[13px] text-fg-muted hover:text-foreground">
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function ChatColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
      <div className="w-full max-w-[752px] px-4 pt-4">{children}</div>
    </div>
  );
}
