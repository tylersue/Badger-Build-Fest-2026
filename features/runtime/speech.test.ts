import { describe, expect, it } from "vitest";
import { captionWindow, planSpeech, spokenPrefix, stripCitations } from "./speech";

describe("stripCitations", () => {
  it("drops [n] markers and collapses the whitespace they leave behind", () => {
    expect(stripCitations("From Maria: rest it. [1]\n\nAlso [2] elevate.")).toBe("From Maria: rest it. Also elevate.");
  });
});

describe("planSpeech", () => {
  it("reveals one word at a time, starting at once and never going backwards", () => {
    const plan = planSpeech("Ice it tonight and call me tomorrow.");
    expect(plan.words).toEqual(["Ice", "it", "tonight", "and", "call", "me", "tomorrow."]);
    expect(plan.startsAt[0]).toBe(0);
    for (let i = 1; i < plan.startsAt.length; i++) expect(plan.startsAt[i]).toBeGreaterThan(plan.startsAt[i - 1]);
    expect(plan.totalMs).toBeGreaterThan(plan.startsAt.at(-1)!);
  });

  it("pauses at the end of a sentence", () => {
    const flat = planSpeech("Rest then walk");
    const paused = planSpeech("Rest. Then walk");
    expect(paused.startsAt[1]).toBeGreaterThan(flat.startsAt[1]);
  });

  it("shows a citation marker together with the word before it", () => {
    const plan = planSpeech("rest it. [1] Also elevate.");
    expect(plan.words).toEqual(["rest", "it.", "[1]", "Also", "elevate."]);
    expect(plan.startsAt[2]).toBe(plan.startsAt[1]);
    expect(plan.startsAt[3]).toBeGreaterThan(plan.startsAt[2]);
  });

  it("records where each word ends in the original text", () => {
    expect(planSpeech("rest it. [1] Also elevate.").ends).toEqual([4, 8, 12, 17, 26]);
  });

  it("caps a long reply so captions never drag on", () => {
    const plan = planSpeech(Array.from({ length: 200 }, (_, i) => `word${i}`).join(" "));
    expect(plan.totalMs).toBeLessThanOrEqual(9000);
    expect(plan.words).toHaveLength(200);
  });

  it("handles an empty reply", () => {
    expect(planSpeech("")).toEqual({ words: [], ends: [], startsAt: [], totalMs: 0 });
  });
});

describe("spokenPrefix", () => {
  const text = "First thing is the pattern. [1]\n\nCompare it with the other knee.";
  const plan = planSpeech(text);

  it("is empty before the first word", () => {
    expect(spokenPrefix(text, plan, 0)).toBe("");
  });

  it("keeps the original spacing, paragraph breaks and citation markers", () => {
    expect(spokenPrefix(text, plan, 5)).toBe("First thing is the pattern.");
    expect(spokenPrefix(text, plan, 6)).toBe("First thing is the pattern. [1]");
    expect(spokenPrefix(text, plan, 7)).toBe("First thing is the pattern. [1]\n\nCompare");
  });

  it("returns the whole text once every word is shown, clamping past the end", () => {
    expect(spokenPrefix(text, plan, plan.words.length)).toBe(text);
    expect(spokenPrefix(text, plan, 99)).toBe(text);
  });
});

describe("captionWindow", () => {
  const words = planSpeech("Ice it tonight. Call me tomorrow.").words;

  it("shows nothing before the first word", () => {
    expect(captionWindow(words, 0)).toEqual({ previous: null, current: "" });
  });

  it("reveals the current sentence word by word", () => {
    expect(captionWindow(words, 2)).toEqual({ previous: null, current: "Ice it" });
  });

  it("keeps the finished sentence above the one being spoken", () => {
    expect(captionWindow(words, 4)).toEqual({ previous: "Ice it tonight.", current: "Call" });
  });

  it("holds the last two sentences once speaking ends, clamping past the end", () => {
    expect(captionWindow(words, 6)).toEqual({ previous: "Ice it tonight.", current: "Call me tomorrow." });
    expect(captionWindow(words, 99)).toEqual({ previous: "Ice it tonight.", current: "Call me tomorrow." });
  });

  it("treats a question mark or exclamation as a sentence end too", () => {
    const w = planSpeech("Ready? Go!").words;
    expect(captionWindow(w, 2)).toEqual({ previous: "Ready?", current: "Go!" });
  });

  it("leaves citation markers out of the captions", () => {
    const w = planSpeech("Ice it tonight. [1] Call me tomorrow. [2]").words;
    expect(captionWindow(w, 4)).toEqual({ previous: null, current: "Ice it tonight." });
    expect(captionWindow(w, 5)).toEqual({ previous: "Ice it tonight.", current: "Call" });
    expect(captionWindow(w, 8)).toEqual({ previous: "Ice it tonight.", current: "Call me tomorrow." });
  });
});
