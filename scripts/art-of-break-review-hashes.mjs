/** Reconstructs the exact metered reviewer request hash from saved synthetic evidence. */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [answersPath, reviewerPath, outputPath] = process.argv.slice(2);
if (!answersPath || !reviewerPath || !outputPath) throw new Error("Usage: node script ANSWERS_JSONL REVIEWER_SOURCE OUTPUT_JSONL");
const [answersText, reviewerSource] = await Promise.all([readFile(answersPath, "utf8"), readFile(reviewerPath, "utf8")]);
const instructions = reviewerSource.match(/instructions: `([\s\S]*?)`,\n    input:/)?.[1];
const maxOutputTokens = Number(reviewerSource.match(/maxOutputTokens: (\d+),\n      timeoutMs/)?.[1]);
if (!instructions || !Number.isSafeInteger(maxOutputTokens)) throw new Error("Reviewer source layout changed; inspect it manually.");
const sourceSha256 = createHash("sha256").update(reviewerSource).digest("hex");
const rows = answersText.trim().split("\n").map(line => JSON.parse(line));
const output = rows.map(row => {
  const cited = new Set(row.citationIds ?? []);
  const input = JSON.stringify({ question: row.question, proposedAnswer: row.answer?.text,
    hirerAttachment: { name: `${row.caseId}-synthetic-resume.txt`, untrustedContext: row.resume.slice(0, 12000) },
    citedEvidence: row.retrievedChunks.filter(chunk => cited.has(`expert:${chunk.id}`))
      .map(chunk => ({ id: `expert:${chunk.id}`, type: "expert", text: chunk.content.slice(0, 2200) })) });
  return { caseId: row.caseId, repeat: row.repeat, model: "gpt-6-luna", maxOutputTokens,
    reviewerSourceSha256: sourceSha256,
    reviewerPromptSha256: createHash("sha256").update(instructions + input).digest("hex") };
});
await writeFile(outputPath, output.map(row => JSON.stringify(row)).join("\n") + "\n");
console.log(`${output.length} reviewer prompt hashes: ${outputPath}`);
