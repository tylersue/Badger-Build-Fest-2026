import "server-only";
import { generateText, Output, stepCountIs, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { MeteredStreamInput, MeteredStructuredInput, ServiceResult } from "@/lib/contracts/phase2";
import { getOpenAIEnv } from "@/lib/server/env";
import type { AnthropicAdapter, AnthropicEvent, AnthropicResponse, ProviderUsage } from "./anthropic";

/** The same metered response shape is used by both text providers. */
export function openaiAdapter(): ServiceResult<AnthropicAdapter> {
  const env = getOpenAIEnv();
  if (!env.ok) return env;
  const provider = createOpenAI({ apiKey: env.data.OPENAI_API_KEY });
  return { ok: true, data: {
    async structured<T>(input: MeteredStructuredInput<T>, schema: MeteredStructuredInput<T>["schema"]): Promise<AnthropicResponse> {
      const captured: ProviderUsage[] = [];
      let requestId: string | null = null;
      try {
        const result = await generateText({ model: provider.responses(input.model), instructions: input.instructions,
          prompt: input.input, output: Output.object({ schema }), maxOutputTokens: input.limits.maxOutputTokens,
          timeout: input.limits.timeoutMs, maxRetries: 0, stopWhen: stepCountIs(1),
          providerOptions: { openai: { store: false } },
          onStepFinish: (step) => { captured.push(step.usage); requestId = step.response.id ?? requestId; } });
        return { value: result.output, steps: result.steps.map((step) => step.usage),
          providerRequestId: result.finalStep?.response?.id ?? requestId, successfulSearchCount: 0 };
      } catch {
        if (!captured.length) throw new Error("Provider usage unavailable");
        return { value: null, steps: captured, providerRequestId: requestId, successfulSearchCount: 0, failed: true };
      }
    },
    async stream(input: MeteredStreamInput, options: { web: boolean; onEvent?: (event: AnthropicEvent) => Promise<void> | void }): Promise<AnthropicResponse> {
      const result = streamText({ model: provider.responses(input.model), instructions: input.instructions,
        prompt: input.input, maxOutputTokens: options.web ? Math.min(input.limits.maxOutputTokens, 1200) : input.limits.maxOutputTokens,
        timeout: input.limits.timeoutMs, maxRetries: 0, streamRetries: 0, stopWhen: stepCountIs(1),
        providerOptions: { openai: { store: false, ...(options.web ? { maxToolCalls: 1,
          include: ["web_search_call.results" as const] } : {}) } },
        ...(options.web ? { tools: { web_search: provider.tools.webSearch({ searchContextSize: "low" }) },
          toolChoice: "required" as const } : {}) });
      const steps: ProviderUsage[] = [];
      const chunks: string[] = [];
      let requestId: string | null = null;
      let searches = 0;
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") chunks.push(part.text);
          if (part.type === "finish-step") { steps.push(part.usage); requestId = part.response.id ?? requestId; }
          if (part.type === "tool-call" && part.toolName === "web_search") searches++;
          if (part.type === "error" || part.type === "abort") throw new Error("Provider stream did not complete");
          if (options.onEvent) await options.onEvent(part as AnthropicEvent);
        }
      } catch {
        if (!steps.length) throw new Error("Provider usage unavailable");
        return { value: chunks.join(""), steps, providerRequestId: requestId,
          successfulSearchCount: searches, failed: true };
      }
      return { value: chunks.join(""), steps, providerRequestId: requestId,
        successfulSearchCount: searches };
    },
  } };
}
