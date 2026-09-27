import type { Agent, Profile, PersonaForm } from "./types";
import type { DemoSnapshot } from "./server/demo";
import type { IndexResult, SourceEstimate, ServiceError, ServiceResult } from "./contracts/phase2";
import type { ChatStreamEvent } from "@/features/runtime/events";
import type { InterviewView } from "@/features/builder/interview";

export class ApiClientError extends Error {
  constructor(readonly detail: ServiceError, readonly status: number) {
    super(detail.message); this.name = "ApiClientError";
  }
}
export const newRequestKey = () => `client:${crypto.randomUUID()}`;
const fallback: ServiceError = { code: "provider", message: "The request could not be completed.", retryable: true };

async function checked<T>(response: Response): Promise<T> {
  let body: ServiceResult<T> | undefined;
  try { body = await response.json() as ServiceResult<T>; } catch { /* Invalid upstream response. */ }
  if (!body || typeof body !== "object" || !("ok" in body))
    throw new ApiClientError({ ...fallback, message: "The server returned an invalid response." }, response.status);
  if (!body.ok) throw new ApiClientError(body.error, response.status);
  if (!response.ok) throw new ApiClientError(fallback, response.status);
  return body.data;
}

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; requestKey?: string; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { method: options.method ?? "GET", credentials: "same-origin", cache: "no-store",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json",
        ...(options.requestKey ? { "Idempotency-Key": options.requestKey } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: options.signal });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiClientError({ ...fallback, message: "Could not reach the server. Your draft is still saved." }, 0);
  }
  return checked<T>(response);
}

/** Retains the exact File object; the confirmation call must resend those bytes. */
async function sourceRequest<T>(agentId: string, action: "preflight" | "confirm", input: {
  fileOrText: File | string; name: string; estimateToken?: string; requestKey?: string; signal?: AbortSignal;
}): Promise<T> {
  const path = `/api/agents/${encodeURIComponent(agentId)}/sources`;
  const fields = { action, name: input.name, fileOrText: input.fileOrText,
    ...(action === "confirm" ? { estimateToken: input.estimateToken, requestKey: input.requestKey } : {}) };
  let body: BodyInit; let headers: HeadersInit;
  if (input.fileOrText instanceof File) {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) if (value !== undefined) form.append(name, value);
    body = form; headers = input.requestKey ? { "Idempotency-Key": input.requestKey } : {};
  } else {
    body = JSON.stringify(fields); headers = { "Content-Type": "application/json",
      ...(input.requestKey ? { "Idempotency-Key": input.requestKey } : {}) };
  }
  let response: Response;
  try { response = await fetch(path, { method: "POST", credentials: "same-origin", cache: "no-store",
    headers, body, signal: input.signal }); }
  catch (error) { if (input.signal?.aborted) throw error;
    throw new ApiClientError({ ...fallback, message: "Could not reach the server. Your source is still selected." }, 0); }
  return checked<T>(response);
}

