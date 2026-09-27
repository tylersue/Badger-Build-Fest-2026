import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Agent } from "@/lib/types";
import { CHUNKS } from "./seed";
import { composeAnswer, interviewQuestion, parseFeedback, personaDraft, seedKnowledge, toneFromAnswers, type KnowledgeChunk } from "./engine";
import { SCRIPT } from "./script-lines";

/* Every typed line in docs/DEMO-SCRIPT.md must produce its hardcoded result. */
const stressTest = { id: "cynthia-pham-idea-stress-test", persona: { name: "Cynthia Pham · Idea stress test", category: "health_pt" } } as unknown as Agent;
const stressKnowledge = CHUNKS.filter((c) => c.agentId === stressTest.id).map((c) => seedKnowledge(c, c.question ? "Interview answers" : "Idea-teardown-checklist.pdf"));
const built = { id: "agent-new", persona: { name: SCRIPT.agentName, category: "health_pt", exampleQuestions: [] } } as unknown as Agent;
const builtKnowledge: KnowledgeChunk[] = SCRIPT.interview.map((content, index) => ({ id: `c${index}`, agentId: built.id, sourceId: `a${index}`,
  revisionId: `r${index}`, sourceType: "interview", sourceName: "Interview answers", content, page: null, headingPath: null,
  question: interviewQuestion(built, index, SCRIPT.interview[index - 1]) }));
const ask = (agent: Agent, knowledge: KnowledgeChunk[], question: string, extra: Partial<Parameters<typeof composeAnswer>[0]> = {}) =>
  composeAnswer({ agent, expertName: "Cynthia Pham", question, knowledge, now: "2026-09-27T12:00:00Z", ...extra });

describe("buyer lines (Austin Han)", () => {
  it("the opening line gets Cynthia's hand-written stress test with her essay cited", () => {
    const answer = ask(stressTest, stressKnowledge, SCRIPT.hire);
    expect(answer.text).toContain("Before building more of Proxier");
    expect(answer.citations.some((c) => "url" in c && c.url === "/sources/cynthia-circle-the-assumption")).toBe(true);
  });
  it("the investor follow-up gets the investor answer", () => {
    expect(ask(stressTest, stressKnowledge, SCRIPT.investor).text).toContain("investors pass for three reasons");
  });
  it("the one-pager review reads the file", () => {
    const text = readFileSync("docs/demo/Proxier-one-pager.md", "utf8");
    const answer = ask(stressTest, stressKnowledge, SCRIPT.document, { attachment: { name: "Proxier-one-pager.md", text } });
    expect(answer.text).toContain("I read Proxier-one-pager.md");
    expect(answer.text).toContain("6 hours a week");
  });
});

describe("expert lines (Cynthia Pham)", () => {
  it("the interview echoes each answer back", () => {
    expect(interviewQuestion(built, 1, SCRIPT.interview[0])).toMatch(/^You said "Stop building and go where your customers already hang out\." Walk me through/);
    expect(interviewQuestion(built, 2, SCRIPT.interview[1])).toMatch(/^You said "Had a student building a tutoring app who spent like four months on features\." Now the hard part/);
  });
  it("the persona and tone are drafted from the answers", () => {
    expect(personaDraft(built, "Cynthia Pham", [...SCRIPT.interview]).howIWork).toBe("Stop building and go where your customers already hang out.");
    expect(toneFromAnswers([...SCRIPT.interview])).toEqual(expect.arrayContaining(["Direct", "Teaches with real stories", "Honest about limits"]));
  });
  it("the test question is answered by quoting Cynthia", () => {
    const answer = ask(built, builtKnowledge, SCRIPT.test);
    expect(answer.text).toMatch(/^In Cynthia's words: "Stop building/);
  });
  it("the feedback line fixes the voice, length and ending, and the replay shows it", () => {
    const fix = parseFeedback(SCRIPT.feedback, "Cynthia Pham");
    expect(fix?.styles).toEqual(["voice", "concise", "action"]);
    const answer = ask(built, builtKnowledge, SCRIPT.test, { styles: fix!.styles });
    expect(answer.text).toMatch(/^Stop building and go where your customers already hang out\./);
    expect(answer.text).toContain("Next step: Write down ten real people with phone numbers before you touch more code.");
    expect(answer.text.match(/stop building/gi)).toHaveLength(1);
  });
});
