"use client";

import { useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, ChevronRight, Database, Paperclip, Plus, Search, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddCreditsButton } from "@/components/app/add-credits";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Citation, Message } from "@/lib/types";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="mb-5 flex justify-end">
      <span className="max-w-[70%] rounded-xl bg-surface-2 px-4 py-3 text-base leading-[1.6] whitespace-pre-line">{content}</span>
    </div>
  );
}

/* Assistant turns are plain text, no bubble; [n] markers become citation chips with a hover card. */
export function AssistantMessage({ content, citations = [], caption }: { content: string; citations?: Citation[]; caption?: ReactNode }) {
  const parts = content.split(/(\[\d+\])/g);
  return (
    <div className="mb-5">
      <div className="text-base leading-[1.6] whitespace-pre-line">
        {parts.map((part, i) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (!m) return <span key={i}>{part}</span>;
          const c = citations.find((x) => x.n === Number(m[1]));
          if (!c) return <span key={i}>{part}</span>;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <sup className="mx-0.5 cursor-help rounded bg-surface-3 px-[5px] text-xs text-selected-fg">{c.n}</sup>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="font-medium">{c.sourceName}</div>
                <div className="opacity-80">{c.page ? `Page ${c.page}${c.headingPath ? ` · ${c.headingPath}` : ""}` : c.question ? `Q: ${c.question}` : "Interview answer"}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
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
      <span>{formatCredits(message.costCents ?? 0)}</span>
      <ThumbsUp className={cn("size-3", message.feedback === "up" && "text-success")} />
      <ThumbsDown className={cn("size-3", message.feedback === "down" && "text-danger")} />
    </>
  );
}

export function SavedChip({ credits }: { credits: number }) {
  return <ToolChip icon={Database} label={`Saved as knowledge · 1 chunk · ${formatCredits(credits)}`} />;
}

/* Composer: 96px min height, 12px radius, surface-2 (UI-SPEC). Enter sends, Shift+Enter breaks a line.
   onSend returns false when the call was refused, so the typed text is kept. */
export function Composer({ placeholder, onSend, disabled, attach, hint }: { placeholder: string; onSend: (text: string) => Promise<boolean> | boolean; disabled?: boolean; attach?: boolean; hint?: ReactNode }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
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
