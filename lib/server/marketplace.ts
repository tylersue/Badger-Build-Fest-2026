import "server-only";
import { ApiRequestError } from "./request";
import { requireServiceDb } from "./db";

type RpcError = { message: string } | null;
type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError }>;
export async function marketplaceRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const db = requireServiceDb();
  const result = await (db.rpc as unknown as Rpc).call(db, name, args);
  if (result.error) {
    const message = result.error.message;
    if (message.includes("PUBLISH_BLOCKED")) throw new ApiRequestError("conflict", "Complete the publish checklist with active knowledge before publishing.", 409);
    if (message.includes("CONSENT_REQUIRED")) throw new ApiRequestError("conflict", "Content consent is required.", 409);
    if (message.includes("NOT_PUBLISHED")) throw new ApiRequestError("conflict", "This agent is not accepting new chats.", 409);
    if (message.includes("NOT_OWNER")) throw new ApiRequestError("not_owner", "This action is unavailable.", 404);
    if (message.includes("INVALID_INPUT")) throw new ApiRequestError("invalid_input", "Invalid request.", 400);
    throw new Error("Marketplace database request failed.");
  }
  return result.data as T;
}
