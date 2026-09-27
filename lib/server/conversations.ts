import "server-only";
import { requireServiceDb } from "./db";
import { ApiRequestError, resolveDemoIdentity } from "./request";

export type ConversationAccessRow = { agent_id: string; hirer_id: string; mode: string };
export type ConversationLookup = (id: string) => Promise<ConversationAccessRow | null>;

async function sqlLookup(id: string): Promise<ConversationAccessRow | null> {
  const { data, error } = await requireServiceDb().from("conversations")
    .select("agent_id,hirer_id,mode").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Attachment and message routes share the same private hirer boundary. */
export async function requireHirerConversation(request: Request, conversationId: string,
  lookup: ConversationLookup = sqlLookup): Promise<{ actorId: string; agentId: string }> {
  const actorId = resolveDemoIdentity(request);
  if (!conversationId || conversationId.length > 200)
    throw new ApiRequestError("not_owner", "Conversation is unavailable.", 404);
  const row = await lookup(conversationId);
  if (!row || row.mode !== "chat" || row.hirer_id !== actorId)
    throw new ApiRequestError("not_owner", "Conversation is unavailable.", 404);
  return { actorId, agentId: row.agent_id };
}
