"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/*
 * An Obsidian-style map of what an agent knows. Answers, documents and the expert's publications are
 * the named nodes; every other indexed passage is a small dot tied to the answer or document it came
 * with. The layout is a small hand-written force simulation (repulsion, springs, centering) drawn in
 * SVG. It settles, then keeps drifting gently, and holds still for reduced motion.
 */

export type GraphTarget = { type: "answer" | "source" | "publication"; id: string };
export type GraphInput = {
  seed: string;
  answers: { id: string; question: string; text: string; parentId: string | null }[];
  documents: { id: string; name: string; chunkCount: number }[];
  publications: { id: string; title: string; kind: string; text: string }[];
  /** Indexed interview passages, including the ones behind the listed answers. */
  interviewChunks: number;
};

type Kind = "answer" | "document" | "publication" | "passage";
type GraphNode = { id: string; kind: Kind; label: string; short: string; target: GraphTarget; r: number; charge: number; parent: number | null; words: Set<string> };
type GraphEdge = { a: number; b: number; length: number; strength: number; faint: boolean };
type Point = { x: number; y: number; vx: number; vy: number; phase: number };

const KIND_LABEL: Record<Kind, string> = { answer: "Interview answer", document: "Document", publication: "Publication", passage: "Indexed passage" };
const STOP = new Set(("about after again also always another anyone because been before being between both cannot could does doing done down each even every from have having here into just know like made make many more most much must need never only other over really same should some something still such than that their them then there these they thing things think this those through very want were what when where which while with without would your yours you're that's it's don't didn't isn't can't i'm we're they're let's").split(" "));

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function words(text: string) {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z']+/g) ?? []) {
    const word = raw.replace(/'s$/, "");
    if (word.length < 4 || STOP.has(word)) continue;
    out.add(word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word);
  }
  return out;
}
const shared = (a: Set<string>, b: Set<string>) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n; };
const clip = (text: string, max = 30) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
/** Interview questions open with a lead-in ("You said… How do you…"); the last sentence is the actual question. */
const lastSentence = (text: string) => text.trim().split(/(?<=[.?!])\s+/).filter(Boolean).at(-1) ?? text;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function buildGraph(input: GraphInput) {
  const rand = seeded(hash(input.seed));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const degree: number[] = [];
  const add = (node: GraphNode) => { nodes.push(node); degree.push(0); return nodes.length - 1; };
  const link = (a: number, b: number, length: number, strength: number, faint = false) => {
    if (a === b || edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
    edges.push({ a, b, length, strength, faint });
    degree[a]++; degree[b]++;
  };

  const answers = input.answers.map(answer => add({ id: `a:${answer.id}`, kind: "answer", label: answer.question, short: clip(lastSentence(answer.question)),
    target: { type: "answer", id: answer.id }, r: 5.5, charge: -150, parent: null, words: words(`${answer.question} ${answer.text}`) }));
  input.answers.forEach((answer, i) => {
    const parent = input.answers.findIndex(other => other.id === answer.parentId);
    if (parent >= 0) link(answers[i], answers[parent], 48, 0.6);
  });
  // Answers that talk about the same things link up, at most three links each, and none floats alone.
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < answers.length; i++) for (let j = i + 1; j < answers.length; j++) {
    const overlap = shared(nodes[answers[i]].words, nodes[answers[j]].words);
    if (overlap > 0) pairs.push([overlap + rand() * 0.5, answers[i], answers[j]]);
  }
  pairs.sort((x, y) => y[0] - x[0]);
  for (const [, a, b] of pairs) if (degree[a] < 3 && degree[b] < 3) link(a, b, 95, 0.25);
  for (const a of answers) if (degree[a] === 0 && answers.length > 1) {
    const best = answers.filter(b => b !== a).sort((x, y) => shared(nodes[y].words, nodes[a].words) - shared(nodes[x].words, nodes[a].words))[0];
    link(a, best, 95, 0.25);
  }
  const closest = (bag: Set<string>, count: number) => answers
    .map(a => [shared(bag, nodes[a].words) + rand() * 0.5, a] as const)
    .sort((x, y) => y[0] - x[0]).slice(0, count).map(([, a]) => a);

  const hubs: [number, number][] = [];
  for (const doc of input.documents) {
    const bag = words(doc.name.replace(/[-_.]/g, " "));
    const node = add({ id: `d:${doc.id}`, kind: "document", label: doc.name, short: clip(doc.name), target: { type: "source", id: doc.id },
      r: 6.5, charge: -180, parent: null, words: bag });
    for (const a of closest(bag, 2)) link(node, a, 85, 0.25);
    hubs.push([node, Math.min(Math.max(doc.chunkCount - 1, 0), 24)]);
  }
  for (const item of input.publications) {
    const bag = words(`${item.title} ${item.text}`);
    const node = add({ id: `p:${item.id}`, kind: "publication", label: `${item.kind} · ${item.title}`, short: clip(item.title),
      target: { type: "publication", id: item.id }, r: 6.5, charge: -170, parent: null, words: bag });
    for (const a of closest(bag, 3)) link(node, a, 90, 0.25);
  }

  // The rest of the indexed passages cluster around the answer or document they arrived with.
  const passages: number[] = [];
  const passage = (parent: number, key: string) => {
    const node = add({ id: `c:${key}`, kind: "passage", label: nodes[parent].label, short: "", target: nodes[parent].target,
      r: 2.25, charge: -22, parent, words: new Set() });
    link(node, parent, 24 + rand() * 14, 0.7, true);
    passages.push(node);
  };
  const interviewPassages = answers.length ? Math.min(Math.max(input.interviewChunks - answers.length, 0), 40) : 0;
  for (let i = 0; i < interviewPassages; i++) passage(answers[Math.floor(rand() * answers.length)], `i${i}`);
  hubs.forEach(([hub, count], h) => { for (let i = 0; i < count; i++) passage(hub, `d${h}-${i}`); });
  for (const p of passages) {
    if (rand() > 0.3) continue;
    const other = passages[Math.floor(rand() * passages.length)];
    if (nodes[other].parent !== nodes[p].parent) link(p, other, 55, 0.08, true);
  }
  return { nodes, edges, passages: passages.length };
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

export function KnowledgeGraph({ input, onSelect }: { input: GraphInput; onSelect: (target: GraphTarget) => void }) {
  const graph = useMemo(() => buildGraph(input), [input]);
  const neighbors = useMemo(() => {
    const out = graph.nodes.map(() => new Set<number>());
    for (const e of graph.edges) { out[e.a].add(e.b); out[e.b].add(e.a); }
    return out;
  }, [graph]);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED).matches, () => false);
  const box = useRef<HTMLDivElement>(null);
  const store = useRef(new Map<string, Point>());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pts, setPts] = useState<number[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const { w, h } = size;
    const { nodes, edges } = graph;
    if (!w || !h || !nodes.length) return;
    const P: Point[] = [];
    nodes.forEach((node, i) => {
      let p = store.current.get(node.id);
      if (!p) {
        const angle = (hash(node.id) % 6283) / 1000;
        const anchor = node.parent !== null ? P[node.parent] : undefined;
        const radius = anchor ? 18 : 60 + (hash(`${node.id}r`) % 90);
        p = { x: (anchor?.x ?? 0) + Math.cos(angle) * radius, y: (anchor?.y ?? 0) + Math.sin(angle) * radius, vx: 0, vy: 0, phase: angle * 3 };
        store.current.set(node.id, p);
      }
      P[i] = p;
    });
    const aspect = Math.min(Math.max(w / h, 1), 2.6);
    const pad = { x: 32, top: 44, bottom: 30 };
    let alpha = 1;
    let fit: { s: number; tx: number; ty: number } | null = null;

    const step = (now: number, drift: boolean) => {
      alpha += ((drift ? 0.045 : 0) - alpha) * 0.02;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const dx = P[j].x - P[i].x || (i - j) * 0.01, dy = P[j].y - P[i].y || 0.01;
        const d2 = Math.max(dx * dx + dy * dy, 16);
        if (d2 > 160000) continue;
        P[i].vx += dx * nodes[j].charge * alpha / d2; P[i].vy += dy * nodes[j].charge * alpha / d2;
        P[j].vx -= dx * nodes[i].charge * alpha / d2; P[j].vy -= dy * nodes[i].charge * alpha / d2;
      }
      for (const e of edges) {
        const a = P[e.a], b = P[e.b];
        const dx = b.x + b.vx - a.x - a.vx, dy = b.y + b.vy - a.y - a.vy;
        const d = Math.hypot(dx, dy) || 1;
        const l = (d - e.length) / d * alpha * e.strength;
        b.vx -= dx * l * 0.5; b.vy -= dy * l * 0.5; a.vx += dx * l * 0.5; a.vy += dy * l * 0.5;
      }
      for (const p of P) {
        p.vx -= p.x * 0.035 * alpha; p.vy -= p.y * 0.035 * aspect * aspect * alpha;
        if (drift) { p.vx += Math.sin(now * 0.0005 + p.phase) * 0.018; p.vy += Math.cos(now * 0.00043 + p.phase * 1.7) * 0.018; }
        p.vx *= 0.6; p.vy *= 0.6; p.x += p.vx; p.y += p.vy;
      }
    };
    const project = (ease: number) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      const s = Math.min((w - pad.x * 2) / Math.max(maxX - minX, 1), (h - pad.top - pad.bottom) / Math.max(maxY - minY, 1), 2.4);
      const target = { s, tx: w / 2 - (minX + maxX) / 2 * s, ty: pad.top + (h - pad.top - pad.bottom) / 2 - (minY + maxY) / 2 * s };
      fit = fit ? { s: fit.s + (target.s - fit.s) * ease, tx: fit.tx + (target.tx - fit.tx) * ease, ty: fit.ty + (target.ty - fit.ty) * ease } : target;
      const out: number[] = [];
      for (const p of P) out.push(p.x * fit.s + fit.tx, p.y * fit.s + fit.ty);
      return out;
    };

    let raf = 0;
    if (reduced) {
      for (let i = 0; i < 360; i++) step(0, false);
      raf = requestAnimationFrame(() => setPts(project(1)));
    } else {
      const frame = (now: number) => {
        step(now, true);
        setPts(project(0.08));
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    return () => cancelAnimationFrame(raf);
  }, [graph, size, reduced]);

  const counts = { answers: input.answers.length, documents: input.documents.length, publications: input.publications.length };
  const caption = [plural(counts.answers, "answer", "answers"), counts.documents ? plural(counts.documents, "document", "documents") : null,
    counts.publications ? plural(counts.publications, "publication", "publications") : null].filter(Boolean).join(" · ");
  const active = hover ?? focus;
  const ready = pts.length === graph.nodes.length * 2;
  const lit = (i: number) => active === null || i === active || neighbors[active].has(i);
  const pick = (i: number) => onSelect(graph.nodes[i].target);
  const onKey = (i: number) => (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    pick(i);
  };

  const tip = active !== null && ready ? (() => {
    const node = graph.nodes[active];
    const x = pts[active * 2], y = pts[active * 2 + 1];
    const half = Math.min(130, size.w / 2 - 8);
    const below = y < 96;
    return <div role="presentation" className="pointer-events-none absolute z-10 w-max max-w-[260px] rounded-md border border-line-default bg-surface-3 px-2.5 py-1.5 text-xs leading-snug shadow-sm"
      style={{ left: Math.min(Math.max(x, half), size.w - half), top: below ? y + node.r + 10 : y - node.r - 10, transform: `translate(-50%, ${below ? "0" : "-100%"})` }}>
      <div className="text-[11px] text-fg-muted">{KIND_LABEL[node.kind]}{node.kind === "passage" ? " · from" : ""}</div>
      <div className="line-clamp-3 text-foreground">{node.label}</div>
    </div>;
  })() : null;

  return (
    <div ref={box} data-testid="knowledge-graph" className="relative h-[360px] overflow-hidden rounded-xl border border-line-subtle bg-surface-1 sm:h-[400px]">
      {ready && (
        <svg width={size.w} height={size.h} className="block select-none" role="group"
          aria-label={`Knowledge graph: ${caption}. Select a node to jump to it in the list below.`}>
          <g>
            {graph.edges.map((e, i) => {
              const touches = active !== null && (e.a === active || e.b === active);
              return <line key={i} x1={pts[e.a * 2]} y1={pts[e.a * 2 + 1]} x2={pts[e.b * 2]} y2={pts[e.b * 2 + 1]}
                strokeWidth={e.faint ? 0.75 : 1}
                className={cn("transition-opacity duration-200", touches ? "stroke-fg-tertiary" : "stroke-line-outline",
                  active !== null && !touches && "opacity-15")} />;
            })}
          </g>
          <g>
            {graph.nodes.map((node, i) => {
              const x = pts[i * 2], y = pts[i * 2 + 1];
              const named = node.kind !== "passage";
              const hollow = node.kind === "document" || node.kind === "publication";
              const tone = i === active ? "foreground" : active !== null && neighbors[active].has(i) ? "fg-secondary" : null;
              return (
                <g key={node.id} transform={`translate(${x} ${y})`} data-testid={named ? "graph-node" : undefined}
                  role={named ? "button" : undefined} tabIndex={named ? 0 : undefined} aria-hidden={named ? undefined : true}
                  aria-label={named ? `${KIND_LABEL[node.kind]}: ${node.label}` : undefined}
                  className={cn("group cursor-pointer outline-none transition-opacity duration-200", !lit(i) && "opacity-20")}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(current => (current === i ? null : current))}
                  onFocus={() => setFocus(i)} onBlur={() => setFocus(current => (current === i ? null : current))}
                  onClick={() => pick(i)} onKeyDown={named ? onKey(i) : undefined}>
                  <circle r={Math.max(node.r + 6, 9)} className="fill-transparent" />
                  {named && <circle r={node.r + 4} strokeWidth={2} className="fill-none stroke-ring opacity-0 group-focus-visible:opacity-100" />}
                  <circle r={node.r} strokeWidth={hollow ? 1.5 : 0}
                    className={cn("transition-[fill,stroke] duration-200",
                      hollow ? cn("fill-surface-1", tone === "foreground" ? "stroke-foreground" : tone ? "stroke-fg-secondary" : "stroke-fg-tertiary")
                        : tone === "foreground" ? "fill-foreground" : tone ? "fill-fg-secondary" : node.kind === "passage" ? "fill-fg-muted" : "fill-fg-tertiary")} />
                  {named && <text y={node.r + 14} textAnchor={x < size.w * 0.22 ? "start" : x > size.w * 0.78 ? "end" : "middle"}
                    x={x < size.w * 0.22 ? -node.r : x > size.w * 0.78 ? node.r : 0}
                    className={cn("pointer-events-none text-[11px] transition-[fill] duration-200", i === active ? "fill-foreground" : "fill-fg-muted")}>{size.w < 520 ? clip(node.short, 22) : node.short}</text>}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {tip}
      <p className="pointer-events-none absolute top-3 left-4 text-xs text-fg-muted">
        {caption}{graph.passages > 0 && <span className="hidden sm:inline"> · {graph.passages} indexed passages</span>}
      </p>
    </div>
  );
}
