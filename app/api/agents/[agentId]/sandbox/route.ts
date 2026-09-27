import { z } from "zod";
import { AnswerFailure, createSqlAnswerStore, runAnswer } from "@/features/runtime/agent";
import { getOperationForIdentity } from "@/features/billing/service";
import { requireServiceDb } from "@/lib/server/db";
import { apiError, ApiRequestError, parseRequest, requireAgentOwner, resolveDemoIdentity } from "@/lib/server/request";
import type { ChatStreamEvent } from "@/features/runtime/events";
import { parseStoredMoney } from "@/lib/money";

export const runtime = "nodejs";
type Context = { params: Promise<{ agentId: string }> };
const bodySchema = z.strictObject({ text: z.string().trim().min(1).max(4000), requestKey: z.string().min(1).max(200) });

async function ownedSandbox(request: Request, agentId: string) {
  const actorId = resolveDemoIdentity(request);
  await requireAgentOwner(actorId, agentId);
  const conversationId = `sandbox:${agentId}`;
  const { data, error } = await requireServiceDb().from("conversations")
    .select("id,agent_id,hirer_id,mode").eq("id", conversationId).maybeSingle();
  if (error) throw error;
  if (!data || data.agent_id !== agentId || data.hirer_id !== actorId || data.mode !== "sandbox")
    throw new ApiRequestError("not_owner", "Sandbox is unavailable.", 404);
  return { actorId, conversationId };
}

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { agentId } = await context.params;
    const { actorId, conversationId } = await ownedSandbox(request, agentId);
    const operationId = new URL(request.url).searchParams.get("operationId");
    if (operationId) {
      const operation = await getOperationForIdentity(operationId, actorId);
      if (!operation.ok) return apiError(operation.error);
      if (operation.data.operation.agentId !== agentId || operation.data.operation.purpose !== "sandbox")
        throw new ApiRequestError("not_owner", "Operation is unavailable.", 404);
      const events = await createSqlAnswerStore().replay(operationId);
      return Response.json({ ok: true, data: { events, operation: operation.data.operation } },
        { headers: { "Cache-Control": "private, no-store" } });
    }
    const { data, error } = await requireServiceDb().from("messages").select("*")
      .eq("conversation_id", conversationId).order("created_at");
    if (error) throw error;
    const messages = (data ?? []).map(row => ({ ...row,
      charged_units: row.charged_units == null ? null : parseStoredMoney(row.charged_units) }));
    return Response.json({ ok: true, data: { messages } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const { agentId } = await context.params;
    const { actorId, conversationId } = await ownedSandbox(request, agentId);
    const input = await parseRequest(bodySchema, request, { maxJsonBytes: 8192 });
    if (request.headers.get("Idempotency-Key") !== input.requestKey)
      throw new ApiRequestError("invalid_input", "Matching Idempotency-Key is required.", 400);
    const producer = runAnswer({ agentId, actorId, conversationId, requestKey: input.requestKey,
      text: input.text, mode: "sandbox" })[Symbol.asyncIterator]();
    // Pull once before sending headers so pre-dispatch refusals keep their typed HTTP status.
    const first = await producer.next();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          if (!first.done) write(first.value);
          if (!first.done) for await (const event of { [Symbol.asyncIterator]: () => producer }) write(event);
        } catch { /* Persisted events remain available through replay. */ }
        finally { try { controller.close(); } catch { /* Client cancelled the stream. */ } }
      },
      async cancel() { await producer.return?.(); },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error instanceof AnswerFailure ? error.detail : error); }
}
