"use client";

import { useState } from "react";
import { ChevronDown, Globe2, Loader2 } from "lucide-react";
import type { ToolStep } from "@/lib/contracts/phase2";
import { cn } from "@/lib/utils";
import { processChipClass, safeExternalUrl } from "./chat";

const STATUS_LABEL: Record<ToolStep["status"], string> = { running: "Running", complete: "Complete", failed: "Failed" };

/** A step is shown when its start event arrives; later events update the same row. */
export function ToolSteps({ steps }: { steps: ToolStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const running = steps.some(step => step.status === "running");
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"}`;
  return <div className="mb-3 text-[13px]" data-testid="tool-steps">
    {running && <span role="status" aria-live="polite" className="sr-only">Searching online</span>}
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className={processChipClass}>
      {running ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Globe2 className="size-3.5" aria-hidden />}
      {running ? `Searching online · ${count}` : `Searched online · ${count}`}
      <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} aria-hidden />
    </button>
    {open && <ol className="mt-2.5 ml-3 max-w-[64ch] space-y-3 border-l border-line-subtle py-0.5 pl-4">
      {[...steps].sort((a, b) => a.sequence - b.sequence).map(step => {
        const href = step.url ? safeExternalUrl(step.url) : null;
        return <li key={step.id} className="relative min-w-0 break-words">
          <span aria-hidden className={cn("absolute top-[7px] -left-[20.5px] size-2 rounded-full ring-4 ring-background",
            step.status === "running" ? "animate-pulse bg-foreground" : step.status === "failed" ? "bg-danger" : "bg-fg-tertiary")} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-fg-secondary">{step.kind === "search" ? "Search web" : "Read page"}</span>
            <span className={cn("text-xs", step.status === "failed" ? "text-danger" : "text-fg-muted")}>{STATUS_LABEL[step.status]}</span>
          </div>
          {step.query && <div className="text-fg-muted">&ldquo;{step.query}&rdquo;</div>}
          {step.title && <div className="text-fg-tertiary">{step.title}</div>}
          {href && <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-xs break-all text-fg-muted underline decoration-line-outline underline-offset-2 hover:text-foreground">{href}</a>}
          {step.url && !href && <span className="text-xs text-fg-muted">Link unavailable</span>}
          {step.error && <div className="text-danger">{step.error}</div>}
        </li>;
      })}
    </ol>}
  </div>;
}
