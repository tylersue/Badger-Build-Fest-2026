"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OrbState } from "thinking-orbs";
import { Orb, type OrbMood } from "@/components/app/orb";
import { currentIdentity, useDemo } from "@/lib/demo-store";
import { planSpeech, shownAt, spokenPrefix } from "@/features/runtime/speech";
import { cn } from "@/lib/utils";

/*
 * The shared "talking to an AI" pieces, for every AI conversation in the app:
 * - useVoice flows the agent's current line in on one animation-frame clock (thinking → speaking → done).
 * - ThinkingPill: the thinking-orbs "composing" orb (an undulating multi-band sash) in a dark pill
 *   with a shimmering status label, as in the library's demo (libraries.dev/orbs), at the top of a
 *   chat answer. The interview shows the same orb on its own, large (app/(app)/build/[agentId]/interview).
 * - AgentTurn (chats): the compact pill while the agent searches and writes; a small orb and the
 *   agent's name once the answer is complete. Both rows are 40px, so nothing jumps when it settles.
 * Every orb breathes with its mood (components/app/orb.tsx): slow while listening, quick while talking.
 * Its design follows who is viewing (useOrbDesign): the expert sees "composing", a hirer the Rubik's cube.
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

export function useVoice(utterance: Utterance | null, input: { busy?: boolean; focused?: boolean } = {}) {
  const id = utterance?.id ?? null;
  const text = utterance?.text ?? "";
  const speak = !!utterance?.speak;
  const leadMs = utterance?.leadMs ?? 0;
  const plan = useMemo(() => planSpeech(text), [text]);
  const [progress, setProgress] = useState<{ id: string; shown: number } | null>(null);
  const cancel = useRef<() => void>(() => {});

  useEffect(() => {
    if (!id || !speak) return;
    // One clock for the whole line: each frame works out how many words are due, so the stream
    // never bunches up the way a queue of per-word timers does.
    const start = performance.now() + leadMs;
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const n = shownAt(plan, now - start);
      if (n !== last) {
        last = n;
        setProgress({ id, shown: n });
      }
      if (n < plan.words.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cancel.current = () => cancelAnimationFrame(raf);
    return () => cancelAnimationFrame(raf);
  }, [id, speak, leadMs, plan]);

  const total = plan.words.length;
  const shown = !id ? 0 : progress?.id === id ? Math.min(progress.shown, total) : speak ? 0 : total;
  const speaking = shown > 0 && shown < total;
  const pending = speak && total > 0 && shown === 0;
  const status: VoiceStatus = input.busy || pending ? "thinking" : speaking ? "speaking" : input.focused ? "listening" : "idle";

  const skip = () => {
    cancel.current();
    if (id) setProgress({ id, shown: total });
  };

  return {
    status,
    /** The line revealed so far, verbatim (paragraph breaks and citation markers kept). */
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

/** The orb design for whoever is viewing: an undulating sash ("composing") for the expert building an
    agent, the spherical Rubik's cube ("solving": bands scramble, then click back solved) for a hirer. */
export function useOrbDesign(): OrbState {
  const s = useDemo();
  return currentIdentity(s).kind === "expert" ? "composing" : "solving";
}

export function ThinkingPill({ label, mood }: { label: string; mood: OrbMood }) {
  const design = useOrbDesign();
  return (
    <span
      data-testid="thinking-pill"
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[50px] border border-line-subtle bg-sidebar pr-4 pl-1 text-[13px] leading-5"
    >
      <Orb state={design} mood={mood} size={32} label={label} />
      <span className="shimmer" data-text={label}>
        {label}
      </span>
    </span>
  );
}

/* One agent answer in a chat: the compact pill while it searches (thinking breath) and writes
   (talking breath), then a small orb and the agent's name once the answer is complete. The latest
   answer's orb keeps breathing slowly while it listens for your next message; older ones are still. */
export function AgentTurn({
  name, phase, label, listening = false, onSkip, children,
}: {
  name: string;
  phase: TurnPhase;
  /** Status shown while live, e.g. "Searching Maria's answers…" or "Typing…". */
  label?: string;
  /** The latest answer, waiting on the next message: its orb breathes slowly instead of resting. */
  listening?: boolean;
  onSkip?: () => void;
  children?: ReactNode;
}) {
  const live = phase !== "done";
  const design = useOrbDesign();
  return (
    <div data-testid="agent-turn" data-phase={phase} className={cn(!children && "mb-5")}>
      <button
        type="button"
        onClick={onSkip}
        disabled={!live}
        aria-label={live ? "Show the whole reply now" : undefined}
        className="mb-1.5 flex h-10 items-center gap-2 text-xs text-fg-muted disabled:cursor-default"
      >
        {live ? (
          <ThinkingPill label={label ?? "Thinking…"} mood={phase === "typing" ? "talking" : "thinking"} />
        ) : (
          <>
            <Orb state={design} mood={listening ? "listening" : "still"} size={20} label={listening ? `${name} is listening` : `${name}'s reply`} />
            <span className="font-medium text-fg-tertiary">{name}</span>
          </>
        )}
      </button>
      {children}
    </div>
  );
}
