import { conversationControlsSchema, updateConversationControls } from "@/lib/server/trust-controls";
import { apiError, parseRequest } from "@/lib/server/request";

export const runtime = "nodejs";
type Context = { params: Promise<{ conversationId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const input = await parseRequest(conversationControlsSchema, request, { maxJsonBytes: 4096 });
    const { conversationId } = await context.params;
    const data = await updateConversationControls(request, conversationId, input);
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
