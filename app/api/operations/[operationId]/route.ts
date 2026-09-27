import { getOperationForIdentity } from "@/features/billing/service";
import { apiError, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
export async function GET(request: Request, context: RouteContext<"/api/operations/[operationId]">): Promise<Response> {
  try {
    const identityId = resolveDemoIdentity(request);
    const { operationId } = await context.params;
    const result = await getOperationForIdentity(operationId, identityId);
    if (!result.ok) return apiError(result.error);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
