import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"] as const;
const optional = ["SUPABASE_ANON_KEY", "PHASE2_APP_URL", "LLM_DAILY_SPEND_CAP_USD", "LLM_PRICE_VERSION",
  "LLM_PRICE_POLICY", "WEB_ALLOWED_DOMAINS", "WEB_BLOCKED_DOMAINS"] as const;

export function phase2Env(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || values[match[1]] !== undefined) continue;
      const raw = match[2].trim();
      values[match[1]] = raw.replace(/^("|')(.*)\1$/, "$2");
    }
  }
  return { ...values, ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] =>
    typeof entry[1] === "string")) };
}

export function missingPhase2Env(env: Record<string, string>): string[] {
  return required.filter(name => !env[name]);
}

async function main() {
  const env = phase2Env();
  const offline = process.argv.includes("--offline");
  for (const name of [...required, ...optional]) console.log(`${name}: ${env[name] ? "set" : "missing"}`);
  const missing = missingPhase2Env(env);
  console.log(`Phase 2 configuration: ${missing.length ? `missing ${missing.join(", ")}` : "required names present"}`);
  if (offline) { console.log("Database reachability: skipped (--offline)"); return; }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Database reachability: unavailable (missing configuration)");
    process.exitCode = 1; return;
  }
  try {
    const url = new URL("/rest/v1/", env.SUPABASE_URL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("invalid URL");
    const response = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(8000) });
    console.log(`Database reachability: ${response.ok ? "reachable" : "failed"}`);
    if (!response.ok) process.exitCode = 1;
  } catch {
    console.log("Database reachability: failed");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(() => { console.error("Phase 2 diagnostics failed"); process.exitCode = 1; });
