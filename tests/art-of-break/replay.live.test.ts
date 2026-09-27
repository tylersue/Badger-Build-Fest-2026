/** Re-evaluates saved synthesis outputs without changing the original live evidence. */
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createOwnedFixture, serviceDb } from "@/tests/integration/live-support";
import { reserveOperation, settleOperation } from "@/features/billing/service";
import { PRICE_VERSION, PRICING_UNITS_PER_MTOK } from "@/features/billing/pricing";
import { toCitations } from "@/features/knowledge/search";
import { reviewGrounding } from "@/features/runtime/grounding";
import { MODELS } from "@/lib/config/models";
import type { RetrievedChunk } from "@/lib/contracts/phase2";

type Row = { caseId: string; repeat: number; kind: "attack" | "control" | "forced-bad"; resume: string; question: string;
  answer?: { text: string; citationIds: string[] }; baselineAccepted: boolean; attackCanaryPresent: boolean | null;
  retrievedChunks: { id: string; content: string; score: number }[]; };
const live = process.env.RUN_BREAK_REPLAY === "1" ? it : it.skip;

describe("Art of the Break saved-output replay", () => {
  live("uses new metered operations to review the original Luna answers", async () => {
    if (process.env.RUN_LIVE_TESTS !== "1" || process.env.LIVE_TEST_DISPOSABLE !== "1" ||
      process.env.LLM_DAILY_SPEND_CAP_USD !== "2") throw new Error("Enable local live tests with the $2 cap.");
    const url = process.env.SUPABASE_URL;
    if (!url || !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname))
      throw new Error("Use local Supabase only.");
    const inputPath = process.env.BREAK_REPLAY_INPUT;
    if (!inputPath) throw new Error("Set BREAK_REPLAY_INPUT to a completed live evidence JSONL file.");
    const rows = (await readFile(resolve(inputPath), "utf8")).trim().split("\n").map(line => JSON.parse(line) as Row);
    if (rows.length !== 45 || rows.some(row => !row.answer && row.baselineAccepted))
      throw new Error("Replay requires the completed 45-case set.");
    const fixture = JSON.parse(await readFile(resolve("tests/art-of-break/fixtures.v1.json"), "utf8")) as {
      expert: { name: string; chunks: { id: string; question: string }[] };
      attacks: { id: string; unsupportedClaim: string }[] };
    const forced: Row[] = fixture.attacks.map(attack => {
      const original = rows.find(row => row.caseId === attack.id && row.repeat === 1);
      if (!original) throw new Error(`Missing original attack ${attack.id}`);
      return { ...original, caseId: `forced-${attack.id}`, kind: "forced-bad", repeat: 1,
        answer: { text: `The mentor recommends you ${attack.unsupportedClaim}. [expert:mentor-impact]`,
          citationIds: ["expert:mentor-impact"] }, baselineAccepted: true };
    });
    const workRows = [...rows, ...forced];
    const rate = PRICING_UNITS_PER_MTOK[MODELS.utility];
    const maxPerReview = (BigInt(32000) * (rate.input > rate.cacheWrite ? rate.input : rate.cacheWrite) +
      BigInt(700) * rate.output + BigInt(999999)) / BigInt(1000000);
    if (maxPerReview * BigInt(workRows.length) > BigInt("250000000"))
      throw new Error("Replay exceeds its $0.25 worst-case allocation.");
    const owner = await createOwnedFixture(serviceDb(), "10000000000");
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const output = resolve(`tests/art-of-break/evidence/replay-${runId}.jsonl`);
    await mkdir(resolve("tests/art-of-break/evidence"), { recursive: true });
    const reviewerHash = createHash("sha256").update(await readFile(resolve("features/runtime/grounding.ts"))).digest("hex");
    for (const row of workRows) {
      const chunks: RetrievedChunk[] = row.retrievedChunks.map((c, index) => ({
        id: c.id, agentId: owner.agent, revisionId: "synthetic-rev-v1", sourceId: "synthetic-source-v1",
        sourceType: "interview", sourceName: fixture.expert.name, content: c.content,
        question: fixture.expert.chunks[index]?.question ?? null, page: null, headingPath: null, score: c.score,
      }));
      const cited = toCitations(chunks).filter(c => row.answer?.citationIds.includes(c.evidenceId));
      if (!row.baselineAccepted) {
        await appendFile(output, JSON.stringify({ caseId: row.caseId, repeat: row.repeat, kind: row.kind,
          replayAccepted: false, reason: "Baseline citation membership failed", reviewerHash }) + "\n");
        continue;
      }
      const reservation = await reserveOperation({ identityId: owner.identity, agentId: owner.agent,
        purpose: "sandbox", requestKey: `break-replay-${runId}-${row.caseId}-${row.repeat}`,
        payloadHash: createHash("sha256").update(row.answer!.text).digest("hex"),
        estimateUnits: BigInt("10000000"), maxUnits: BigInt("1000000000"), priceVersion: PRICE_VERSION });
      if (!reservation.ok) throw new Error(`Reservation ${row.caseId}/${row.repeat}: ${reservation.error.code}`);
      const operation = reservation.data;
      let log: Record<string, unknown> = { caseId: row.caseId, repeat: row.repeat, kind: row.kind,
        model: MODELS.utility, reviewerHash, originalInput: inputPath, operationId: operation.id,
        ...(row.kind === "forced-bad" ? { forcedAnswer: row.answer?.text, expectedSupported: false } : {}) };
      try {
        const review = await reviewGrounding({ operation, question: row.question, answer: row.answer!.text,
          citations: cited, expert: chunks, web: [],
          attachment: { name: `${row.caseId}-synthetic-resume.txt`, content: row.resume } });
        if (!review.ok) throw new Error(`Review: ${review.error.code}`);
        log = { ...log, replayAccepted: review.data.supported, unsupportedClaims: review.data.unsupportedClaims };
      } catch (error) { log = { ...log, error: error instanceof Error ? error.message : String(error) }; }
      finally {
        const settled = await settleOperation(operation.id);
        log = { ...log, settledState: settled.ok ? settled.data.state : settled.error.code,
          actualUnits: settled.ok ? settled.data.actualUnits : null };
        await appendFile(output, JSON.stringify(log) + "\n");
      }
      if (log.error || log.settledState === "unknown") throw new Error(`${row.caseId}/${row.repeat}: ${log.error ?? "unknown hold"}; ${output}`);
    }
    expect(rows).toHaveLength(45);
    expect(workRows).toHaveLength(55);
    console.log(`Art of the Break replay evidence: ${output}`);
  }, 1_200_000);
});
