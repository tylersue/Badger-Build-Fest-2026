"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, ChevronRight, Database, FileText, Paperclip, Plus, Search, X, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddCreditsButton } from "@/components/app/add-credits";
import { AnswerFeedback } from "@/components/trust/answer-feedback";
import { FlowWords } from "@/components/app/flow";
import { formatCredits, formatNumber } from "@/lib/format";
import type { Citation, Message } from "@/lib/types";
import type { EvidenceCitation, RetrievedChunk } from "@/lib/contracts/phase2";
import { formatCreditUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
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

/* Arriving words ease in while citation chips retain their stable evidence IDs. */
export function AssistantMessage({
  content, citations = [], caption, flow = false, gap,
}: { content: string; citations?: Citation[] | EvidenceCitation[]; caption?: ReactNode; flow?: boolean; gap?: string | null }) {
  const [flowing] = useState(flow);
  const parts = content.split(/(\[(?:\d+|(?:expert|web):[^\]\s]+)\])/g);
  const modern = citations.filter((item): item is EvidenceCitation => "evidenceId" in item);
  const legacy = citations.filter((item): item is Citation => "n" in item);
  return (
    <div className="mb-5" data-testid="assistant-message">
      <div className="text-base leading-[1.6] whitespace-pre-line">
        {parts.map((part, i) => {
          const m = part.match(/^\[([^\]]+)\]$/);
          if (!m) return <FlowWords key={i} text={part} flowing={flowing} />;
          const c = modern.find(item => item.evidenceId === m[1]) ?? legacy.find(item => String(item.n) === m[1]);
          if (!c) return <FlowWords key={i} text={part} flowing={flowing} />;
          const number = "ordinal" in c ? c.ordinal : c.n;
          const online = "evidenceId" in c && c.sourceType === "web";
          const url = online ? safeExternalUrl(c.url) : null;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <sup data-testid="citation" className={cn("mx-0.5 cursor-help rounded bg-citation-surface px-[5px] text-xs font-semibold text-citation", flowing && "flow-word")}>{number}</sup>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="font-medium">{online ? "Online source" : c.sourceType === "document" ? "Expert document" : "Expert interview"} · {c.sourceName}</div>
                {!online && <div className="opacity-80">{c.page ? `Page ${c.page}${c.headingPath ? ` · ${c.headingPath}` : ""}` : c.question ? `Q: ${c.question}` : "Interview answer"}</div>}
                {"evidenceId" in c && <div className="mt-1 opacity-80">{c.excerpt}</div>}
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block underline">Open source</a>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {gap && <p className="mt-3 rounded-lg border border-warning/40 bg-warning-surface/20 p-3 text-sm">Knowledge gap: {gap} Online sources are separate from the expert&apos;s views.</p>}
      {modern.length > 0 && <div className="mt-3 text-xs text-fg-muted">{([['Expert sources', evidenceGroups(modern).expert], ['Online sources', evidenceGroups(modern).online]] as const).map(([label, group]) => group.length > 0 && <span key={label} className="mr-3">{label}: {group.map(item => item.sourceName).join(", ")}</span>)}</div>}
      {caption && <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">{caption}</div>}
    </div>
  );
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
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded bg-surface-2 px-2 py-0.5 text-xs text-fg-muted hover:text-foreground">
        <Search className="size-3" />
        Retrieved {items.length} {items.length === 1 ? "source" : "sources"}
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1 rounded-lg border border-line-muted bg-surface-1 p-2 text-xs">
          {items.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-semibold text-citation">[{i + 1}]</span>
              <span className="truncate">{r.sourceName}{r.page ? ` · page ${r.page}` : ""}{r.question ? ` · ${r.question}` : ""}{"content" in r ? ` · ${r.content.slice(0, 100)}` : ""}</span>
              <span className="ml-auto tabular-nums text-fg-muted">score {r.score.toFixed(2)}</span>
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
      <span data-testid="message-cost">{message.costCents === null ? "Charge pending" : `Charged ${formatCredits(message.costCents)}`}</span>
      <AnswerFeedback message={message} />
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

export type Attachment = { name: string; chars: number };

/* Composer: 96px min height, 12px radius, surface-2 (UI-SPEC). Enter sends, Shift+Enter breaks a line.
   onSend returns false when the call was refused, so the typed text is kept.
   With onAttach set, the footer offers one file per conversation (CHAT-04).
   onFocusChange lets the voice stage show listening while the field is active.
   A non-streamed message always shows its whole current content, so a caller may grow it word by word. */
export function Composer({
  placeholder, onSend, disabled, hint, attachment, onAttach, onRemoveAttachment, attaching, attachError, onFocusChange,
  draft, onError, sendLabel = "Send message",
}: {
  placeholder: string;
  onSend: (text: string) => Promise<boolean> | boolean;
  disabled?: boolean;
  hint?: ReactNode;
  attachment?: Attachment | null;
  onAttach?: (file: File) => Promise<void>;
  onRemoveAttachment?: () => void;
  attaching?: boolean;
  attachError?: string | null;
  onFocusChange?: (focused: boolean) => void;
  draft?: { value: string; onChange: (value: string) => void };
  onError?: (error: unknown) => void;
  sendLabel?: string;
}) {
  const [localText, setLocalText] = useState("");
  const text = draft?.value ?? localText;
  const setText = draft?.onChange ?? setLocalText;
  const textRef = useRef(text);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async () => {
    const t = textRef.current.trim();
    if (!t || busy || disabled) return;
    setBusy(true);
    try {
      const acknowledged = (await onSend(t)) !== false;
      if (textRef.current === t) {
        const next = retainDraftOnResult(acknowledged, textRef.current);
        textRef.current = next; setText(next);
      }
    } catch (error) {
      if (onError) onError(error);
      else setSendError(error instanceof Error ? error.message : "Could not send. Your draft is still here.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex shrink-0 justify-center px-4 pt-3 pb-4">
      <div className="flex min-h-24 w-full max-w-[752px] flex-col gap-3 rounded-xl border border-line-subtle bg-surface-2 p-4">
        {sendError && <p role="alert" className="text-sm text-danger">{sendError}</p>}
        <textarea
          data-testid="composer-input"
          value={text}
          onChange={(e) => { textRef.current = e.target.value; setText(e.target.value); setSendError(null); }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled}
          rows={2}
          placeholder={busy ? "Send a message to queue it up…" : placeholder}
          className="resize-none bg-transparent text-[15px] outline-none placeholder:text-fg-muted disabled:opacity-60"
        />
        <div className="mt-auto flex flex-wrap items-center gap-2.5 text-fg-muted">
          {onAttach ? (
            attachment ? (
              <span data-testid="attachment-chip" className="inline-flex items-center gap-1.5 rounded bg-surface-3 px-2 py-0.5 text-xs text-fg-secondary">
                <FileText className="size-3" />
                <span className="max-w-[240px] truncate">{attachment.name}</span>
                <span className="text-fg-muted">· {formatNumber(attachment.chars)} chars · untrusted</span>
                {onRemoveAttachment && (
                  <button type="button" aria-label="Remove file" onClick={onRemoveAttachment} className="ml-0.5 hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ) : (
              <>
                <input
                  ref={fileRef}
                  data-testid="attach-input"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) await onAttach(file);
                  }}
                />
                <button
                  type="button"
                  data-testid="attach-file"
                  disabled={disabled || attaching}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs hover:text-foreground disabled:opacity-60"
                >
                  <Paperclip className="size-4" />
                  {attaching ? "Reading file…" : "Attach one file (PDF, DOCX, TXT, MD)"}
                </button>
              </>
            )
          ) : (
            <Plus className="size-4" />
          )}
          {attachError && <span data-testid="attach-error" className="text-xs text-danger">{attachError}</span>}
          {hint && <span className="text-xs">{hint}</span>}
          <button
            data-testid="composer-send"
            onClick={() => void submit()}
            disabled={disabled || busy || !text.trim()}
            className="ml-auto grid size-6 place-items-center rounded-full bg-brand text-primary-foreground disabled:opacity-40"
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
