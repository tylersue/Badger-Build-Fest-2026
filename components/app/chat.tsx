"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  ArrowUp, ChevronDown, FileText, Globe2, Paperclip, Plus, Search, X, Database, type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddCreditsButton } from "@/components/app/add-credits";
import { AnswerFeedback } from "@/components/trust/answer-feedback";
import { FlowWords } from "@/components/app/flow";
import { UNIT_LABEL, formatCredits, formatNumber } from "@/lib/format";
import type { Citation, Message } from "@/lib/types";
import type { EvidenceCitation, RetrievedChunk } from "@/lib/contracts/phase2";
import { formatCreditUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { retainDraftOnResult, type StreamCost } from "./chat-state";

export function safeExternalUrl(value: string): string | null {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

/* The hirer's turn: a raised bubble on the right, so it never reads as part of the agent's answer. */
export function UserMessage({ content }: { content: string }) {
  return (
    <div className="mb-8 flex justify-end" data-testid="user-message">
      <div className="max-w-[80%] rounded-xl rounded-br-sm border border-line-subtle bg-surface-3 px-4 py-2.5 text-[15px] leading-[1.6] break-words whitespace-pre-line text-foreground sm:max-w-[70%]">
        {content}
      </div>
    </div>
  );
}

type AnyCitation = Citation | EvidenceCitation;
const CITATION_MARKER = /(\[(?:\d+|(?:expert|web):[^\]\s]+)\])/g;

const citationNumber = (c: AnyCitation) => ("ordinal" in c ? c.ordinal : c.n);

/* Answer text as blocks: blank lines split paragraphs, and "1." / "-" lines become real lists. */
type Block = { kind: "p"; text: string } | { kind: "ol"; start: number; items: string[] } | { kind: "ul"; items: string[] };
function toBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  for (const paragraph of content.split(/\n{2,}/)) {
    let current: Block | null = null;
    for (const line of paragraph.split("\n")) {
      const ordered = /^\s*(\d+)[.)]\s+/.exec(line);
      const bullet = ordered ? null : /^\s*[-*•]\s+/.exec(line);
      if (ordered) {
        const text = line.slice(ordered[0].length);
        if (current?.kind === "ol") current.items.push(text);
        else { current = { kind: "ol", start: Number(ordered[1]) || 1, items: [text] }; blocks.push(current); }
      } else if (bullet) {
        const text = line.slice(bullet[0].length);
        if (current?.kind === "ul") current.items.push(text);
        else { current = { kind: "ul", items: [text] }; blocks.push(current); }
      } else if (current?.kind === "p") {
        current.text += `\n${line}`;
      } else {
        current = { kind: "p", text: line };
        blocks.push(current);
      }
    }
  }
  return blocks.filter(block => block.kind !== "p" || block.text.trim() !== "");
}

