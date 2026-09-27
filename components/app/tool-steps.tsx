"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Globe2 } from "lucide-react";
import type { ToolStep } from "@/lib/contracts/phase2";
import { safeExternalUrl } from "./chat";

/** A step is shown when its start event arrives; later events update the same row. */
export function ToolSteps({ steps }: { steps: ToolStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const running = steps.some(step => step.status === "running");
  return <div className="mb-3 text-sm">
    {running && <p role="status" aria-live="polite" className="mb-1 text-fg-muted">Searching online</p>}
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="inline-flex min-h-11 items-center gap-2 rounded bg-surface-2 px-3 text-fg-muted focus-visible:outline-2 focus-visible:outline-brand">
      <Globe2 className="size-4" /> Online steps ({steps.length})
      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
    </button>
    {open && <ol className="mt-2 space-y-2 rounded-lg border border-line-muted bg-surface-1 p-3">
      {[...steps].sort((a, b) => a.sequence - b.sequence).map(step => {
        const href = step.url ? safeExternalUrl(step.url) : null;
        return <li key={step.id} className="min-w-0 rounded bg-surface-2 p-2 break-words">
          <div className="font-medium">{step.kind === "search" ? "Search web" : "Read page"} · {step.status === "running" ? "Running" : step.status === "complete" ? "Complete" : "Failed"}</div>
          {step.query && <div>Query: {step.query}</div>}
          {step.title && <div>{step.title}</div>}
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="text-selected-fg underline break-all">{href}</a>}
          {step.url && !href && <span>Link unavailable</span>}
          {step.error && <div className="text-danger">{step.error}</div>}
        </li>;
      })}
    </ol>}
  </div>;
}
