"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { Orb } from "@/components/app/orb";
import { AgentTile } from "@/components/app/ui";
import { captionWindow, planSpeech, spokenPrefix, type CaptionWindow } from "@/features/runtime/speech";
import { cn } from "@/lib/utils";

/*
 * The shared "talking to an AI" pieces, for every AI conversation in the app:
 * - useVoice reveals the agent's current line one word at a time (thinking → speaking → done).
 * - VoiceStage (interview): a large orb in the middle that changes shape with what the agent is
 *   doing, the current line captioned under it, transcript and composer below.
 * - AgentTurn (chats): a small orb loads inline as if the agent were typing, the answer types
 *   out beside it, and the orb freezes once the answer is complete.
 */

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

export type Utterance = {
  /** Changing the id starts a new line; the same id never re-speaks. */
  id: string;
  text: string;
  /** false shows the line at once (a reply that was already in the transcript). */
  speak: boolean;
  /** Hold the thinking state this long before the first word. */
  leadMs?: number;
};

/* One design throughout: the spherical Rubik's cube ("solving": bands scramble in quarter turns,
   then click back solved). Only the pace changes with what the agent is doing. */
const ORB: Record<VoiceStatus, { state: OrbState; speed: number }> = {
  idle: { state: "solving", speed: 0.45 },
  listening: { state: "solving", speed: 0.7 },
  thinking: { state: "solving", speed: 1.7 },
  speaking: { state: "solving", speed: 1 },
};

const DEFAULT_LABELS: Record<VoiceStatus, string> = {
  idle: "Ready",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

export function useVoice(utterance: Utterance | null, input: { busy?: boolean; focused?: boolean } = {}) {
  const id = utterance?.id ?? null;
  const text = utterance?.text ?? "";
  const speak = !!utterance?.speak;
  const leadMs = utterance?.leadMs ?? 0;
  const plan = useMemo(() => planSpeech(text), [text]);
  const [progress, setProgress] = useState<{ id: string; shown: number } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!id || !speak) return;
    timers.current = plan.startsAt.map((at, i) => window.setTimeout(() => setProgress({ id, shown: i + 1 }), leadMs + at));
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [id, speak, leadMs, plan]);

  const total = plan.words.length;
  const shown = !id ? 0 : progress?.id === id ? Math.min(progress.shown, total) : speak ? 0 : total;
  const speaking = shown > 0 && shown < total;
  const pending = speak && total > 0 && shown === 0;
  const status: VoiceStatus = input.busy || pending ? "thinking" : speaking ? "speaking" : input.focused ? "listening" : "idle";

  const skip = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (id) setProgress({ id, shown: total });
  };

  return {
    status,
    /** Two caption lines for the stage (citation markers left out). */
    caption: captionWindow(plan.words, shown),
    /** The reply text revealed so far, verbatim, for the transcript. */
    spoken: spokenPrefix(text, plan, shown),
    speaking,
    done: shown >= total,
    skip,
  };
}

export type TurnPhase = "thinking" | "typing" | "done";

/** Which phase an inline turn is in, from the hook's status. */
export function turnPhase(voice: { status: VoiceStatus; speaking: boolean }): TurnPhase {
  return voice.status === "thinking" ? "thinking" : voice.speaking ? "typing" : "done";
}

/* One agent answer in a chat. The header row carries the orb (the package's own 32px avatar
   preset): fast while searching, steady while the answer types out, frozen once it is done. */
export function AgentTurn({
  name, phase, label, onSkip, children,
}: {
  name: string;
  phase: TurnPhase;
  /** Status shown while live, e.g. "Searching Maria's answers…" or "Typing…". */
  label?: string;
  onSkip?: () => void;
  children?: ReactNode;
}) {
  const live = phase !== "done";
  return (
    <div data-testid="agent-turn" data-phase={phase} className={cn(!children && "mb-5")}>
      <button
        type="button"
        onClick={onSkip}
        disabled={!live}
        aria-label={live ? "Show the whole reply now" : undefined}
        className="mb-1.5 flex items-center gap-2 text-xs text-fg-muted disabled:cursor-default"
      >
        <ThinkingOrb state="solving" size={32} theme="dark" speed={phase === "thinking" ? 1.8 : 1} paused={!live} aria-label={live ? (label ?? "Working…") : `${name}'s reply`} />
        <span className="font-medium text-fg-tertiary">{name}</span>
        {live && label && <span>{label}</span>}
      </button>
      {children}
    </div>
  );
}

const DOT: Record<VoiceStatus, string> = {
  idle: "bg-fg-muted",
  listening: "bg-selected-fg",
  thinking: "bg-warning animate-pulse",
  speaking: "bg-success animate-pulse",
};

export function VoiceStage({
  status, caption, name, icon, labels, onSkip, children,
}: {
  status: VoiceStatus;
  caption: CaptionWindow;
  name: string;
  icon: string;
  labels?: Partial<Record<VoiceStatus, string>>;
  onSkip?: () => void;
  children?: ReactNode;
}) {
  const label = labels?.[status] ?? DEFAULT_LABELS[status];
  const speaking = status === "speaking";
  return (
    <section data-testid="voice-stage" data-status={status} className="flex shrink-0 flex-col items-center px-4 pt-5 pb-3 text-center">
      <button
        type="button"
        onClick={onSkip}
        disabled={!speaking}
        aria-label={speaking ? "Show the whole reply now" : undefined}
        className="relative rounded-full disabled:cursor-default"
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-4 rounded-full blur-2xl transition-opacity duration-700",
            speaking ? "bg-selected-fg/20 opacity-100" : status === "thinking" ? "bg-warning/15 opacity-100" : "opacity-0",
          )}
        />
        <Orb state={ORB[status].state} speed={ORB[status].speed} className="relative" label={`${name}: ${label}`} />
      </button>

      <div className="mt-3 flex w-full max-w-[640px] flex-col items-center">
        <p className="min-h-5 text-[13px] leading-5 text-fg-muted line-clamp-2">{caption.previous}</p>
        <p data-testid="voice-caption" className="mt-1 min-h-7 text-[17px] leading-7 font-medium">
          {caption.current || <span className="font-normal text-fg-muted">{status === "thinking" ? "…" : ""}</span>}
          {speaking && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[2px] animate-pulse bg-fg-muted" />}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
        <span className={cn("size-1.5 rounded-full", DOT[status])} />
        <span>{label}</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5 text-fg-tertiary">
          <AgentTile icon={icon} size="xs" />
          {name}
        </span>
      </div>
      {children}
    </section>
  );
}