/* Arriving words ease in while citation chips retain their stable evidence IDs. */
export function AssistantMessage({
  content, citations = [], caption, flow = false, gap,
}: { content: string; citations?: Citation[] | EvidenceCitation[]; caption?: ReactNode; flow?: boolean; gap?: string | null }) {
  const [flowing] = useState(flow);
  const modern = citations.filter((item): item is EvidenceCitation => "evidenceId" in item);
  const legacy = citations.filter((item): item is Citation => "n" in item);
  const find = (marker: string): AnyCitation | undefined =>
    modern.find(item => item.evidenceId === marker) ?? modern.find(item => String(item.ordinal) === marker) ?? legacy.find(item => String(item.n) === marker);

  const inline = (text: string, prefix: string) => text.split(CITATION_MARKER).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]$/);
    const c = m ? find(m[1]) : undefined;
    if (!c) return <FlowWords key={`${prefix}-${i}`} text={part} flowing={flowing} />;
    const number = citationNumber(c);
    const isWeb = "evidenceId" in c && c.sourceType === "web";
    const url = isWeb ? safeExternalUrl(c.url) : null;
    // The expert's own essay or talk opens in the app; every other chip explains itself on hover.
    const published = !isWeb && c.url?.startsWith("/sources/") ? c.url : null;
    const chipClass = cn(
      "mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-px cursor-pointer items-center justify-center rounded-sm bg-citation-surface px-1 align-middle text-xs leading-none font-semibold tabular-nums text-citation transition-shadow hover:ring-1 hover:ring-citation/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
      flowing && "flow-word",
    );
    const label = `Source ${number}: ${c.sourceName}`;
    return (
      <Tooltip key={`${prefix}-${i}`}>
        <TooltipTrigger asChild>
          {published
            ? <Link href={published} data-testid="citation" aria-label={label} className={chipClass}>{number}</Link>
            : <button type="button" data-testid="citation" aria-label={label} className={chipClass}>{number}</button>}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs flex-col items-start gap-0 py-2 leading-snug">
          <div className="font-medium">{isWeb ? "Online source" : c.url ? "Published by the expert" : c.sourceType === "document" ? "Expert document" : "Expert interview"} · {!isWeb && c.url ? c.headingPath ?? c.sourceName : c.sourceName}</div>
          {!isWeb && !c.url && <div className="opacity-80">{c.page ? `Page ${c.page}${c.headingPath ? ` · ${c.headingPath}` : ""}` : c.question ? `Q: ${c.question}` : "Interview answer"}</div>}
          {"evidenceId" in c && <div className="mt-1 opacity-80">{c.excerpt}</div>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block underline">Open source</a>}
          {published && <div className="mt-1 opacity-80">Click to read the full piece</div>}
        </TooltipContent>
      </Tooltip>
    );
  });

  const blocks = toBlocks(content);
  return (
    <div className="mb-6 last:mb-0" data-testid="assistant-message">
      {gap && (
        <div role="note" data-testid="knowledge-gap" className="mb-4 flex gap-3 rounded-lg border border-warning/25 bg-warning-surface px-3.5 py-3">
          <Globe2 className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 text-[13px] leading-5">
            <p className="font-semibold text-warning">Knowledge gap</p>
            <p className="mt-0.5 text-fg-secondary">{gap} Online sources are separate from the expert&apos;s views.</p>
          </div>
        </div>
      )}
      {blocks.length > 0 && (
        <div className="max-w-[68ch] space-y-3.5 text-[15px] leading-[1.7] break-words text-fg-secondary">
          {blocks.map((block, b) =>
            block.kind === "p" ? (
              <p key={b} className="whitespace-pre-line">{inline(block.text, `${b}`)}</p>
            ) : block.kind === "ol" ? (
              <ol key={b} start={block.start} className="list-decimal space-y-1.5 pl-6 marker:text-fg-muted">
                {block.items.map((item, i) => <li key={i} className="pl-1">{inline(item, `${b}-${i}`)}</li>)}
              </ol>
            ) : (
              <ul key={b} className="list-disc space-y-1.5 pl-6 marker:text-fg-muted">
                {block.items.map((item, i) => <li key={i} className="pl-1">{inline(item, `${b}-${i}`)}</li>)}
              </ul>
            ),
          )}
        </div>
      )}
      {caption && <div data-testid="answer-meta" className="mt-3 flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">{caption}</div>}
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

/** The quiet process chip above an answer (retrieval, online steps). */
export const processChipClass =
  "inline-flex h-7 items-center gap-1.5 rounded-full border border-line-subtle bg-surface-1 px-2.5 text-xs text-fg-tertiary transition-colors hover:border-line-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none";

/* Fleet-style collapsible tool chip listing retrieved chunks and scores (SBOX-02). */
export function RetrievedSources({ items }: { items: NonNullable<Message["retrieved"]> | RetrievedChunk[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button type="button" aria-expanded={open} disabled={items.length === 0} onClick={() => setOpen(!open)} className={processChipClass}>
        <Search className="size-3.5" aria-hidden />
        {items.length === 0 ? "No expert sources retrieved" : `Retrieved ${items.length} ${items.length === 1 ? "source" : "sources"}`}
        {items.length > 0 && <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} aria-hidden />}
      </button>
      {open && items.length > 0 && (
        <ol className="mt-2 max-w-[68ch] divide-y divide-line-subtle overflow-hidden rounded-lg border border-line-subtle bg-surface-1 text-xs">
          {items.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2">
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-fg-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-fg-secondary">
                  {r.sourceName}
                  <span className="text-fg-muted">{r.page ? ` · page ${r.page}` : ""}{r.question ? ` · ${r.question}` : ""}</span>
                </div>
                {"content" in r && <p className="mt-0.5 line-clamp-2 text-fg-muted">{r.content}</p>}
              </div>
              <span className="shrink-0 tabular-nums text-fg-muted">score {r.score.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function CostCaption({ message }: { message: Message }) {
  return (
    <>
      <span data-testid="message-cost" className="tabular-nums">{message.costCents === null ? "Charge pending" : message.costCents === 0 ? "Included with your purchase" : `Charged ${formatCredits(message.costCents)}`}</span>
      <AnswerFeedback message={message} />
    </>
  );
}

export function StreamCostCaption({ cost, estimateUnits }: { cost?: StreamCost | null; estimateUnits?: string | null }) {
  if (cost?.status === "settled" && cost.chargedUnits === "0") return <span>Included with your purchase</span>;
  if (cost?.status === "settled" && cost.chargedUnits !== null) return <span className="tabular-nums">Charged {formatCreditUnits(cost.chargedUnits)}</span>;
  if (cost?.status === "pending") return <span className="tabular-nums">Charge pending · Estimated {formatCreditUnits(cost.estimateUnits)}</span>;
  return estimateUnits ? <span className="tabular-nums">Estimated {formatCreditUnits(estimateUnits)}</span> : <span>Charge pending</span>;
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
    <div className="flex shrink-0 justify-center px-4 pt-2 pb-4">
      <div className="flex min-h-24 w-full max-w-[752px] flex-col gap-2.5 rounded-xl border border-line-default bg-surface-2 px-4 pt-3 pb-3 transition-colors focus-within:border-line-outline">
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
          className="resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-fg-muted disabled:opacity-60"
        />
        <div className="mt-auto flex flex-wrap items-center gap-2 text-fg-muted">
          {onAttach ? (
            attachment ? (
              <span data-testid="attachment-chip" className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-line-subtle bg-surface-3 px-2.5 text-xs text-fg-secondary">
                <FileText className="size-3.5 shrink-0 text-fg-tertiary" />
                <span className="max-w-[240px] truncate font-medium">{attachment.name}</span>
                <span className="hidden text-fg-muted sm:inline">· {formatNumber(attachment.chars)} chars · untrusted</span>
                {onRemoveAttachment && (
                  <button type="button" aria-label="Remove file" onClick={onRemoveAttachment}
                    className="-mr-1 ml-0.5 grid size-5 place-items-center rounded-sm text-fg-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-outline bg-surface-1 px-2.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                >
                  <Paperclip className="size-3.5" />
                  {attaching ? "Reading file…" : "Attach a file"}
                </button>
                {!attaching && <span className="hidden text-xs text-fg-muted sm:inline">PDF, DOCX, TXT or MD · one per chat</span>}
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
            className="ml-auto grid size-8 place-items-center rounded-full bg-brand text-primary-foreground transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
            aria-label={sendLabel}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Pre-call reservation refused (D-10). */
export function NotEnoughCredits({ needed, available, onDismiss }: { needed: number; available: number; onDismiss: () => void }) {
  return (
    <div data-testid="not-enough-credits" className="mb-8 rounded-lg border border-warning/25 bg-warning-surface p-4">
      <div className="text-sm font-semibold text-warning">Not enough {UNIT_LABEL}</div>
      <p className="mt-1 text-[13px] text-fg-secondary">
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
      <div className="w-full max-w-[752px] px-4 pt-6 pb-4">{children}</div>
    </div>
  );
}
