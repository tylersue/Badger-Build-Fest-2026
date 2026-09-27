import "server-only";
import { z } from "zod";
import { DatabaseFailure, requireServiceDb, type ServiceDb } from "./db";
import { requireHirerConversation } from "./conversations";
import { ApiRequestError } from "./request";

export const conversationControlsSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("share"), shareTranscript: z.boolean() }),
  z.strictObject({ action: z.literal("feedback"), messageId: z.string().min(1).max(200), feedback: z.enum(["up", "down"]).nullable() }),
]);
export type ConversationControlsInput = z.infer<typeof conversationControlsSchema>;

/** The hirer boundary is checked in SQL for every write, including feedback resets. */
export async function updateConversationControls(request: Request, conversationId: string,
  input: ConversationControlsInput, db: ServiceDb = requireServiceDb()) {
  const { actorId } = await requireHirerConversation(request, conversationId, async id => {
    const { data, error } = await db.from("conversations").select("agent_id,hirer_id,mode").eq("id", id).maybeSingle();
    if (error) throw new DatabaseFailure("Conversation lookup failed.", true);
    return data;
  });
  if (input.action === "share") {
    const { data, error } = await db.from("conversations").update({ share_transcript: input.shareTranscript })
      .eq("id", conversationId).eq("hirer_id", actorId).eq("mode", "chat").select("share_transcript").maybeSingle();
    if (error) throw new DatabaseFailure("Sharing update failed.", true);
    if (!data) throw new ApiRequestError("not_owner", "Conversation is unavailable.", 404);
    return { shareTranscript: data.share_transcript };
  }
  const { data, error } = await db.from("messages").update({ feedback: input.feedback })
    .eq("id", input.messageId).eq("conversation_id", conversationId).eq("role", "assistant").select("feedback").maybeSingle();
  if (error) throw new DatabaseFailure("Feedback update failed.", true);
  if (!data) throw new ApiRequestError("not_owner", "Answer is unavailable.", 404);
  return { feedback: data.feedback };
}
