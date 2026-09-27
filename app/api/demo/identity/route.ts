import { z } from "zod";
import { apiError, demoIdentityResponse, parseRequest } from "@/lib/server/request";

export const runtime = "nodejs";

const input = z.strictObject({ identityId: z.enum(["maria", "sam"]) });

export async function POST(request: Request): Promise<Response> {
  try {
    const { identityId } = await parseRequest(input, request, { maxJsonBytes: 1024 });
    return demoIdentityResponse(request, identityId);
  } catch (error) {
    return apiError(error);
  }
}
