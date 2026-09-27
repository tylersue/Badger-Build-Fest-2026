import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
// Node's built-in TypeScript stripping requires an explicit extension.
// @ts-expect-error TS5097
import { missingPhase2Env, phase2Env } from "./check-phase2-env.ts";

type Row = Record<string, unknown>;
const env = phase2Env();
const missing = [...missingPhase2Env(env), ...(["PHASE2_APP_URL"] as const).filter(name => !env[name])];
if (missing.length) throw new Error(`LIVE_CONFIG_MISSING: ${missing.join(", ")}`);
if (env.RUN_PAID_ACCEPTANCE !== "1" || env.LIVE_TEST_DISPOSABLE !== "1")
  throw new Error("LIVE_ACCEPTANCE_DISABLED: require RUN_PAID_ACCEPTANCE=1 and LIVE_TEST_DISPOSABLE=1");
const app = new URL(env.PHASE2_APP_URL!), supabase = new URL(env.SUPABASE_URL!);
for (const target of [app, supabase]) {
  if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname) || target.protocol !== "http:")
    throw new Error("LIVE_TARGET_INVALID: paid acceptance requires loopback app and disposable local Supabase");
}
if (env.LLM_PRICE_POLICY && env.LLM_PRICE_POLICY !== "standard") throw new Error("PRICE_POLICY_INVALID: LLM_PRICE_POLICY");
if (env.LLM_PRICE_VERSION && env.LLM_PRICE_VERSION !== "2026-09-27-luna-v1") throw new Error("PRICE_POLICY_INVALID: LLM_PRICE_VERSION");
if (!env.LLM_DAILY_SPEND_CAP_USD || !/^(0|[1-9]\d?)(\.\d{1,9})?$/.test(env.LLM_DAILY_SPEND_CAP_USD) ||
  Number(env.LLM_DAILY_SPEND_CAP_USD) <= 0 || Number(env.LLM_DAILY_SPEND_CAP_USD) > 2)
  throw new Error("SPEND_BOUND_INVALID: explicitly set LLM_DAILY_SPEND_CAP_USD above 0 and at or below 2");
const db = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const route = (path: string) => new URL(path, app).toString();
const key = () => `acceptance-${randomUUID()}`;
const redacted = (value: string) => `${value.slice(0, 12)}…`;
async function must<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<NonNullable<T>> {
  const result = await query;
  if (result.error || result.data === null) throw new Error("LIVE_DATABASE_ASSERTION_FAILED");
  return result.data as NonNullable<T>;
}
async function request(path: string, method = "GET", body?: Row | FormData, requestKey?: string): Promise<Row> {
  const response = await fetch(route(path), { method, headers: { cookie: "bx-demo-identity=maria",
    origin: app.origin, "sec-fetch-site": "same-origin", ...(body instanceof FormData ? {} : body ? { "content-type": "application/json" } : {}),
    ...(requestKey ? { "Idempotency-Key": requestKey } : {}) },
  body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  signal: AbortSignal.timeout(180_000) });
  const payload = await response.json() as { ok?: boolean; data?: Row; error?: { code?: string } };
  if (!response.ok || !payload.ok || !payload.data)
    throw new Error(`LIVE_ROUTE_FAILED: ${method} ${path} (${response.status}, ${payload.error?.code ?? "invalid response"})`);
  return payload.data;
}
function u16(a: number[], n: number) { a.push(n & 255, (n >>> 8) & 255); }
function u32(a: number[], n: number) { u16(a, n); u16(a, n >>> 16); }
function crc(data: Uint8Array) { let c = 0xffffffff;
  for (const byte of data) { c ^= byte; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); }
  return (c ^ 0xffffffff) >>> 0; }
