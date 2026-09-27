/**
 * Reveal timing for agent replies: a reply flows in word by word at an even,
 * brisk pace with only a short breath at the end of a clause or sentence, so
 * the text reads as one continuous stream rather than a stop-start typist.
 * Each word also fades in on screen (the flow-word class), so several words
 * are mid-fade at once. Pure functions so the schedule is testable without timers.
 *
 * Words are located in the original text, so a reveal slices the text itself
 * and keeps paragraph breaks and [n] citation markers.
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


const MS_PER_WORD = 72;
const MAX_TOTAL_MS = 6000;
const SENTENCE_PAUSE_MS = 120;
const CLAUSE_PAUSE_MS = 45;

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
  // Longer words take a little longer; the clamp is narrow so the stream stays even.
  const factor = Math.min(1.3, Math.max(0.85, 0.7 + word.length * 0.06));
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

/** How many words are showing `elapsedMs` after speech started (words are in time order). */
export function shownAt(plan: SpeechPlan, elapsedMs: number): number {
  let n = 0;
  while (n < plan.startsAt.length && plan.startsAt[n] <= elapsedMs) n++;
  return n;
}

/** The original text up to and including the last shown word. */
export function spokenPrefix(text: string, plan: SpeechPlan, shown: number): string {
  const n = Math.min(Math.max(0, shown), plan.words.length);
  return n === 0 ? "" : text.slice(0, plan.ends[n - 1]);
}
