import { describe, expect, it } from "vitest";
import { planSpeech, shownAt, spokenPrefix, stripCitations } from "./speech";

describe("stripCitations", () => {
  it("drops [n] markers and collapses the whitespace they leave behind", () => {
    expect(stripCitations("From Maria: rest it. [1]\n\nAlso [2] elevate.")).toBe("From Maria: rest it. Also elevate.");
  });
  it("also drops persisted expert and web evidence IDs", () => {
    expect(stripCitations("Rest. [expert:chunk-1] Read more. [web:result-2]"))
      .toBe("Rest. Read more.");
    const plan = planSpeech("Rest. [expert:chunk-1] Read more.");
    expect(plan.startsAt[1]).toBe(plan.startsAt[0]);
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
    expect(plan.totalMs).toBeLessThanOrEqual(6000);
    expect(plan.words).toHaveLength(200);
  });

  it("flows at an even pace: brisk on average, and no beat long enough to read as a stall", () => {
    const text =
      "Swelling after a run is common. Ice it for fifteen minutes, keep it raised, and skip tomorrow's run; if it still hurts on stairs after two days, get it looked at.";
    const plan = planSpeech(text);
    const gaps = plan.startsAt.slice(1).map((at, i) => at - plan.startsAt[i]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(220);
    expect(plan.totalMs / plan.words.length).toBeLessThanOrEqual(110);
  });

  it("handles an empty reply", () => {
    expect(planSpeech("")).toEqual({ words: [], ends: [], startsAt: [], totalMs: 0 });
  });
});

describe("shownAt", () => {
  const plan = planSpeech("rest it. [1] Also elevate.");

  it("shows nothing before speech starts", () => {
    expect(shownAt(plan, -1)).toBe(0);
  });

  it("shows the first word the moment speech starts", () => {
    expect(shownAt(plan, 0)).toBe(1);
  });

  it("brings a citation marker in on the same frame as the word it cites", () => {
    expect(shownAt(plan, plan.startsAt[1])).toBe(3);
  });

  it("never goes backwards as time moves forward", () => {
    let last = 0;
    for (let ms = -50; ms <= plan.totalMs + 50; ms += 7) {
      const n = shownAt(plan, ms);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(last).toBe(plan.words.length);
  });

  it("handles an empty reply", () => {
    expect(shownAt(planSpeech(""), 500)).toBe(0);
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
