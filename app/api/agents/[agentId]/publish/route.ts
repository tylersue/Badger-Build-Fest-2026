import { z } from "zod";
import { marketplaceRpc } from "@/lib/server/marketplace";
import { apiError, parseRequest, requireAgentOwner, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
type Context = { params: Promise<{ agentId: string }> };
const schema = z.strictObject({ publish: z.boolean(), acceptConsent: z.boolean().optional() });

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { agentId } = await context.params;
    await requireAgentOwner(resolveDemoIdentity(request), agentId);
    const activeChunks = await marketplaceRpc<number>("active_agent_chunk_count", { p_agent_id: agentId });
    return Response.json({ ok: true, data: { activeChunks } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const input = await parseRequest(schema, request);
    const { agentId } = await context.params;
    const ownerId = resolveDemoIdentity(request);
    await requireAgentOwner(ownerId, agentId);
    const data = await marketplaceRpc<{ status: string; consentAcceptedAt: string | null; activeChunks?: number }>(
      "set_agent_published", { p_agent_id: agentId, p_owner_id: ownerId,
        p_publish: input.publish, p_accept_consent: input.acceptConsent ?? false });
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
