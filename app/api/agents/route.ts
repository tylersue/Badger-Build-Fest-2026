import { createAgent, createAgentInputSchema } from "@/lib/server/demo";
import { apiError, parseRequest, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseRequest(createAgentInputSchema, request, { maxJsonBytes: 4 * 1024 });
    const data = await createAgent(resolveDemoIdentity(request), input);
    return Response.json({ ok: true, data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
