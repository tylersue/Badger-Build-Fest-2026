import { interviewRequestSchema } from "@/lib/contracts/schemas";
import { apiError, ApiRequestError, assertSameOrigin, parseRequest, requireAgentOwner, resolveDemoIdentity } from "@/lib/server/request";
import type { AgentOwnerLookup } from "@/lib/server/repository";
import { interviewService } from "@/features/builder/interview";

type Context = { params: Promise<{ agentId: string }> };
type Service = typeof interviewService;
function requestKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (!key || key.length > 200 || !/^[\w:.-]+$/.test(key))
    throw new ApiRequestError("invalid_input", "Idempotency-Key is required.", 400);
  return key;
}
export function createInterviewHandlers(service: Service = interviewService, owner?: AgentOwnerLookup) {
  return {
    async GET(request: Request, context: Context): Promise<Response> {
      try {
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, owner);
        const result = await service.read(agentId);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
    async POST(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const key = requestKey(request);
        const body = await parseRequest(interviewRequestSchema, request, { maxJsonBytes: 110 * 1024 });
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, owner);
        const result = body.action === "submit"
          ? await service.submitInterviewAnswer({ agentId, questionId: body.questionId, text: body.text,
            expectedVersion: body.expectedVersion, requestKey: key, parentAnswerId: body.parentAnswerId })
          : await service.controlInterview(agentId, body.control, key);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
  };
}
export const { GET, POST } = createInterviewHandlers();
