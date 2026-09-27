import { describe, expect, it } from "vitest";
import type { Agent } from "@/lib/types";
import { readFileSync } from "node:fs";
import { CHUNKS } from "./seed";
import { composeAnswer, seedKnowledge, interviewQuestion, parseFeedback, personaDraft, toneFromAnswers, type KnowledgeChunk } from "./engine";

const agent = { id: "agent-demo", slug: "agent-demo", ownerId: "maria", icon: "bot", status: "draft", rateMultiplier: 1,
  consentAcceptedAt: null, ratingAvg: 0, ratingCount: 0, usageCount: 0, createdAt: "", updatedAt: "", systemPromptOverride: null,
  persona: { name: "Cynthia Pham · Finding your first customers", category: "health_pt", headline: "", description: "", howIWork: "",
    always: [], never: [], exampleQuestions: [], greeting: "" } } as Agent;
const answers = [
  "Where do I find my first customers? I tell founders to stop building and go where their customers already gather. Every founder I mentor has to name ten real people with a phone number before writing more code.",
  "A student building a tutoring app spent four months on features. We made a list of twenty parents in one week, called all of them, and six signed up for a paid pilot.",
];
const knowledge: KnowledgeChunk[] = answers.map((content, index) => ({ id: `c${index}`, agentId: agent.id, sourceId: `a${index}`,
  revisionId: `r${index}`, sourceType: "interview", sourceName: "Interview answers", content, page: null, headingPath: null,
  question: index === 0 ? "What do founders ask you most about finding your first customers?" : "Walk me through a real founder." }));
const ask = (question: string, styles?: Parameters<typeof composeAnswer>[0]["styles"]) =>
  composeAnswer({ agent, expertName: "Cynthia Pham", question, knowledge, now: "2026-09-27T12:00:00Z", styles });

describe("demo interview", () => {
  it("asks three questions and echoes a statement, not a question", () => {
    expect(interviewQuestion(agent, 0)).toContain("finding your first customers");
    expect(interviewQuestion(agent, 1, answers[0])).toMatch(/^You said "I tell founders to stop building and go where their customers already gather\." /);
    expect(interviewQuestion(agent, 2, answers[1])).toContain("Where does that advice break?");
  });
  it("drafts How I work from the first statement and tone from the answers", () => {
    expect(personaDraft(agent, "Cynthia Pham", answers).howIWork).toBe("I tell founders to stop building and go where their customers already gather.");
    expect(toneFromAnswers(answers)).toEqual(expect.arrayContaining(["Direct", "Teaches with real stories"]));
  });
});

describe("demo answers", () => {
  it("quotes the expert with citations by default", () => {
    const answer = ask("Where do I find my first customers?");
    expect(answer.text).toMatch(/^In Cynthia's words: "Where do I find my first customers\?/);
    expect(answer.citations[0]).toMatchObject({ sourceType: "interview", sourceId: "a0" });
  });
  it("falls back to a labeled online source when the knowledge doesn't cover it", () => {
    const answer = ask("What valuation cap should our SAFE use?");
    expect(answer.gap).toContain("hasn't covered this");
    expect(answer.citations[0]).toMatchObject({ sourceType: "web" });
    expect(answer.steps.map((step) => step.kind)).toEqual(["search", "page-read"]);
  });
  it("turns plain feedback into style changes that reshape the next answer", () => {
    const fix = parseFeedback("I don't like that it quotes me word for word. Talk like me, keep it short, and end with a next step.", "Cynthia Pham");
    expect(fix?.styles).toEqual(["voice", "concise", "action"]);
    const answer = ask("Where do I find my first customers?", fix!.styles);
    expect(answer.text).not.toContain("In Cynthia's words");
    expect(answer.text).toContain("Next step: Name ten real people with a phone number before writing more code.");
    expect(answer.text.match(/stop building/gi)).toHaveLength(1);
  });
  it("treats ordinary questions as questions and saves unrecognized feedback as a persona rule", () => {
    expect(parseFeedback("Where do I find my first customers?", "Cynthia Pham")).toBeNull();
    expect(parseFeedback("Don't recommend paid ads to pre-revenue founders.", "Cynthia Pham")?.never).toEqual(["Don't recommend paid ads to pre-revenue founders"]);
  });
});

describe("document review", () => {
  it("reviews the Proxier one-pager against the idea stress test knowledge", () => {
    const stress = CHUNKS.filter((chunk) => chunk.agentId === "cynthia-pham-idea-stress-test").map((chunk) => seedKnowledge(chunk, "Interview answers"));
    const text = readFileSync("docs/demo/Proxier-one-pager.md", "utf8");
    const answer = composeAnswer({ agent: { ...agent, id: "cynthia-pham-idea-stress-test" }, expertName: "Cynthia Pham",
      question: "Review our one-pager", knowledge: stress, attachment: { name: "Proxier-one-pager.md", text }, now: "" });
    expect(answer.text).toContain("I read Proxier-one-pager.md");
    expect(answer.text).toContain("6 hours a week");
    expect(answer.citations.length).toBeGreaterThanOrEqual(2);
  });
  it("shows the knowledge boundary for the demo script's unsupported question", () => {
    const stress = CHUNKS.filter((chunk) => chunk.agentId === "cynthia-pham-idea-stress-test").map((chunk) => seedKnowledge(chunk, "Interview answers"));
    const answer = composeAnswer({ agent: { ...agent, id: "cynthia-pham-idea-stress-test" }, expertName: "Cynthia Pham",
      question: "How do we research our competitors?", knowledge: stress, now: "" });
    expect(answer.gap).toContain("Cynthia hasn't covered this");
    expect(answer.citations[0]).toMatchObject({ sourceType: "web" });
  });
});