function docx(text: string): Uint8Array {
  const files = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  };
  const bytes: number[] = [], central: number[] = [];
  for (const [name, xml] of Object.entries(files)) {
    const n = new TextEncoder().encode(name), raw = new TextEncoder().encode(xml), zip = deflateRawSync(raw), hash = crc(raw), offset = bytes.length;
    u32(bytes, 0x04034b50); u16(bytes, 20); u16(bytes, 0); u16(bytes, 8); u16(bytes, 0); u16(bytes, 0);
    u32(bytes, hash); u32(bytes, zip.length); u32(bytes, raw.length); u16(bytes, n.length); u16(bytes, 0); bytes.push(...n, ...zip);
    u32(central, 0x02014b50); u16(central, 20); u16(central, 20); u16(central, 0); u16(central, 8);
    u16(central, 0); u16(central, 0); u32(central, hash); u32(central, zip.length); u32(central, raw.length);
    u16(central, n.length); u16(central, 0); u16(central, 0); u16(central, 0); u16(central, 0);
    u32(central, 0); u32(central, offset); central.push(...n);
  }
  const offset = bytes.length; bytes.push(...central); u32(bytes, 0x06054b50); u16(bytes, 0); u16(bytes, 0);
  u16(bytes, 3); u16(bytes, 3); u32(bytes, central.length); u32(bytes, offset); u16(bytes, 0);
  return Uint8Array.from(bytes);
}
function pdf(text: string): Uint8Array {
  const content = `BT /F1 12 Tf 36 760 Td (${text}) Tj ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let output = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length; output += `xref\n0 6\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { output += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  output += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}
async function operationProof(operationId: string, agentId: string) {
  const operation = await must<Row>(db.from("operations").select("agent_id,state,actual_units,held_units").eq("id", operationId).single());
  assert.equal(operation.agent_id, agentId); assert.equal(operation.state, "settled");
  const attempts = await must(db.from("provider_attempts").select("id,state,model,input_tokens,output_tokens,embedding_tokens,successful_search_count,effective_cost_units")
    .eq("operation_id", operationId));
  assert(attempts.length > 0 && attempts.every(row => row.state === "settled" && row.effective_cost_units !== null), "Missing settled usage");
  assert(attempts.every(row => row.input_tokens !== null && row.output_tokens !== null), "Missing provider token counts");
  const ledger = await must(db.from("ledger").select("amount_units").eq("operation_id", operationId).eq("kind", "debit"));
  const actual = BigInt(String(operation.actual_units));
  assert.equal(actual, attempts.reduce((sum, row) => sum + BigInt(String(row.effective_cost_units)), BigInt(0)));
  assert.equal(ledger.reduce((sum, row) => sum + BigInt(String(row.amount_units)), BigInt(0)), -actual);
  assert.equal(BigInt(String(operation.held_units)), BigInt(0));
  console.log(`Persisted usage ${redacted(operationId)}: attempts=${attempts.length}, units=${actual}`);
  return attempts;
}
async function sandbox(agentId: string, text: string) {
  const requestKey = key();
  const response = await fetch(route(`/api/agents/${agentId}/sandbox`), { method: "POST",
    headers: { cookie: "bx-demo-identity=maria", origin: app.origin, "sec-fetch-site": "same-origin",
      "content-type": "application/json", "Idempotency-Key": requestKey },
    body: JSON.stringify({ text, requestKey }), signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`LIVE_SANDBOX_FAILED: ${response.status}`);
  const events = (await response.text()).trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as Row);
  assert(events.some(event => event.type === "done"), "No durable answer completion");
  const operationId = String((events.find(event => event.type === "operation-start")?.operation as Row)?.id ?? "");
  assert(operationId, "No sandbox operation");
  const attempts = await operationProof(operationId, agentId);
  const replay = await request(`/api/agents/${agentId}/sandbox?operationId=${operationId}`);
  assert.deepEqual(replay.events, events, "Stored event replay differs from route stream");
  const messageId = String(events.find(event => event.type === "done")?.messageId ?? "");
  const message = await must<Row>(db.from("messages").select("citations,tool_steps,charged_units").eq("id", messageId).single());
  assert(message.charged_units !== null, "Message cost missing");
  return { events, attempts, message };
}
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const budgetResult = await db.from("daily_budgets").select("cap_units,spent_units,held_units").eq("day", today).maybeSingle();
  if (budgetResult.error) throw new Error("LIVE_DATABASE_ASSERTION_FAILED");
  const budget = budgetResult.data;
  const limit = BigInt(Math.round(Number(env.LLM_DAILY_SPEND_CAP_USD) * 1_000_000_000));
  if (budget && (BigInt(String(budget.cap_units)) > limit ||
    BigInt(String(budget.spent_units)) + BigInt(String(budget.held_units)) >= limit))
    throw new Error("SPEND_BOUND_INVALID: stored UTC day cap exceeds configured local acceptance limit");
  const buckets = await must(db.storage.listBuckets());
  assert(buckets.some(bucket => bucket.id === "expert-sources" && bucket.public === false), "Private bucket missing");
  const agent = await request("/api/agents", "POST", { name: `Acceptance ${randomUUID().slice(0, 8)}`,
    category: "career_admissions" });
  const agentId = String(agent.id); assert(agentId.startsWith("agent-"));
  console.log(`Test-owned agent ${redacted(agentId)}`);
  let interview = await request(`/api/agents/${agentId}/interview`, "POST", { action: "control", control: "start" }, key());
  assert(interview.pendingQuestion, "No interview question");
  interview = await request(`/api/agents/${agentId}/interview`, "POST", { action: "submit",
    questionId: (interview.pendingQuestion as Row).id, expectedVersion: interview.version,
    text: "At a client meeting last week, I asked about goals, changed the plan, and explained why." }, key());
  const answer = (interview.answers as Row[])[0];
  assert(answer && answer.indexedRevisionId === answer.revisionId, "Interview answer not indexed");
  const answerChunks = await must(db.from("chunks").select("id,embedding").eq("answer_id", String(answer.id)));
  assert(answerChunks.length > 0 && answerChunks.every(row => row.embedding), "Interview vectors missing");
  const edited = await request(`/api/agents/${agentId}/answers/${answer.id}`, "PATCH", { action: "edit",
    expectedVersion: answer.version, text: "At a client meeting last week, I asked about goals and tried a shorter plan." }, key());
  assert((edited.answers as Row[])[0].revisionId !== answer.revisionId, "Edit revision missing");
  const persona = await request(`/api/agents/${agentId}/persona`);
  const description = ((persona.state as Row).fields as Row).description as Row;
  await request(`/api/agents/${agentId}/persona`, "PATCH", { action: "save-fields",
    patch: { description: "I ask about goals." }, expectedVersions: { description: description.version } });
  const sources = `/api/agents/${agentId}/sources`;
  const fixtures: { name: string; value: string | File }[] = [
    { name: "notes.txt", value: new File(["I ask what matters most."], "notes.txt", { type: "text/plain" }) },
    { name: "guide.md", value: new File(["# Planning\nI map goals to steps."], "guide.md", { type: "text/markdown" }) },
    { name: "brief.pdf", value: new File([pdf("I ask about goals before planning.").buffer as ArrayBuffer], "brief.pdf", { type: "application/pdf" }) },
    { name: "memo.docx", value: new File([docx("I review each plan with the client.").buffer as ArrayBuffer], "memo.docx",
      { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }) },
    { name: "Pasted notes", value: "I adjust the plan when a new constraint appears." },
  ];
  for (const fixture of fixtures) {
    const form = (action: string, token?: string, requestKey?: string) => { const data = new FormData();
      data.set("action", action); data.set("name", fixture.name); data.set("fileOrText", fixture.value);
      if (token) data.set("estimateToken", token); if (requestKey) data.set("requestKey", requestKey); return data; };
    const estimate = await request(sources, "POST", form("preflight"));
    assert(estimate.estimateToken && estimate.maxUnits, "No source estimate");
    const requestKey = key();
    const result = await request(sources, "POST", form("confirm", String(estimate.estimateToken), requestKey), requestKey);
    assert.equal(result.state, "ready", `Source ${fixture.name} not ready`);
    const overview = await request(sources);
    const row = (overview.sources as Row[]).find(item => item.name === fixture.name);
    assert(row && Number(row.chunkCount) > 0, `Source ${fixture.name} has no chunks`);
    const vectors = await must(db.from("chunks").select("id,embedding").eq("source_id", String(row.id)));
    assert(vectors.length > 0 && vectors.every(item => item.embedding), `Source ${fixture.name} vectors missing`);
    await operationProof(String(row.operationId), agentId);
  }
  const countBefore = await must(db.from("sources").select("id").eq("agent_id", agentId).is("deleted_at", null));
  const expert = await sandbox(agentId, "What did the expert do at the client meeting?");
  assert((expert.events.find(event => event.type === "citations")?.citations as Row[] ?? [])
    .some(item => item.sourceType === "interview" || item.sourceType === "document"), "Expert citation missing");
  assert(!expert.events.some(event => event.type === "tool-start"), "Expert-only answer searched online");
  const online = await sandbox(agentId, "What does current public guidance say about career planning in 2026?");
  assert(online.events.some(event => event.type === "knowledge-gap"), "Expert gap missing");
  assert(online.events.some(event => event.type === "tool-start" || event.type === "tool-result"), "Web steps missing");
  assert((online.events.find(event => event.type === "citations")?.citations as Row[] ?? [])
    .some(item => item.sourceType === "web"), "Online citation missing");
  assert((online.message.tool_steps as unknown[]).length > 0, "Web steps not stored");
  assert(online.attempts.some(item => Number(item.successful_search_count) > 0), "Search usage missing");
  const countAfter = await must(db.from("sources").select("id").eq("agent_id", agentId).is("deleted_at", null));
  assert.deepEqual(countAfter.map(row => row.id).sort(), countBefore.map(row => row.id).sort(), "Web wrote Knowledge");
  console.log("LIVE ACCEPTANCE PASSED: routes, provider attempts, vectors, citations, tools and ledger persisted");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "LIVE_ACCEPTANCE_FAILED"); process.exitCode = 1; });
