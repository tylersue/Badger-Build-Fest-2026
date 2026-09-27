/**
 * Reveal timing for agent replies: a reply is "typed" or "spoken" one word at a
 * time at a speaking pace, with a beat at the end of each sentence. Pure
 * functions so the schedule is testable without timers.
 *
 * Words are located in the original text, so a reveal can slice the text
 * itself (keeping paragraph breaks and [n] citation markers for the
 * transcript) or be regrouped into caption lines (which drop the markers).
 */

export type SpeechPlan = {
  words: string[];
  /** Index just past each word in the original text. */
  ends: number[];
  /** Milliseconds after speech starts at which each word appears. */
  startsAt: number[];
  /** When the last word has been held for its own duration. */
  totalMs: number;
};

export type CaptionWindow = {
  /** The sentence spoken before the current one, or null at the start. */
  previous: string | null;
  /** The sentence in progress, revealed up to the last shown word. */
  current: string;
};

const MS_PER_WORD = 230;
const MAX_TOTAL_MS = 9000;
const SENTENCE_PAUSE_MS = 260;
const CLAUSE_PAUSE_MS = 110;

const SENTENCE_END = /[.!?]["')\]]*$/;
const CLAUSE_END = /[,;:]["')\]]*$/;
const CITATION = /^\[\d+\]$/;

/** Citation markers belong to the transcript's chips, not to spoken captions. */
export function stripCitations(text: string): string {
  return text
    .replace(/\s*\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordMs(word: string): number {
  // Longer words take longer to say; clamp so single letters and long compounds stay natural.
  const factor = Math.min(1.6, Math.max(0.8, 0.55 + word.length * 0.09));
  let ms = MS_PER_WORD * factor;
  if (SENTENCE_END.test(word)) ms += SENTENCE_PAUSE_MS;
  else if (CLAUSE_END.test(word)) ms += CLAUSE_PAUSE_MS;
  return ms;
}

export function planSpeech(text: string, opts: { maxTotalMs?: number } = {}): SpeechPlan {
  const words: string[] = [];
  const ends: number[] = [];
  const startsAt: number[] = [];
  let t = 0;
  for (const match of text.matchAll(/\S+/g)) {
    const word = match[0];
    words.push(word);
    ends.push(match.index + word.length);
    if (CITATION.test(word)) {
      // A marker lands with the word it cites rather than taking a beat of its own.
      startsAt.push(startsAt.at(-1) ?? 0);
      continue;
    }
    startsAt.push(t);
    t += wordMs(word);
  }
  if (words.length === 0) return { words: [], ends: [], startsAt: [], totalMs: 0 };

  const cap = opts.maxTotalMs ?? MAX_TOTAL_MS;
  const scale = t > cap ? cap / t : 1;
  return {
    words,
    ends,
    startsAt: startsAt.map((ms) => Math.round(ms * scale)),
    totalMs: Math.round(t * scale),
  };
}

/** The original text up to and including the last shown word. */
export function spokenPrefix(text: string, plan: SpeechPlan, shown: number): string {
  const n = Math.min(Math.max(0, shown), plan.words.length);
  return n === 0 ? "" : text.slice(0, plan.ends[n - 1]);
}

/** Group words into sentences by their closing punctuation; the last word always closes one. */
function sentences(words: string[]): string[][] {
  const out: string[][] = [];
  let group: string[] = [];
  words.forEach((word, i) => {
    group.push(word);
    if (SENTENCE_END.test(word) || i === words.length - 1) {
      out.push(group);
      group = [];
    }
  });
  return out;
}

/** The two caption lines for a reveal that has shown `shown` words so far. */
export function captionWindow(words: string[], shown: number): CaptionWindow {
  const n = Math.min(Math.max(0, shown), words.length);
  const visible = words.slice(0, n).filter((w) => !CITATION.test(w));
  if (visible.length === 0) return { previous: null, current: "" };

  const groups = sentences(visible);
  const current = groups[groups.length - 1];
  const previous = groups.length > 1 ? groups[groups.length - 2] : null;
  return { previous: previous ? previous.join(" ") : null, current: current.join(" ") };
}
