/**
 * Operator-only recovery tool. Default run is a names-only dry-run listing.
 * Apply requires an evidence JSON file and an explicit --apply flag.
 * Run with: node --experimental-strip-types scripts/reconcile-usage.ts
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type Evidence = { attemptId: string; action: "prove_undispatched" | "record_usage";
  note: string; recordedBy: string; usage?: Record<string, number> };
type EvidenceFile = { operationId: string; evidence: Evidence[] };
const args = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
function validEvidence(input: unknown): input is EvidenceFile {
  if (!input || typeof input !== "object") return false;
  const file = input as Record<string, unknown>;
  if (typeof file.operationId !== "string" || !/^op_[0-9a-f-]{36}$/.test(file.operationId) ||
      !Array.isArray(file.evidence) || file.evidence.length === 0 || file.evidence.length > 20) return false;
  return file.evidence.every((value) => {
    if (!value || typeof value !== "object") return false;
    const entry = value as Record<string, unknown>;
    if (typeof entry.attemptId !== "string" || !/^att_[0-9a-f-]{36}$/.test(entry.attemptId) ||
        typeof entry.note !== "string" || entry.note.trim().length < 12 ||
        typeof entry.recordedBy !== "string" || entry.recordedBy.trim().length < 2) return false;
    if (entry.action === "prove_undispatched") return entry.usage === undefined;
    if (entry.action !== "record_usage" || !entry.usage || typeof entry.usage !== "object" || Array.isArray(entry.usage)) return false;
    const usage = entry.usage as Record<string, unknown>;
    const keys = ["inputTokens","outputTokens","cacheReadTokens","cacheWriteTokens","embeddingTokens","successfulSearchCount"];
    return Object.keys(usage).length === keys.length && keys.every((name) =>
      typeof usage[name] === "number" && Number.isSafeInteger(usage[name]) && (usage[name] as number) >= 0);
  });
}
if (args.length === 0 || args[0] === "--list") {
  if (args.length > 1) throw new Error("Usage: reconcile-usage.ts [--list | --apply evidence.json --confirm]");
  const { data, error } = await db.from("provider_attempts")
    .select("id,operation_id,stage_key,state,dispatch_day")
    .in("state", ["prepared","dispatched","unknown"]).order("created_at").limit(100);
  if (error) throw new Error("Could not list unfinished attempts.");
  for (const row of data ?? []) {
    process.stdout.write(`${row.operation_id} ${row.id} ${row.stage_key} ${row.state} ${row.dispatch_day ?? "undispatched"}\n`);
  }
} else if (args.length === 3 && args[0] === "--apply" && args[2] === "--confirm") {
  const parsed: unknown = JSON.parse(await readFile(args[1], "utf8"));
  if (!validEvidence(parsed)) throw new Error("Evidence file must identify attempts, operator, rationale, and recorded usage or proof of no dispatch.");
  const { data: attempts, error: lookupError } = await db.from("provider_attempts")
    .select("id,operation_id,state").eq("operation_id", parsed.operationId).in("id", parsed.evidence.map((item) => item.attemptId));
  if (lookupError || attempts?.length !== parsed.evidence.length ||
      parsed.evidence.some((item) => !attempts?.some((attempt) => attempt.id === item.attemptId))) {
    throw new Error("Evidence does not match the operation's unfinished attempts.");
  }
  const { error } = await db.rpc("reconcile_operation", { p_operation_id: parsed.operationId, p_evidence: parsed.evidence });
  if (error) throw new Error("Reconciliation rejected; inspect operation and evidence.");
  process.stdout.write(`Reconciled ${parsed.operationId}; verify ledger and day bucket.\n`);
} else {
  throw new Error("Usage: reconcile-usage.ts [--list | --apply evidence.json --confirm]");
}
