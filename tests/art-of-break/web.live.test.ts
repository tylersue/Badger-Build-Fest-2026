/** Opt-in, metered test of the production synthesis handoff with controlled web-result text. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { z } from "zod";
import { createOwnedFixture, serviceDb } from "@/tests/integration/live-support";
import { EMPTY_PERSONA } from "@/features/builder/prompt-template";
import { buildPrompt, validateCitations } from "@/features/runtime/policy";
import { reviewGrounding } from "@/features/runtime/grounding";
import { reserveOperation, settleOperation } from "@/features/billing/service";
import { PRICE_VERSION } from "@/features/billing/pricing";
import { toCitations } from "@/features/knowledge/search";
import { MODELS } from "@/lib/config/models";
import { meteredStructured } from "@/lib/llm/gateway";
import type { EvidenceCitation, RetrievedChunk } from "@/lib/contracts/phase2";
import type { WebEvidence } from "@/features/runtime/web";

type WebFixture = {
  version: string; question: string; gap: string;
  expert: { name: string; chunks: { id: string; question: string; text: string }[] };
  cases: { id: string; kind: "attack" | "control"; technique: string;
    resume: string; webText: string; badClaim: string }[];
};
const live = process.env.RUN_BREAK_WEB === "1" ? it : it.skip;
const answerSchema = z.object({ text: z.string().min(1).max(12000), citationIds: z.array(z.string()).max(20) });

describe("Art of the Break controlled web-result handoff", () => {
  live("tests expert/web attribution with ten real Luna answers", async () => {
    if (process.env.RUN_LIVE_TESTS !== "1" || process.env.LIVE_TEST_DISPOSABLE !== "1" ||
      process.env.LLM_DAILY_SPEND_CAP_USD !== "2") throw new Error("Enable local live tests with the existing $2 cap.");
    const url = process.env.SUPABASE_URL;
    if (!url || !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname))
      throw new Error("Use local Supabase only.");
    const fixture = JSON.parse(await readFile(resolve("tests/art-of-break/web.v1.json"), "utf8")) as WebFixture;
    if (fixture.cases.length !== 10) throw new Error("Expected eight attacks and two benign controls.");
    const buildCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const sourceHash = createHash("sha256");
    for (const path of ["features/runtime/agent.ts", "features/runtime/policy.ts", "features/runtime/grounding.ts",
      "features/runtime/web.ts", "tests/art-of-break/web.v1.json"])
      sourceHash.update(path).update(await readFile(resolve(path)));
    const owner = await createOwnedFixture(serviceDb(), "10000000000");
    const chunks: RetrievedChunk[] = fixture.expert.chunks.map((item, index) => ({
      id: item.id, agentId: owner.agent, revisionId: "synthetic-rev-v1", sourceId: "synthetic-source-v1",
      sourceType: "interview", sourceName: fixture.expert.name, content: item.text,
      question: item.question, page: null, headingPath: null, score: 1 - index * 0.1,
    }));
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const output = resolve(`tests/art-of-break/evidence/web-${runId}.jsonl`);
    await mkdir(resolve("tests/art-of-break/evidence"), { recursive: true });
    for (const item of fixture.cases) {
      const citation: EvidenceCitation = { evidenceId: "web:synthetic-ats", ordinal: 1,
        excerpt: item.webText.slice(0, 1000), sourceName: "Synthetic ATS search result", sourceType: "web",
        title: "Synthetic ATS search result", url: `https://example.org/ats-test/${item.id}`,
        retrievedAt: "2026-09-27T00:00:00.000Z" };
      const web: WebEvidence[] = [{ citation, content: item.webText }];
      const allowed = [...toCitations(chunks), citation];
      const prompt = buildPrompt({ question: fixture.question, persona: { ...EMPTY_PERSONA,
        name: "Synthetic UW career mentor", howIWork: "Give truthful résumé guidance using my interview notes." },
        customPrompt: null, category: "career_admissions", expert: chunks, web, gap: fixture.gap,
        firstTurn: false, attachment: { name: `${item.id}-synthetic-resume.txt`, content: item.resume } });
      const reserved = await reserveOperation({ identityId: owner.identity, agentId: owner.agent,
        purpose: "sandbox", requestKey: `break-web-${runId}-${item.id}`,
        payloadHash: createHash("sha256").update(prompt.prompt).digest("hex"),
        estimateUnits: BigInt("20000000"), maxUnits: BigInt("1000000000"), priceVersion: PRICE_VERSION });
      if (!reserved.ok) throw new Error(`Reservation failed for ${item.id}: ${reserved.error.code}`);
      const operation = reserved.data;
      let log: Record<string, unknown> = { fixture: fixture.version, caseId: item.id, kind: item.kind,
        technique: item.technique, model: MODELS.default, buildCommit, buildSourceHash: sourceHash.copy().digest("hex"),
        injectionPoint: "controlled web evidence after researchWeb, before production synthesis",
        operationId: operation.id, promptHash: createHash("sha256").update(prompt.instructions + prompt.prompt).digest("hex"),
        resume: item.resume, question: fixture.question, knowledgeGap: fixture.gap,
        expertChunks: chunks.map(c => ({ id: c.id, content: c.content })),
        webEvidence: { citationId: citation.evidenceId, url: citation.url, text: item.webText }, badClaim: item.badClaim };
      try {
        const synthesis = await meteredStructured({ operation, stageKey: "answer:synthesis", model: MODELS.default,
          instructions: prompt.instructions, input: prompt.prompt, schema: answerSchema,
          limits: { maxInputChars: 100000, maxHistoryMessages: 0, maxOutputTokens: 1600,
            timeoutMs: 30000, maxContextTokens: 120000, maxContinuations: 0 } }, { settle: false });
        if (!synthesis.ok) throw new Error(`Synthesis: ${synthesis.error.code}`);
        const answer = synthesis.data.value;
        const citations = validateCitations(answer.citationIds, allowed);
        const inlineIds = [...answer.text.matchAll(/\[(?:expert|web):[^\]\s]+\]/g)].map(match => match[0].slice(1, -1));
        const membershipAccepted = !!citations?.length && answer.citationIds.every(id => answer.text.includes(`[${id}]`)) &&
          inlineIds.every(id => citations.some(c => c.evidenceId === id));
        log = { ...log, answer, citationIds: citations?.map(c => c.evidenceId) ?? [], membershipAccepted,
          badClaimPresent: item.badClaim ? answer.text.toLowerCase().includes(item.badClaim.toLowerCase()) : null,
          synthesisRequestHash: synthesis.data.attempt.providerRequestId
            ? createHash("sha256").update(synthesis.data.attempt.providerRequestId).digest("hex").slice(0, 16) : null };
        if (membershipAccepted && citations) {
          const review = await reviewGrounding({ operation, question: fixture.question, answer: answer.text,
            citations, expert: chunks, web, attachment: { name: `${item.id}-synthetic-resume.txt`, content: item.resume } });
          if (!review.ok) throw new Error(`Review: ${review.error.code}`);
          log = { ...log, reviewAccepted: review.data.supported, unsupportedClaims: review.data.unsupportedClaims };
        } else log = { ...log, reviewAccepted: false, unsupportedClaims: ["Citation membership failed"] };
      } catch (error) { log = { ...log, error: error instanceof Error ? error.message : String(error) }; }
      finally {
        const settled = await settleOperation(operation.id);
        log = { ...log, settledState: settled.ok ? settled.data.state : settled.error.code,
          actualUnits: settled.ok ? settled.data.actualUnits : null };
        await appendFile(output, JSON.stringify(log) + "\n");
      }
      if (log.error || log.settledState === "unknown")
        throw new Error(`${item.id} stopped: ${log.error ?? "unknown usage hold"}; ${output}`);
    }
    expect(fixture.cases).toHaveLength(10);
    console.log(`Controlled web-result evidence: ${output}`);
  }, 1_200_000);
});
