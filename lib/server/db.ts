import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServiceError, ServiceResult } from "@/lib/contracts/phase2";
import { getDatabaseEnv } from "./env";
import type { Database } from "./db.types";

export type ServiceDb = SupabaseClient<Database>;
let cached: { url: string; client: ServiceDb } | null = null;

/** A database error crosses the adapter boundary without leaking SQL or credentials. */
export class DatabaseFailure extends Error {
  readonly retryable: boolean;
  constructor(message = "Database request failed.", retryable = true, readonly code: "configuration" | "indexing" = "indexing") {
    super(message);
    this.name = "DatabaseFailure";
    this.retryable = retryable;
  }
  toServiceError(): ServiceError { return { code: this.code, message: this.message, retryable: this.retryable }; }
}

/** Lazy service-role creation permits offline builds and explicit diagnostics. */
export function getServiceDb(): ServiceResult<ServiceDb> {
  const config = getDatabaseEnv();
  if (!config.ok) return config;
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = config.data;
  if (cached?.url === url) return { ok: true, data: cached.client };
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public" },
  });
  cached = { url, client };
  return { ok: true, data: client };
}

export function requireServiceDb(): ServiceDb {
  const result = getServiceDb();
  if (!result.ok) throw new DatabaseFailure(result.error.message, false, "configuration");
  return result.data;
}
