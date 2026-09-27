import "server-only";
import { z } from "zod";
import type { ServiceError, ServiceErrorCode, ServiceResult } from "@/lib/contracts/phase2";
import { DatabaseFailure } from "./db";
import { createRepository, type AgentOwnerLookup } from "./repository";

const COOKIE = "bx-demo-identity";
const DEMO_IDENTITIES = new Set(["maria", "sam"]);
const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_ERRORS: Record<ServiceErrorCode, { status: number; message: string }> = {
  invalid_input: { status: 400, message: "Invalid request." },
  not_owner: { status: 404, message: "Agent is unavailable." },
  conflict: { status: 409, message: "Request conflicts with current state." },
  insufficient_credits: { status: 402, message: "Insufficient credits." },
  daily_cap: { status: 429, message: "Daily spending limit reached." },
  configuration: { status: 503, message: "Service is not configured." },
  quota: { status: 429, message: "Source limit reached." },
  stale_estimate: { status: 409, message: "Estimate expired or content changed." },
  provider: { status: 502, message: "Provider request failed." },
  indexing: { status: 503, message: "Indexing request failed." },
  unknown_usage: { status: 202, message: "Usage is pending reconciliation." },
};

export class ApiRequestError extends Error {
  constructor(readonly code: ServiceErrorCode, message: string, readonly status: number, readonly retryable = false) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** The selector is demo state, not authentication. Reject all non-switchable IDs. */
export function resolveDemoIdentity(request: Request): string {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const raw = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!raw) return "maria";
  let identity: string;
  try { identity = decodeURIComponent(raw.slice(COOKIE.length + 1)); }
  catch { throw new ApiRequestError("invalid_input", "Invalid demo identity.", 400); }
  if (!DEMO_IDENTITIES.has(identity)) throw new ApiRequestError("invalid_input", "Invalid demo identity.", 400);
  return identity;
}

/** Mutations must originate from this exact URL origin. */
export function assertSameOrigin(request: Request): void {
  if (!MUTATIONS.has(request.method.toUpperCase())) return;
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin ? origin !== expected : request.headers.get("sec-fetch-site") !== "same-origin") {
    throw new ApiRequestError("invalid_input", "Request origin is not allowed.", 403);
  }
}

/** Used by POST /api/demo/identity after validating the body. */
export function demoIdentityResponse(request: Request, identityId: string): Response {
  assertSameOrigin(request);
  if (!DEMO_IDENTITIES.has(identityId)) throw new ApiRequestError("invalid_input", "Invalid demo identity.", 400);
  const response = Response.json({ ok: true, data: { identityId } } satisfies ServiceResult<{ identityId: string }>);
  response.headers.append("Set-Cookie", `${COOKIE}=${identityId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
  return response;
}

/** Check the owner in SQL for every agent-scoped request; tests inject a lookup. */
export async function requireAgentOwner(identityId: string, agentId: string, lookup?: AgentOwnerLookup): Promise<void> {
  if (!DEMO_IDENTITIES.has(identityId) || !agentId || agentId.length > 200) {
    throw new ApiRequestError("not_owner", "Agent is unavailable.", 404);
  }
  const owner = await (lookup ?? createRepository()).findAgentOwner(agentId);
  if (owner !== identityId) throw new ApiRequestError("not_owner", "Agent is unavailable.", 404);
}

export type ParseOptions = { maxJsonBytes?: number; maxFormBytes?: number; maxFields?: number };
async function readBounded(request: Request, limit: number): Promise<Uint8Array> {
  const announced = request.headers.get("content-length");
  if (announced !== null && (!/^\d+$/.test(announced) || Number(announced) > limit)) {
    throw new ApiRequestError("invalid_input", "Request body is too large.", 413);
  }
  if (!request.body) throw new ApiRequestError("invalid_input", "Request body is required.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new ApiRequestError("invalid_input", "Request body is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** Strict bounded JSON/form boundary. Schemas should use z.strictObject for nested objects. */
export async function parseRequest<T>(schema: z.ZodType<T>, request: Request, options: ParseOptions = {}): Promise<T> {
  assertSameOrigin(request);
  const contentType = request.headers.get("content-type") ?? "";
  const media = contentType.split(";")[0]?.trim().toLowerCase();
  let input: unknown;
  if (media === "application/json") {
    const bytes = await readBounded(request, options.maxJsonBytes ?? 64 * 1024);
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new ApiRequestError("invalid_input", "Invalid JSON body.", 400); }
  } else if (media === "multipart/form-data" || media === "application/x-www-form-urlencoded") {
    const bytes = await readBounded(request, options.maxFormBytes ?? 5 * 1024 * 1024);
    let form: FormData;
    try { form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: bytes.buffer as ArrayBuffer }).formData(); }
    catch { throw new ApiRequestError("invalid_input", "Invalid form body.", 400); }
    if ([...form.keys()].length > (options.maxFields ?? 30)) throw new ApiRequestError("invalid_input", "Too many form fields.", 400);
    const entries: Record<string, FormDataEntryValue> = {};
    for (const [key, value] of form.entries()) {
      if (Object.hasOwn(entries, key)) throw new ApiRequestError("invalid_input", "Duplicate form field.", 400);
      entries[key] = value;
    }
    input = entries;
  } else {
    throw new ApiRequestError("invalid_input", "Unsupported content type.", 415);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ApiRequestError("invalid_input", "Invalid request body.", 400);
  // Even ordinary z.object strips extra properties; explicitly reject that input.
  if (input && typeof input === "object" && !Array.isArray(input) && parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
    const accepted = new Set(Object.keys(parsed.data));
    if (Object.keys(input).some((key) => !accepted.has(key))) throw new ApiRequestError("invalid_input", "Unknown request field.", 400);
  }
  return parsed.data;
}

/** The only API error serialization path; raw provider and SQL errors are never sent. */
export function apiError(error: unknown): Response {
  let status = 500;
  let body: ServiceError;
  if (error instanceof ApiRequestError) {
    status = error.status;
    body = { code: error.code, message: error.message, retryable: error.retryable };
  } else if (error instanceof DatabaseFailure) {
    status = error.retryable ? 503 : 500;
    body = error.toServiceError();
  } else if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && Object.hasOwn(PUBLIC_ERRORS, error.code)) {
    const known = error as Partial<ServiceError> & { code: ServiceErrorCode };
    status = PUBLIC_ERRORS[known.code].status;
    body = { code: known.code, message: PUBLIC_ERRORS[known.code].message, retryable: known.retryable === true };
    if (typeof known.operationId === "string" && known.operationId.length <= 200) body.operationId = known.operationId;
    for (const key of ["neededUnits", "availableUnits"] as const) {
      const value = known[key];
      if (typeof value === "string" && /^(0|[1-9]\d{0,25})$/.test(value)) body[key] = value;
    }
    if (typeof known.resetAt === "string" && !Number.isNaN(Date.parse(known.resetAt))) body.resetAt = known.resetAt;
  } else {
    body = { code: "provider", message: "Request could not be completed.", retryable: true };
  }
  return Response.json({ ok: false, error: body } satisfies ServiceResult<never>, { status });
}
