import type { EvidenceCitation, RetrievedChunk, ToolStep } from "@/lib/contracts/phase2";
import type { ChatStreamEvent } from "@/features/runtime/events";

export type StreamCost = Extract<ChatStreamEvent, { type: "cost" }>;
export type AnswerState = {
  operationId: string | null; lastSequence: number; eventIds: string[];
  text: string; sources: RetrievedChunk[]; citations: EvidenceCitation[]; steps: ToolStep[];
  gap: string | null; cost: StreamCost | null; error: string | null; done: boolean;
};
export const emptyAnswer = (): AnswerState => ({ operationId: null, lastSequence: -1, eventIds: [],
  text: "", sources: [], citations: [], steps: [], gap: null, cost: null, error: null, done: false });

/** Apply durable events by identity and sequence. Replayed start/result pairs update one step. */
export function reduceAnswer(state: AnswerState, event: ChatStreamEvent): AnswerState {
  if (state.operationId && state.operationId !== event.operationId) return state;
  if (state.eventIds.includes(event.eventId) || event.sequence <= state.lastSequence) return state;
  const next: AnswerState = { ...state, operationId: event.operationId, lastSequence: event.sequence,
    eventIds: [...state.eventIds.slice(-127), event.eventId] };
  switch (event.type) {
    case "sources": return { ...next, sources: event.chunks };
    case "text-delta": return { ...next, text: next.text + event.delta };
    case "citations": return { ...next, citations: event.citations };
    case "knowledge-gap": return { ...next, gap: event.message };
    case "tool-start": case "tool-update": case "tool-result": {
      const steps = next.steps.filter(step => step.id !== event.step.id);
      steps.push(event.step);
      return { ...next, steps: steps.sort((a, b) => a.sequence - b.sequence) };
    }
    case "cost": return { ...next, cost: event };
    case "refusal": case "error": return { ...next, error: event.error.message };
    case "done": return { ...next, done: true };
    default: return next;
  }
}

export function replayAnswer(events: ChatStreamEvent[], initial = emptyAnswer()): AnswerState {
  return [...events].sort((a, b) => a.sequence - b.sequence).reduce(reduceAnswer, initial);
}

export function evidenceGroups(citations: EvidenceCitation[]) {
  return { expert: citations.filter(citation => citation.sourceType !== "web"),
    online: citations.filter(citation => citation.sourceType === "web") };
}

/** A snapshot stays immutable; current active IDs only affect the historical UI label. */
export function markDeletedSources(citations: EvidenceCitation[], activeDocuments: ReadonlySet<string>, activeAnswers: ReadonlySet<string>): EvidenceCitation[] {
  return citations.map(citation => {
    if (citation.sourceType === "web" || citation.historical || citation.url) return citation;
    const active = citation.sourceType === "document" ? activeDocuments : activeAnswers;
    return active.has(citation.sourceId) ? citation : { ...citation, historical: true };
  });
}

export function retainDraftOnResult(acknowledged: boolean, current: string): string {
  return acknowledged ? "" : current;
}
