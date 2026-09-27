"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, ChevronRight, Database, FileText, Paperclip, Plus, Search, ThumbsDown, ThumbsUp, X, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddCreditsButton } from "@/components/app/add-credits";
import { formatCredits, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Citation, Message } from "@/lib/types";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="mb-5 flex justify-end">
      <span className="max-w-[70%] rounded-xl bg-surface-2 px-4 py-3 text-base leading-[1.6] whitespace-pre-line">{content}</span>
    </div>
  );
}

/* Word-by-word reveal for a fresh reply (CHAT-01, simulated per Phase 3 D-01). Non-streamed messages render at once. */
const REVEAL_TOKENS_PER_TICK = 2;
const REVEAL_TICK_MS = 28;

/* Assistant turns are plain text, no bubble; [n] markers become citation chips with a hover card. */
export function AssistantMessage({
  content, citations = [], caption, stream = false, onStreamed,
}: { content: string; citations?: Citation[]; caption?: ReactNode; stream?: boolean; onStreamed?: () => void }) {
  const tokens = useMemo(() => content.split(/(?<=\s)/), [content]);
  const [revealed, setRevealed] = useState(stream ? 0 : tokens.length);
  useEffect(() => {
    if (!stream) return;
    const id = window.setInterval(() => {
      setRevealed((n) => {
        const next = Math.min(tokens.length, n + REVEAL_TOKENS_PER_TICK);
        if (next >= tokens.length) window.clearInterval(id);
        return next;
      });
    }, REVEAL_TICK_MS);
    return () => window.clearInterval(id);
  }, [stream, tokens.length]);
  const done = !stream || revealed >= tokens.length;
  useEffect(() => {
    if (stream && done) onStreamed?.();
  }, [stream, done, onStreamed]);
  const visible = done ? content : tokens.slice(0, revealed).join("");
  const parts = visible.split(/(\[\d+\])/g);
  return (
    <div className="mb-5" data-testid="assistant-message" data-streaming={done ? undefined : "true"} aria-busy={!done}>
      <div className="text-base leading-[1.6] whitespace-pre-line">
        {parts.map((part, i) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (!m) return <span key={i}>{part}</span>;
          const c = citations.find((x) => x.n === Number(m[1]));
          if (!c) return <span key={i}>{part}</span>;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <sup data-testid="citation" className="mx-0.5 cursor-help rounded bg-surface-3 px-[5px] text-xs text-selected-fg">{c.n}</sup>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="font-medium">{c.sourceName}</div>
                <div className="opacity-80">{c.page ? `Page ${c.page}${c.headingPath ? ` · ${c.headingPath}` : ""}` : c.question ? `Q: ${c.question}` : "Interview answer"}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {caption && done && <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">{caption}</div>}
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
export function RetrievedSources({ items }: { items: NonNullable<Message["retrieved"]> }) {
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
              <span className="text-selected-fg">[{i + 1}]</span>
              <span className="truncate">{r.sourceName}{r.page ? ` · page ${r.page}` : ""}{r.question ? ` · ${r.question}` : ""}</span>
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
      <span data-testid="message-cost">{formatCredits(message.costCents ?? 0)}</span>
      <ThumbsUp className={cn("size-3", message.feedback === "up" && "text-success")} />
      <ThumbsDown className={cn("size-3", message.feedback === "down" && "text-danger")} />
    </>
  );
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
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async () => {
    const t = text.trim();
    if (!t || busy || disabled) return;
    setBusy(true);
    try {
      if ((await onSend(t)) !== false) setText("");
    } finally {
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
            className="ml-auto grid size-6 place-items-center rounded-full bg-brand text-white disabled:opacity-40"
            aria-label="Send"
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