export const api = {
  snapshot: (signal?: AbortSignal) => apiRequest<DemoSnapshot>("/api/demo/snapshot", { signal }),
  identity: (identityId: string) => apiRequest<{ identityId: string }>("/api/demo/identity", { method: "POST", body: { identityId } }),
  createAgent: (name: string, category: Agent["persona"]["category"]) => apiRequest<Agent>("/api/agents", { method: "POST", body: { name, category } }),
  saveProfile: (patch: Partial<Profile>, expectedVersion: number) => apiRequest<{ profile: Profile; version: number }>("/api/profile", { method: "PATCH", body: { patch, expectedVersion } }),
  grant: (kind: "subscription" | "pack", requestKey: string) => apiRequest<{ balanceUnits: string; grantUnits: string; replayed: boolean }>("/api/wallet/grants", { method: "POST", body: { kind, requestKey }, requestKey }),
  reset: () => apiRequest<DemoSnapshot>("/api/demo/reset", { method: "POST", body: {} }),
  importLegacy: (records: unknown[]) => apiRequest<{ results: { key: string | null; ok: boolean; imported?: boolean; code?: string }[] }>("/api/demo/import", { method: "POST", body: { records } }),
  interview: (agentId: string) => apiRequest<InterviewView>(`/api/agents/${encodeURIComponent(agentId)}/interview`),
  interviewControl: (agentId: string, control: string, requestKey: string) => apiRequest<InterviewView>(`/api/agents/${encodeURIComponent(agentId)}/interview`, { method: "POST", body: { action: "control", control }, requestKey }),
  interviewSubmit: (agentId: string, input: { questionId: string; text: string; expectedVersion: number; parentAnswerId?: string }, requestKey: string) =>
    apiRequest<InterviewView>(`/api/agents/${encodeURIComponent(agentId)}/interview`, { method: "POST", body: { action: "submit", ...input }, requestKey }),
  answerAction: (agentId: string, answerId: string, action: "edit" | "add-detail" | "retry-index", expectedVersion: number, requestKey: string, text?: string) =>
    apiRequest<unknown>(`/api/agents/${encodeURIComponent(agentId)}/answers/${encodeURIComponent(answerId)}`, { method: "PATCH", body: { action, expectedVersion, ...(text === undefined ? {} : { text }) }, requestKey }),
  deleteAnswer: (agentId: string, answerId: string, expectedVersion: number, requestKey: string) =>
    apiRequest<unknown>(`/api/agents/${encodeURIComponent(agentId)}/answers/${encodeURIComponent(answerId)}`, { method: "DELETE", body: { expectedVersion }, requestKey }),
  persona: (agentId: string) => apiRequest<unknown>(`/api/agents/${encodeURIComponent(agentId)}/persona`),
  savePersona: (agentId: string, patch: Partial<PersonaForm>, expectedVersions: Record<string, number>) =>
    apiRequest<unknown>(`/api/agents/${encodeURIComponent(agentId)}/persona`, { method: "PATCH", body: { action: "save-fields", patch, expectedVersions } }),
  sourcePreflight: (agentId: string, fileOrText: File | string, name: string) => sourceRequest<SourceEstimate>(agentId, "preflight", { fileOrText, name }),
  sourceConfirm: (agentId: string, fileOrText: File | string, name: string, estimateToken: string, requestKey: string) =>
    sourceRequest<IndexResult>(agentId, "confirm", { fileOrText, name, estimateToken, requestKey }),
  sourceRetryPreflight: (agentId: string, sourceId: string) => apiRequest<SourceEstimate>(`/api/agents/${encodeURIComponent(agentId)}/sources/${encodeURIComponent(sourceId)}`, { method: "POST", body: { action: "preflight-retry" } }),
  sourceRetry: (agentId: string, sourceId: string, estimateToken: string, requestKey: string) => apiRequest<IndexResult>(`/api/agents/${encodeURIComponent(agentId)}/sources/${encodeURIComponent(sourceId)}`, { method: "POST", body: { action: "retry", estimateToken, requestKey }, requestKey }),
  sourceResume: (agentId: string, sourceId: string, requestKey: string) => apiRequest<IndexResult>(`/api/agents/${encodeURIComponent(agentId)}/sources/${encodeURIComponent(sourceId)}`, { method: "POST", body: { action: "resume", requestKey }, requestKey }),
  sourceDelete: (agentId: string, sourceId: string) => apiRequest<unknown>(`/api/agents/${encodeURIComponent(agentId)}/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" }),
  sandboxTranscript: (agentId: string) => apiRequest<{ messages: unknown[] }>(`/api/agents/${encodeURIComponent(agentId)}/sandbox`),
  sandboxReplay: (agentId: string, operationId: string) => apiRequest<{ events: ChatStreamEvent[] }>(`/api/agents/${encodeURIComponent(agentId)}/sandbox?operationId=${encodeURIComponent(operationId)}`),
  publish: (agentId: string, publish: boolean, acceptConsent = false) =>
    apiRequest<{ status: string; consentAcceptedAt: string | null; activeChunks?: number }>(`/api/agents/${encodeURIComponent(agentId)}/publish`,
      { method: "POST", body: { publish, acceptConsent } }),
  publishStatus: (agentId: string) => apiRequest<{ activeChunks: number }>(`/api/agents/${encodeURIComponent(agentId)}/publish`),
  publicStats: (agentId: string) => apiRequest<{ answers: number; documents: number; activeChunks: number; lastUpdatedAt: string }>(
    `/api/agents/${encodeURIComponent(agentId)}/stats`),
  rate: (agentId: string, multiplier: number) => apiRequest<{ multiplier: number }>(`/api/agents/${encodeURIComponent(agentId)}/rate`,
    { method: "PATCH", body: { multiplier } }),
  createConversation: (agentId: string, title: string) => apiRequest<{ id: string }>("/api/conversations",
    { method: "POST", body: { agentId, title } }),
  conversationControls: (conversationId: string, input: { action: "share"; shareTranscript: boolean } | { action: "feedback"; messageId: string; feedback: "up" | "down" | null }) =>
    apiRequest<{ shareTranscript?: boolean; feedback?: "up" | "down" | null }>(`/api/conversations/${encodeURIComponent(conversationId)}/controls`,
      { method: "PATCH", body: input }),
  chatTranscript: (conversationId: string) => apiRequest<{ messages: unknown[] }>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`),
  chatReplay: (conversationId: string, operationId: string) => apiRequest<{ events: ChatStreamEvent[] }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages?operationId=${encodeURIComponent(operationId)}`),
  attachment: (conversationId: string) => apiRequest<{ name: string; chars: number } | null>(`/api/conversations/${encodeURIComponent(conversationId)}/attachment`),
  removeAttachment: (conversationId: string) => apiRequest<{ removed: true }>(`/api/conversations/${encodeURIComponent(conversationId)}/attachment`, { method: "DELETE" }),
};

/** One decoder handles fragmented UTF-8, split lines, replay duplicates, and explicit cancellation. */
export async function* decodeNdjson(stream: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  const reader = stream.getReader(); const decoder = new TextDecoder();
  let pending = ""; let sequence = -1; let operationId: string | null = null;
  const decode = (line: string): ChatStreamEvent | null => {
    let event: ChatStreamEvent;
    try { event = JSON.parse(line) as ChatStreamEvent; }
    catch { throw new ApiClientError({ ...fallback, message: "Invalid answer stream event." }, 502); }
    if (!event || !Number.isSafeInteger(event.sequence) || event.sequence < 0 || !event.operationId || !event.eventId || !event.type)
      throw new ApiClientError({ ...fallback, message: "Invalid answer stream event." }, 502);
    if (operationId && event.operationId !== operationId)
      throw new ApiClientError({ ...fallback, message: "Answer stream switched operations." }, 502);
    operationId = event.operationId;
    if (event.sequence <= sequence) return null;
    if (event.sequence !== sequence + 1)
      throw new ApiClientError({ ...fallback, message: "Answer stream has a missing event. Replay the operation." }, 502);
    sequence = event.sequence;
    return event;
  };
  try {
    while (true) {
      if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, newline).trim(); pending = pending.slice(newline + 1);
        if (line) { const event = decode(line); if (event) yield event; }
      }
    }
    pending += decoder.decode();
    if (pending.trim()) { const event = decode(pending.trim()); if (event) yield event; }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export async function* streamSandbox(agentId: string, text: string, requestKey: string, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  let response: Response;
  try { response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/sandbox`, {
    method: "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
    body: JSON.stringify({ text, requestKey }) }); }
  catch (error) { if (signal?.aborted) throw error;
    throw new ApiClientError({ ...fallback, message: "Connection lost. Replay with the same request key before sending again." }, 0); }
  if (!response.ok || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    await checked<never>(response); throw new ApiClientError(fallback, response.status);
  }
  if (!response.body) throw new ApiClientError({ ...fallback, message: "Answer stream is unavailable." }, 502);
  for await (const event of decodeNdjson(response.body, signal)) {
    yield event;
    if (event.type === "refusal" || event.type === "error") throw new ApiClientError(event.error, response.status);
  }
}

export async function* streamChat(conversationId: string, text: string, requestKey: string, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  let response: Response;
  try { response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
    body: JSON.stringify({ text, requestKey }) }); }
  catch (error) { if (signal?.aborted) throw error;
    throw new ApiClientError({ ...fallback, message: "Connection lost. Replay with the same request key before sending again." }, 0); }
  if (!response.ok || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    await checked<never>(response); throw new ApiClientError(fallback, response.status);
  }
  if (!response.body) throw new ApiClientError({ ...fallback, message: "Answer stream is unavailable." }, 502);
  for await (const event of decodeNdjson(response.body, signal)) {
    yield event;
    if (event.type === "refusal" || event.type === "error") throw new ApiClientError(event.error, response.status);
  }
}
