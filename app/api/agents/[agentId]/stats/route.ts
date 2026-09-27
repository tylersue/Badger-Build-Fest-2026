import { requireServiceDb } from "@/lib/server/db";
import { marketplaceRpc } from "@/lib/server/marketplace";
import { apiError, ApiRequestError, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
type Context = { params: Promise<{ agentId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const { agentId } = await context.params;
    const db = requireServiceDb();
    const agent = await db.from("agents").select("owner_id,status,updated_at").eq("id", agentId)
      .is("deleted_at", null).maybeSingle();
    if (agent.error) throw agent.error;
    if (!agent.data || (agent.data.status !== "published" && agent.data.owner_id !== resolveDemoIdentity(request)))
      throw new ApiRequestError("not_owner", "Agent is unavailable.", 404);
    const [answers, sources, activeChunks] = await Promise.all([
      db.from("answers").select("id,updated_at").eq("agent_id", agentId).is("deleted_at", null)
        .not("indexed_revision_id", "is", null),
      db.from("sources").select("id,updated_at").eq("agent_id", agentId).is("deleted_at", null)
        .not("active_revision_id", "is", null),
      marketplaceRpc<number>("active_agent_chunk_count", { p_agent_id: agentId }),
    ]);
    if (answers.error || sources.error) throw answers.error ?? sources.error;
    const lastUpdatedAt = [...(answers.data ?? []), ...(sources.data ?? [])]
      .map(row => row.updated_at).sort().at(-1) ?? agent.data.updated_at;
    return Response.json({ ok: true, data: { answers: answers.data?.length ?? 0,
      documents: sources.data?.length ?? 0, activeChunks, lastUpdatedAt } },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
