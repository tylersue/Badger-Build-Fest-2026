import { z } from "zod";
import { AnswerFailure, createSqlAnswerStore, runAnswer } from "@/features/runtime/agent";
import type { ChatStreamEvent } from "@/features/runtime/events";
import { getOperationForIdentity } from "@/features/billing/service";
import { requireServiceDb } from "@/lib/server/db";
import { requireHirerConversation } from "@/lib/server/conversations";
import { apiError, ApiRequestError, parseRequest } from "@/lib/server/request";
import { parseStoredMoney } from "@/lib/money";

export const runtime = "nodejs";
type Context = { params: Promise<{ conversationId: string }> };
const schema = z.strictObject({ text: z.string().trim().min(1).max(4000), requestKey: z.string().min(1).max(200) });

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { conversationId } = await context.params;
    const { actorId, agentId } = await requireHirerConversation(request, conversationId);
    const operationId = new URL(request.url).searchParams.get("operationId");
    if (operationId) {
      const operation = await getOperationForIdentity(operationId, actorId);
      if (!operation.ok) return apiError(operation.error);
      if (operation.data.operation.agentId !== agentId || operation.data.operation.purpose !== "chat")
        throw new ApiRequestError("not_owner", "Operation is unavailable.", 404);
      const linked = await requireServiceDb().from("messages").select("id")
        .eq("operation_id", operationId).eq("conversation_id", conversationId).limit(1);
      if (linked.error) throw linked.error;
      if (!linked.data?.length) throw new ApiRequestError("not_owner", "Operation is unavailable.", 404);
      const store = createSqlAnswerStore();
      let events = await store.replay(operationId);
      if (!events.some(event => event.type === "done")) {
        await store.recover(operationId);
        events = await store.replay(operationId);
      }
      return Response.json({ ok: true, data: { events, operation: operation.data.operation } },
        { headers: { "Cache-Control": "private, no-store" } });
    }
    const { data, error } = await requireServiceDb().from("messages").select("*")
      .eq("conversation_id", conversationId).order("created_at");
    if (error) throw error;
    return Response.json({ ok: true, data: { messages: (data ?? []).map(row => ({ ...row,
      charged_units: row.charged_units == null ? null : parseStoredMoney(row.charged_units) })) } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const { conversationId } = await context.params;
    const { actorId, agentId } = await requireHirerConversation(request, conversationId);
    const input = await parseRequest(schema, request, { maxJsonBytes: 8192 });
    if (request.headers.get("Idempotency-Key") !== input.requestKey)
      throw new ApiRequestError("invalid_input", "Matching Idempotency-Key is required.", 400);
    const producer = runAnswer({ agentId, actorId, conversationId, requestKey: input.requestKey,
      text: input.text, mode: "chat" })[Symbol.asyncIterator]();
    const first = await producer.next();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          if (!first.done) write(first.value);
          if (!first.done) for await (const event of { [Symbol.asyncIterator]: () => producer }) write(event);
        } catch { /* Durable events can be replayed. */ }
        finally { try { controller.close(); } catch { /* Client disconnected. */ } }
      },
      async cancel() { await producer.return?.(); },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error instanceof AnswerFailure ? error.detail : error); }
}
