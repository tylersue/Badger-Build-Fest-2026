import { describe, expect, it } from "vitest";
import { chunkSegments } from "./chunk";

describe("chunkSegments", () => {
  it("packs paragraphs, overlaps only within matching coordinates, and reports every chunk", () => {
    const chunks = chunkSegments([
      { content: "Opening.\n\nShared.\n\nClosing.", page: 1, headingPath: null, sourceId: "source-a" },
      { content: "Second page.", page: 2, headingPath: null, sourceId: "source-a" },
    ], { chunkTargetChars: 20, chunkOverlapChars: 10 });
    expect(chunks.map(({ content, page }) => [content, page])).toEqual([
      ["Opening.\n\nShared.", 1], ["Shared.\n\nClosing.", 1], ["Second page.", 2],
    ]);
    expect(chunks.map(chunk => chunk.ordinal)).toEqual([0, 1, 2]);
    expect(chunks.every(chunk => chunk.sourceId === "source-a")).toBe(true);
    expect(chunks.every(chunk => chunk.content.length <= 20)).toBe(true);
  });

  it("splits long paragraphs without losing characters or breaking surrogate pairs", () => {
    const content = "a".repeat(22) + "😀" + "b".repeat(25);
    const chunks = chunkSegments([{ content, page: null, headingPath: "Notes", question: "Why?", answerId: "answer-a" }],
      { chunkTargetChars: 23, chunkOverlapChars: 4 });
    expect(chunks.map(chunk => chunk.content).join("")).toBe(content);
    expect(chunks.every(chunk => chunk.content.length <= 23 && chunk.content.isWellFormed())).toBe(true);
    expect(chunks.every(chunk => chunk.headingPath === "Notes" && chunk.question === "Why?" && chunk.answerId === "answer-a")).toBe(true);
  });

  it("keeps heading and interview provenance separate and rejects invalid input", () => {
    const chunks = chunkSegments([
      { content: "One", page: null, headingPath: "A" },
      { content: "Two", page: null, headingPath: "B" },
      { content: "Three", page: null, headingPath: null, question: "Q1" },
      { content: "Four", page: null, headingPath: null, question: "Q2" },
    ]);
    expect(chunks.map(({ content, headingPath, question }) => [content, headingPath, question])).toEqual([
      ["One", "A", null], ["Two", "B", null], ["Three", null, "Q1"], ["Four", null, "Q2"],
    ]);
    expect(() => chunkSegments([{ content: "x".repeat(101), page: null, headingPath: null }], { maxExtractedChars: 100 })).toThrow(RangeError);
    expect(() => chunkSegments([{ content: "Text", page: 0, headingPath: null }])).toThrow(TypeError);
    expect(() => chunkSegments([{ content: "😀", page: null, headingPath: null }], { chunkTargetChars: 1, chunkOverlapChars: 0 })).toThrow(RangeError);
  });
});
