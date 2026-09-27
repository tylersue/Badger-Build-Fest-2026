import { saveProfile, saveProfileInputSchema } from "@/lib/server/demo";
import { apiError, parseRequest, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";

export async function PATCH(request: Request): Promise<Response> {
  try {
    const input = await parseRequest(saveProfileInputSchema, request, { maxJsonBytes: 8 * 1024 });
    const data = await saveProfile(resolveDemoIdentity(request), input);
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
