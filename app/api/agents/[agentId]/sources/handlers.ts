import { z } from "zod";
import { apiError, assertSameOrigin, requireAgentOwner, resolveDemoIdentity, ApiRequestError, parseRequest } from "@/lib/server/request";
import type { AgentOwnerLookup } from "@/lib/server/repository";
import { preflightSource, confirmSource, listSources } from "@/features/knowledge/intake";

type Context = { params: Promise<{ agentId: string }> };
const name = z.string().trim().min(1).max(200);
const key = z.string().min(1).max(200);
const text = z.string().min(1).max(100_000);
const file = z.instanceof(File);
const preflight = z.union([
  z.strictObject({ action: z.literal("preflight"), name, fileOrText: text }),
  z.strictObject({ action: z.literal("preflight"), name, fileOrText: file }),
]);
const confirm = z.strictObject({ action: z.literal("confirm"), name,
  fileOrText: z.union([text, file]).optional(), estimateToken: key, requestKey: key });
const bodySchema = z.union([preflight, confirm]);
type Services = { preflight: typeof preflightSource; confirm: typeof confirmSource; list: typeof listSources };
const live: Services = { preflight: preflightSource, confirm: confirmSource, list: listSources };

export function createSourceHandlers(services: Services = live, ownerLookup?: AgentOwnerLookup) {
  return {
    async GET(request: Request, context: Context): Promise<Response> {
      try {
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        const result = await services.list(agentId);
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
    async POST(request: Request, context: Context): Promise<Response> {
      try {
        assertSameOrigin(request);
        const body = await parseRequest(bodySchema, request,
          { maxJsonBytes: 400_000, maxFormBytes: 5 * 1024 * 1024 + 64 * 1024, maxFields: 5 });
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        if (body.action === "preflight") {
          const result = await services.preflight({ agentId, name: body.name, fileOrText: body.fileOrText });
          return result.ok ? Response.json(result) : apiError(result.error);
        }
        if (request.headers.get("Idempotency-Key") !== body.requestKey)
          throw new ApiRequestError("invalid_input", "Matching Idempotency-Key is required.", 400);
        if (body.fileOrText === undefined) throw new ApiRequestError("stale_estimate",
          "Select the original file or text and get a new estimate.", 409);
        const result = await services.confirm({ agentId, name: body.name, fileOrText: body.fileOrText,
          estimateToken: body.estimateToken, requestKey: body.requestKey });
        return result.ok ? Response.json(result) : apiError(result.error);
      } catch (error) { return apiError(error); }
    },
  };
}
