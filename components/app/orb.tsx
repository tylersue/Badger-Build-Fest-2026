"use client";

import { useEffect, useRef } from "react";
import { MODE_FRAMES, resolvePreset, scaleCounts, scaleRadii, type ModeFrame, type ModeOpts, type OrbState } from "thinking-orbs";
import { paintFrame } from "thinking-orbs/engine";
import { cn } from "@/lib/utils";

/*
 * Stage-size thinking orb (github.com/Jakubantalik/thinking-orbs).
 * The package's <ThinkingOrb> only resolves its three tuned sizes (20, 32, 64). The stage
 * orb is much larger, so this drives the exported engine on its own canvas, starting from the
 * 64px design: dot counts grow with the perimeter so spacing keeps the tuned look, radii lean
 * on the engine's own size scaling, and motion slows a little as the orb grows.
 * The clock is integrated frame by frame, so a speed change eases the pace instead of jumping
 * the animation; a state change cross-fades the two geometries.
 * Dark ink only: the app is dark-only (globals.css).
 */

const FADE_MS = 450;
const COUNT_POW = 1;
const RADIUS_POW = -0.15;
const SPEED_POW = -0.35;

const LABELS: Partial<Record<OrbState, string>> = {
  solving: "Thinking",
  breathing: "Idle",
  listening: "Listening",
  searching: "Searching",
  shaping: "Speaking",
};

type StagePreset = { frame: ModeFrame; speed: number; opts: ModeOpts };

function stagePreset(state: OrbState, size: number, dots: number, dotSize: number): StagePreset {
  const base = resolvePreset(state, 64);
  const grow = size / 64;
  const opts = scaleRadii(scaleCounts(base.opts, grow ** COUNT_POW * dots), grow ** RADIUS_POW * dotSize);
  return { frame: MODE_FRAMES[base.mode], speed: base.speed * grow ** SPEED_POW, opts };
}

export function Orb({
  state, size = 176, speed = 1, dots = 1, dotSize = 1, className, label,
}: {
  state: OrbState;
  size?: number;
  /** Multiplier on the preset's baked speed; changes ease in rather than restart the animation. */
  speed?: number;
  /** Density multiplier on the mode's dot counts, as the library's `dots` prop. */
  dots?: number;
  /** Radius multiplier on every dot, as the library's `dotSize` prop. */
  dotSize?: number;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);
  /** Abstract clock in seconds; each preset scales it by its own baked speed. */
  const clock = useRef(0);
  const current = useRef<StagePreset | null>(null);
  const previous = useRef<{ preset: StagePreset; since: number } | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const preset = stagePreset(state, size, dots, dotSize);
    // Cross-fade from whatever was on screen so a state change reads as the orb reshaping.
    if (current.current) previous.current = { preset: current.current, since: performance.now() };
    current.current = preset;

    const paint = (p: StagePreset, alpha: number) => {
      ctx.globalAlpha = alpha;
      paintFrame(ctx, p.frame(size, clock.current * p.speed, p.opts), true);
    };
    const draw = (nowMs: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const prev = previous.current;
      const k = prev ? Math.min(1, (nowMs - prev.since) / FADE_MS) : 1;
      if (prev && k < 1) paint(prev.preset, 1 - k);
      else previous.current = null;
      paint(preset, k);
      ctx.globalAlpha = 1;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previous.current = null;
      clock.current = 0.6 / preset.speed;
      draw(performance.now());
      return;
    }

    let raf = 0;
    let running = false;
    let last = performance.now();
    const loop = (nowMs: number) => {
      clock.current += ((nowMs - last) / 1000) * speedRef.current;
      last = nowMs;
      draw(nowMs);
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, size, dots, dotSize]);

  return <canvas ref={ref} role="img" aria-label={label ?? LABELS[state] ?? state} className={cn("block", className)} style={{ width: size, height: size }} />;
}
