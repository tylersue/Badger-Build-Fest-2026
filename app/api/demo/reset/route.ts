import { resetPresentationFixtures } from "@/lib/server/demo";
import { apiError, assertSameOrigin, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const data = await resetPresentationFixtures(resolveDemoIdentity(request));
    return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
