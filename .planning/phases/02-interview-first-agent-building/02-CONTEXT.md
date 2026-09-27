# Phase 2: Interview-First Agent Building - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the real typed interview, editable and retrievable answers, interview-drafted persona, optional document intake, agent-scoped retrieval, and sandbox using the shared answer pipeline. Replace Phase 1's canned calls with real usage logging, raw-cost charges, wallet reservation, and the daily spend cap.

**Scope change from this discussion:** When expert material is insufficient, the shared pipeline searches online and answers with separately labeled external citations, a note describing the gap in expert knowledge, and visible web tool steps. This applies to both sandbox and hirer chat; Phase 2 builds the pipeline and Phase 3 connects it to published chat. This supersedes earlier expert-only refusal and no-web-access language in project documents. Online findings never become the expert's knowledge automatically.

</domain>

<decisions>
## Implementation Decisions

### Interview
- **D-01:** After opening questions, follow one thread deeply through examples, reasoning, and exceptions before switching topics. For vague answers, keep asking focused follow-ups until there is a concrete example or the expert skips.
- **D-02:** The expert can pause and resume, edit any captured answer, and later add a linked follow-up without losing the original response.
- **D-03:** Once the interview has useful examples and working principles, suggest moving to persona and testing; the expert can keep interviewing.

### Persona
- **D-04:** Draft supported persona fields as the interview unfolds; leave unsupported fields blank. Later answers update untouched fields automatically. Preserve expert edits and show new suggestions for those fields.
- **D-05:** Write concise, polished copy faithful to the expert's meaning. Do not invent claims or credentials.
- **D-06:** If the expert edits the Advanced prompt, keep it marked as custom after form changes. Regenerate from the form only on explicit request. Platform safety rules remain outside the editable prompt.

### Knowledge and sandbox
- **D-07:** Use separate interview-answer and document sections on one Knowledge page. Answers show their source question and edit controls; documents show status, page and chunk counts.
- **D-08:** Before processing an upload or pasted text, show remaining source limits and approximate credit cost, then ask the expert to confirm. Settle the actual charge afterward under the existing wallet rules.
- **D-09:** Each sandbox answer has a collapsed Retrieved sources control with excerpts, source names, question or page, and relevance scores.
- **D-10:** If expert material is insufficient, web search is the answer fallback in both sandbox and hirer chat. Cite expert and online sources separately when both contribute, and state which part the expert's material did not cover. Do not present online findings as the expert's own views or add them to the agent's knowledge.
- **D-11:** Show expandable search and page-read steps in chat as they happen, including the search query, page title, and link. Keep the answer's external citations distinct from interview and document citations.

### Planner's discretion
- Choose interview readiness heuristics, source limits, and cost-estimate method while preserving the behaviors above. If web search yields no usable evidence, give a clear uncertainty response rather than inventing an answer.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md` — current product scope and constraints, including the explicit web-fallback decision.
- `.planning/REQUIREMENTS.md` — requirement IDs and traceability for interview, persona, documents, retrieval, sandbox, chat, and credits.
- `.planning/ROADMAP.md` — Phase 2–4 goals, dependencies, and acceptance gates aligned with the web fallback.
- `.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md` — locked LangSmith-style builder, seeded identities, wallet reservation, and raw build costs.
- `.planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md` — split builder layout, interview and test threads, source chips, and chat presentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/app/builder-section.tsx`, `components/app/builder.tsx`, and `components/app/chat.tsx` already provide the interview/test split, config drawer, composer, citations, retrieved-source chip, and credit refusal UI.
- `features/builder/prompt-template.ts`, `features/knowledge/search.ts`, `features/runtime/agent.ts`, and `features/billing/pricing.ts` are the shared prompt, retrieval, stream, and cost contracts.

### Established Patterns
- `lib/demo-store.ts` persists Phase 1 demo state in browser storage. Interview and sandbox replies and usage are canned; Phase 2 needs real persistence and service calls while preserving seeded demo behavior.
- `lib/types.ts` currently recognizes only interview/document citations, and `ChatStreamEvent` in `features/runtime/agent.ts` has no web-tool step. The real pipeline must represent external provenance and visible tool activity.

### Integration Points
- Builder routes under `app/(app)/build/[agentId]/[section]/` mount interview, persona, knowledge, and test views. `app/(app)/chat/` uses the answer pipeline in Phase 3.
- `features/knowledge/search.ts` currently fabricates fallback chunks for agents without stored chunks; real weak-retrieval behavior must trigger the separately labeled web path instead.

</code_context>

<specifics>
## Specific Ideas

- The expert can return to an earlier answer at any time to add detail.
- Online sourcing is an explicit user-directed change to the earlier expert-only policy. Show the tool calls in chat, not only the final links.
- Keep planning Markdown concise.

</specifics>

<deferred>
## Deferred Ideas

None. Online fallback was explicitly brought into this phase rather than deferred.

</deferred>

---

*Phase: 02-interview-first-agent-building*
*Context gathered: 2026-09-26*
