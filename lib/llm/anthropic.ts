import "server-only";
import { generateText, Output, streamText, type LanguageModelUsage, type TextStreamPart } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { MeteredStreamInput, MeteredStructuredInput, ServiceResult } from "@/lib/contracts/phase2";
import { getAnthropicEnv } from "@/lib/server/env";

export type ProviderUsage = Pick<LanguageModelUsage, "inputTokens" | "outputTokens" | "inputTokenDetails" | "raw">;
export type AnthropicEvent = TextStreamPart<Record<string, never>>;
export type AnthropicResponse = { value: unknown; steps: ProviderUsage[]; providerRequestId: string | null; successfulSearchCount: number };
export type AnthropicAdapter = {
  structured<T>(input: MeteredStructuredInput<T>, schema: MeteredStructuredInput<T>["schema"]): Promise<AnthropicResponse>;
  stream(input: MeteredStreamInput, options: { web: boolean; onEvent?: (event: AnthropicEvent) => Promise<void> | void }): Promise<AnthropicResponse>;
};

function rawSearches(steps: ProviderUsage[]): number | null {
  const values = steps.map((step) => {
    const raw = step.raw as Record<string, unknown> | undefined;
    const server = raw?.server_tool_use as Record<string, unknown> | undefined;
    return server?.web_search_requests;
  });
  if (!values.some((value) => value !== undefined)) return null;
  if (values.some((value) => value !== undefined && (!Number.isSafeInteger(value) || (value as number) < 0))) return null;
  return values.reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
}

/** This factory never substitutes a fake model when a server key is absent. */
export function anthropicAdapter(): ServiceResult<AnthropicAdapter> {
  const env = getAnthropicEnv();
  if (!env.ok) return env;
  const provider = createAnthropic({ apiKey: env.data.ANTHROPIC_API_KEY });
  return { ok: true, data: {
    async structured<T>(input: MeteredStructuredInput<T>, schema: MeteredStructuredInput<T>["schema"]): Promise<AnthropicResponse> {
      const result = await generateText({ model: provider(input.model), instructions: input.instructions, prompt: input.input,
        output: Output.object({ schema }), maxOutputTokens: input.limits.maxOutputTokens,
        timeout: input.limits.timeoutMs, maxRetries: 0 });
      const steps = result.steps.map((step) => step.usage);
      return { value: result.output, steps, providerRequestId: result.finalStep?.response?.id ?? null,
        successfulSearchCount: rawSearches(steps) ?? 0 };
    },
    async stream(input: MeteredStreamInput, options: { web: boolean; onEvent?: (event: AnthropicEvent) => Promise<void> | void }): Promise<AnthropicResponse> {
      const tools = options.web ? {
        web_search: provider.tools.webSearch_20250305({ maxUses: 1 }),
        web_fetch: provider.tools.webFetch_20260318({ maxUses: 2, maxContentTokens: 4000,
          citations: { enabled: true }, responseInclusion: "full" }),
      } : undefined;
      const result = streamText({ model: provider(input.model), instructions: input.instructions, prompt: input.input,
        maxOutputTokens: options.web ? Math.min(input.limits.maxOutputTokens, 1200) : input.limits.maxOutputTokens,
        timeout: input.limits.timeoutMs, maxRetries: 0, streamRetries: 0, tools });
      const steps: ProviderUsage[] = [];
      const text: string[] = [];
      let requestId: string | null = null;
      let toolSearches = 0;
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") text.push(part.text);
        if (part.type === "finish-step") {
          steps.push(part.usage);
          requestId = part.response.id ?? requestId;
        }
        if (part.type === "tool-result" && part.toolName === "web_search") toolSearches++;
        if (part.type === "error" || part.type === "abort") throw new Error("Provider stream did not complete");
        if (options.onEvent) await options.onEvent(part as AnthropicEvent);
      }
      return { value: text.join(""), steps, providerRequestId: requestId,
        successfulSearchCount: rawSearches(steps) ?? toolSearches };
    },
  } };
}
