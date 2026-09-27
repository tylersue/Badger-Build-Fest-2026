import { z } from "zod";
import { grantMockCredits } from "@/features/billing/service";
import { apiError, ApiRequestError, parseRequest, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";
const schema = z.strictObject({ kind: z.enum(["subscription", "pack"]), requestKey: z.string().min(1).max(200) });

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseRequest(schema, request, { maxJsonBytes: 2048 });
    if (request.headers.get("Idempotency-Key") !== body.requestKey)
      throw new ApiRequestError("invalid_input", "Matching Idempotency-Key is required.", 400);
    const result = await grantMockCredits(resolveDemoIdentity(request), body.kind, body.requestKey);
    return result.ok ? Response.json(result, { headers: { "Cache-Control": "no-store" } }) : apiError(result.error);
  } catch (error) { return apiError(error); }
}
