import { importLegacyDraft, legacyImportInputSchema } from "@/lib/server/demo";
import { apiError, parseRequest, resolveDemoIdentity } from "@/lib/server/request";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { records } = await parseRequest(legacyImportInputSchema, request, { maxJsonBytes: 512 * 1024 });
    const results = await importLegacyDraft(resolveDemoIdentity(request), records);
    return Response.json({ ok: true, data: { results } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
