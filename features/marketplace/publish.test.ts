import { describe, expect, it } from "vitest";
import { AGENTS } from "@/lib/data/seed";
import { MIN_PUBLISH_CHUNKS } from "@/lib/config/publish";
import { canPublish, publishBlockers, publishChecklist } from "./publish";

const draft = AGENTS.find((a) => a.status === "draft")!;

describe("publish gate (PUB-03)", () => {
  it("passes a complete persona with enough knowledge", () => {
    expect(canPublish(draft.persona, MIN_PUBLISH_CHUNKS)).toBe(true);
    expect(publishBlockers(draft.persona, 6)).toEqual([]);
  });

  it("blocks on too little knowledge and says how much is missing", () => {
    expect(canPublish(draft.persona, MIN_PUBLISH_CHUNKS - 1)).toBe(false);
    const knowledge = publishChecklist(draft.persona, 4).find((i) => i.id === "knowledge")!;
    expect(knowledge.ok).toBe(false);
    expect(knowledge.detail).toBe(`4 of ${MIN_PUBLISH_CHUNKS}`);
    expect(knowledge.fix).toBe("interview");
  });

  it("blocks on an incomplete persona and points at the persona tab", () => {
    const persona = { ...draft.persona, headline: "  ", exampleQuestions: [""] };
    expect(publishBlockers(persona, 10)).toEqual(["Headline", "At least one example question"]);
    expect(publishChecklist(persona, 10).filter((i) => !i.ok).every((i) => i.fix === "persona")).toBe(true);
  });
});
