import { answerRequestSchema, deleteRequestSchema } from "@/lib/contracts/schemas";
import { apiError, ApiRequestError, assertSameOrigin, parseRequest, requireAgentOwner, resolveDemoIdentity } from "@/lib/server/request";
import type { AgentOwnerLookup } from "@/lib/server/repository";
import { interviewService } from "@/features/builder/interview";

type Context = { params: Promise<{ agentId: string; answerId: string }> };
type Service = typeof interviewService;
function requestKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (!key || key.length > 200 || !/^[\w:.-]+$/.test(key))
    throw new ApiRequestError("invalid_input", "Idempotency-Key is required.", 400);
  return key;
}
export function createAnswerHandlers(service: Service = interviewService, owner?: AgentOwnerLookup) {
  return {
    async PATCH(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const key = requestKey(request);
        const body = await parseRequest(answerRequestSchema, request, { maxJsonBytes: 110 * 1024 });
        const { agentId, answerId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, owner);
        const result = body.action === "edit"
          ? await service.editAnswer(agentId, answerId, body.text, body.expectedVersion, key)
          : body.action === "add-detail"
            ? await service.addDetail(agentId, answerId, body.text, body.expectedVersion, key)
            : await service.retryAnswerIndex(agentId, answerId, body.expectedVersion, key);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
    async DELETE(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const key = requestKey(request);
        const body = await parseRequest(deleteRequestSchema, request, { maxJsonBytes: 1024 });
        const { agentId, answerId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, owner);
        const result = await service.deleteAnswer(agentId, answerId, body.expectedVersion, key);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
  };
}
export const { PATCH, DELETE } = createAnswerHandlers();
