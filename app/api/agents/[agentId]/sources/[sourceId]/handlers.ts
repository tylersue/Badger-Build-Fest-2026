import { z } from "zod";
import { apiError, assertSameOrigin, requireAgentOwner, resolveDemoIdentity, ApiRequestError, parseRequest } from "@/lib/server/request";
import type { AgentOwnerLookup } from "@/lib/server/repository";
import { preflightSourceRetry, retrySource, resumeSource, deleteSource } from "@/features/knowledge/intake";

type Context = { params: Promise<{ agentId: string; sourceId: string }> };
const key = z.string().min(1).max(200);
const bodySchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("preflight-retry") }),
  z.strictObject({ action: z.literal("retry"), estimateToken: key, requestKey: key }),
  z.strictObject({ action: z.literal("resume"), requestKey: key }),
]);
type Services = { preflightRetry: typeof preflightSourceRetry; retry: typeof retrySource;
  resume: typeof resumeSource; delete: typeof deleteSource };
const live: Services = { preflightRetry: preflightSourceRetry, retry: retrySource,
  resume: resumeSource, delete: deleteSource };

export function createSourceItemHandlers(services: Services = live, ownerLookup?: AgentOwnerLookup) {
  return {
    async POST(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const body = await parseRequest(bodySchema, request, { maxJsonBytes: 2048 });
        const { agentId, sourceId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        if (body.action === "preflight-retry") {
          const result = await services.preflightRetry(agentId, sourceId);
          return result.ok ? Response.json(result) : apiError(result.error);
        }
        if (request.headers.get("Idempotency-Key") !== body.requestKey)
          throw new ApiRequestError("invalid_input", "Matching Idempotency-Key is required.", 400);
        const result = body.action === "retry"
          ? await services.retry({ agentId, sourceId, estimateToken: body.estimateToken,
              requestKey: body.requestKey })
          : await services.resume(agentId, sourceId);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
    async DELETE(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const { agentId, sourceId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        const result = await services.delete(agentId, sourceId);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
  };
}
