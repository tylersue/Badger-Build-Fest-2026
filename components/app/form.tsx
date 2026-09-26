"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded border border-line-default bg-surface-2 px-2.5 py-2 text-sm text-foreground outline-none focus:border-brand-border disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium">
      <span>
        {label} {hint && <span className="text-xs font-normal text-fg-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, disabled, type = "text", name }: { value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; name?: string }) {
  return <input name={name} type={type} className={fieldClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, rows = 3, disabled, mono }: { value: string; onChange: (v: string) => void; rows?: number; disabled?: boolean; mono?: boolean }) {
  return <textarea className={cn(fieldClass, "resize-y", mono && "font-mono text-xs")} rows={rows} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

/* One item per line <-> string[] */
export function LinesInput({ value, onChange, rows = 3, disabled }: { value: string[]; onChange: (v: string[]) => void; rows?: number; disabled?: boolean }) {
  return <TextArea rows={rows} disabled={disabled} value={value.join("\n")} onChange={(v) => onChange(v.split("\n"))} />;
}
