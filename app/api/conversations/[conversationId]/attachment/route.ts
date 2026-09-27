import { z } from "zod";
import { extractConversationFile } from "@/lib/server/attachment";
import { requireServiceDb } from "@/lib/server/db";
import { requireHirerConversation } from "@/lib/server/conversations";
import { apiError, ApiRequestError, assertSameOrigin, parseRequest } from "@/lib/server/request";
import { MAX_FILE_BYTES } from "@/lib/config/publish";

export const runtime = "nodejs";
type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { conversationId } = await context.params;
    await requireHirerConversation(request, conversationId);
    const { data, error } = await requireServiceDb().from("conversation_attachments")
      .select("name,content").eq("conversation_id", conversationId).maybeSingle();
    if (error) throw error;
    return Response.json({ ok: true, data: data ? { name: data.name, chars: data.content.length } : null },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const { conversationId } = await context.params;
    const { agentId, actorId } = await requireHirerConversation(request, conversationId);
    const { file } = await parseRequest(z.strictObject({ file: z.instanceof(File) }), request,
      { maxFormBytes: MAX_FILE_BYTES + 8192, maxFields: 1 });
    const extracted = await extractConversationFile(file);
    const { error } = await requireServiceDb().from("conversation_attachments").insert({
      conversation_id: conversationId, agent_id: agentId, hirer_id: actorId,
      name: extracted.name, content: extracted.content,
    });
    if (error?.code === "23505") throw new ApiRequestError("conflict", "This conversation already has an attachment.", 409);
    if (error) throw error;
    return Response.json({ ok: true, data: { name: extracted.name, chars: extracted.chars } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { conversationId } = await context.params;
    await requireHirerConversation(request, conversationId);
    const { error } = await requireServiceDb().from("conversation_attachments").delete().eq("conversation_id", conversationId);
    if (error) throw error;
    return Response.json({ ok: true, data: { removed: true } });
  } catch (error) { return apiError(error); }
}
