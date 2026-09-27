import { z } from "zod";
import { marketplaceRpc } from "@/lib/server/marketplace";
import { apiError, parseRequest, requireAgentOwner, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
type Context = { params: Promise<{ agentId: string }> };
const schema = z.strictObject({ multiplier: z.number().min(1).max(5).refine(value => value * 2 === Math.trunc(value * 2)) });

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const input = await parseRequest(schema, request);
    const { agentId } = await context.params;
    const ownerId = resolveDemoIdentity(request);
    await requireAgentOwner(ownerId, agentId);
    const rate = await marketplaceRpc<number>("set_agent_rate", { p_agent_id: agentId, p_owner_id: ownerId, p_rate: input.multiplier });
    return Response.json({ ok: true, data: { multiplier: rate } });
  } catch (error) { return apiError(error); }
}
