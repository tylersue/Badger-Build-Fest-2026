import { personaRequestSchema } from "@/lib/contracts/schemas";
import { apiError, parseRequest, requireAgentOwner, resolveDemoIdentity, ApiRequestError } from "@/lib/server/request";
import type { AgentOwnerLookup } from "@/lib/server/repository";
import { personaService, personaView, type PersonaResult } from "@/features/builder/persona";

type Service = typeof personaService;
type Context = { params: Promise<{ agentId: string }> };

/** Injectable boundary keeps the real owner check and form service testable offline. */
export function createPersonaHandlers(service: Service = personaService, ownerLookup?: AgentOwnerLookup) {
  async function view(agentId: string, state: NonNullable<Awaited<ReturnType<Service["read"]>>>) {
    return personaView(state, await service.reviewFieldIds(agentId, state));
  }
  return {
    async GET(request: Request, context: Context): Promise<Response> {
      try {
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        const state = await service.read(agentId);
        if (!state) throw new ApiRequestError("not_owner", "Agent is unavailable.", 404);
        return Response.json({ ok: true, data: await view(agentId, state) });
      } catch (error) { return apiError(error); }
    },
    async PATCH(request: Request, context: Context): Promise<Response> {
      try {
        const body = await parseRequest(personaRequestSchema, request, { maxJsonBytes: 64 * 1024 });
        const { agentId } = await context.params;
        await requireAgentOwner(resolveDemoIdentity(request), agentId, ownerLookup);
        let result: PersonaResult;
        switch (body.action) {
          case "save-fields": result = await service.savePersonaFields(agentId, body.patch, body.expectedVersions); break;
          case "accept-suggestion": result = await service.acceptSuggestion(agentId, body.field, body.expectedVersion); break;
          case "keep-suggestion": result = await service.keepSuggestion(agentId, body.field, body.expectedVersion); break;
          case "custom-prompt": result = await service.setCustomPrompt(agentId, body.text, body.expectedVersion); break;
          case "regenerate-prompt": result = await service.regeneratePrompt(agentId, body.expectedVersion, body.confirmed); break;
        }
        if (result.ok) return Response.json({ ok: true, data: await view(agentId, result.data) });
        if (result.error.code === "conflict") {
          const current = result.error.current ?? await service.read(agentId);
          return Response.json({ ok: false, error: { code: "conflict", message: result.error.message,
            retryable: true, conflictFieldIds: result.error.conflictFieldIds ?? [] },
            data: { current: current ? await view(agentId, current) : null,
              submittedPatch: result.error.submittedPatch ?? null } }, { status: 409 });
        }
        return apiError(result.error);
      } catch (error) { return apiError(error); }
    },
  };
}

export const { GET, PATCH } = createPersonaHandlers();
