"use client";

import { useEffect, useRef } from "react";
import { MODE_FRAMES, resolvePreset, scaleCounts, scaleRadii, type ModeFrame, type ModeOpts, type OrbSize, type OrbState } from "thinking-orbs";
import { paintFrame } from "thinking-orbs/engine";
import { cn } from "@/lib/utils";

/*
 * Thinking orb (github.com/Jakubantalik/thinking-orbs) that breathes.
 * The package's <ThinkingOrb> only resolves its tuned sizes (20, 32, 64) and runs at a fixed
 * pace. This drives the exported engine on its own canvas from the nearest tuned size, so any
 * size works: dot counts grow with the perimeter so spacing keeps the tuned look, radii lean on
 * the engine's own size scaling, and motion slows a little as the orb grows.
 * On top of that the orb breathes with its mood: each breath swells it slightly and surges its
 * motion. Listening is a slow, deep breath; talking is quick and lively. Pace, breath rate and
 * depth all ease toward the new mood (quick to rise, slow to settle), and the clocks are
 * integrated frame by frame, so a mood change never jumps the animation. A state change cross-fades the two geometries.
 * Light ink on the dark theme (DESIGN.md): paintFrame's dark flag is true.
 */

export type OrbMood = "listening" | "thinking" | "talking" | "still";

type Breath = { speed: number; rate: number; depth: number };

/** speed: multiplier on the preset's pace; rate: breaths per second; depth: how far each breath swells. */
const MOODS: Record<OrbMood, Breath> = {
  listening: { speed: 0.4, rate: 0.2, depth: 0.035 },
  thinking: { speed: 1.1, rate: 0.45, depth: 0.025 },
  talking: { speed: 1.9, rate: 0.8, depth: 0.05 },
  still: { speed: 0, rate: 0, depth: 0 },
};

/** How much a breath speeds the motion up (and slows it on the out-breath), per unit of depth. */
const SURGE = 5;
/** Seconds for pace, breath rate and depth to cover ~63% of the way to a new mood: the orb comes
    alive quickly and settles slowly, so even a one-second line reads as talking, then trails off. */
const RISE_S = 0.3;
const SETTLE_S = 1.2;
const FADE_MS = 450;
const COUNT_POW = 1;
const RADIUS_POW = -0.15;
const SPEED_POW = -0.35;

const LABELS: Record<OrbMood, string> = { listening: "Listening", thinking: "Thinking", talking: "Speaking", still: "Done" };

type StagePreset = { frame: ModeFrame; speed: number; opts: ModeOpts };

function stagePreset(state: OrbState, size: number): StagePreset {
  const baseSize: OrbSize = size <= 20 ? 20 : size <= 32 ? 32 : 64;
  const base = resolvePreset(state, baseSize);
  const grow = size / baseSize;
  const opts = scaleRadii(scaleCounts(base.opts, grow ** COUNT_POW), grow ** RADIUS_POW);
  return { frame: MODE_FRAMES[base.mode], speed: base.speed * grow ** SPEED_POW, opts };
}

export function Orb({
  state = "composing", mood, size = 176, className, label,
}: {
  state?: OrbState;
  mood: OrbMood;
  size?: number;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  /** Live pace, breath rate and depth, eased toward the current mood frame by frame. */
  const live = useRef<Breath>({ ...MOODS[mood] });
  /** Abstract clock in seconds; each preset scales it by its own baked speed. */
  const clock = useRef(0.6);
  const breathPhase = useRef(0);
  const current = useRef<StagePreset | null>(null);
  const previous = useRef<{ preset: StagePreset; since: number } | null>(null);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    moodRef.current = mood;
    kick.current();
  }, [mood]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const preset = stagePreset(state, size);
    // Cross-fade from whatever was on screen so a state change reads as the orb reshaping.
    if (current.current) previous.current = { preset: current.current, since: performance.now() };
    current.current = preset;

    const paint = (p: StagePreset, alpha: number) => {
      ctx.globalAlpha = alpha;
      paintFrame(ctx, p.frame(size, clock.current * p.speed, p.opts), true);
    };
    const draw = (nowMs: number) => {
      // Swell around the centre with the breath.
      const swell = 1 + live.current.depth * Math.sin(breathPhase.current);
      const shift = (size / 2) * (1 - swell) * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * swell, 0, 0, dpr * swell, shift, shift);
      const prev = previous.current;
      const k = prev ? Math.min(1, (nowMs - prev.since) / FADE_MS) : 1;
      if (prev && k < 1) paint(prev.preset, 1 - k);
      else previous.current = null;
      paint(preset, k);
      ctx.globalAlpha = 1;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previous.current = null;
      live.current = { ...MOODS.still };
      kick.current = () => draw(performance.now());
      kick.current();
      return () => {
        kick.current = () => {};
      };
    }

    let raf = 0;
    let running = false;
    let last = performance.now();
    const settled = () => {
      const target = MOODS[moodRef.current];
      const l = live.current;
      return target.speed === 0 && previous.current === null && l.speed < 0.002 && l.depth < 0.0005;
    };
    const loop = (nowMs: number) => {
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      const target = MOODS[moodRef.current];
      const l = live.current;
      const ease = (from: number, to: number) => from + (to - from) * (1 - Math.exp(-dt / (to > from ? RISE_S : SETTLE_S)));
      l.speed = ease(l.speed, target.speed);
      l.rate = ease(l.rate, target.rate);
      l.depth = ease(l.depth, target.depth);
      breathPhase.current += dt * l.rate * 2 * Math.PI;
      clock.current += dt * l.speed * (1 + SURGE * l.depth * Math.sin(breathPhase.current));
      draw(nowMs);
      // A finished reply eases to rest, then stops drawing.
      if (settled()) running = false;
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      // Always leave a drawn frame, even in a background tab where frames never fire.
      draw(performance.now());
      if (settled() || document.visibilityState === "hidden") return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    kick.current = start;
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      kick.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, size]);

  return <canvas ref={ref} role="img" aria-label={label ?? LABELS[mood]} className={cn("block", className)} style={{ width: size, height: size }} />;
}
