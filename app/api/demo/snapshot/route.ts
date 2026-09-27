import { getDemoSnapshot } from "@/lib/server/demo";
import { apiError, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const data = await getDemoSnapshot(resolveDemoIdentity(request));
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
