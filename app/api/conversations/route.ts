import { z } from "zod";
import { marketplaceRpc } from "@/lib/server/marketplace";
import { apiError, parseRequest, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
const schema = z.strictObject({ agentId: z.string().min(1).max(200), title: z.string().trim().min(1).max(200) });
export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseRequest(schema, request, { maxJsonBytes: 4096 });
    const data = await marketplaceRpc<Record<string, unknown>>("create_hirer_conversation", {
      p_id: `conv_${crypto.randomUUID()}`, p_agent_id: input.agentId,
      p_hirer_id: resolveDemoIdentity(request), p_title: input.title,
    });
    return Response.json({ ok: true, data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
