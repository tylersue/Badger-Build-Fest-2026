# Phase 3: Publish, Discover & Use - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning (built directly, see D-14)

<domain>
## Phase Boundary

Phase 3 closes the loop in the local demo: an expert publishes an agent from the builder, a hirer finds it in the marketplace, opens its listing, chats with it, and both wallets move. It builds on the Phase 1 browser-only demo store (`lib/demo-store.ts`, localStorage) and the Phase 1 keyword retrieval stub. Real embeddings, document ingestion, and the adaptive interviewer stay Phase 2 work; ratings, flags, transcript sharing, cash-out, insights and admin stay Phase 4 work.

Requirements in scope: PUB-01, PUB-02, PUB-03, PUB-04, MKT-02, MKT-03, MKT-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-07, CHAT-10, CHAT-11, CHAT-12, CRED-04. CHAT-06 moves out of this phase (D-12).

</domain>

<decisions>
## Implementation Decisions

### Answer engine
- **D-01:** Answers stay canned in Phase 3 (Phase 1 `cannedAnswer`), shown with simulated word-by-word streaming in the browser. No LLM call, no API key, no server chat route. The `ChatStreamEvent` contract in `features/runtime/agent.ts` stays as the shape a real `/api/chat` route emits later. User chose "canned only" to get basic functionality fastest; demo specifics get honed later.
- **D-02:** Retrieval stays the Phase 1 keyword search. Interview answers the expert typed in this browser are added to the searchable set so a freshly built agent answers from and cites its own interview.
- **D-03:** Weak retrieval (CHAT-03): when an agent has its own knowledge and no retrieved chunk overlaps the question, the reply is a fixed local sentence in the agent's voice plus the expert's contact link, charged 0 credits and captioned as such. No model call. Seeded published agents without stored chunks keep the Phase 1 persona-derived fallback chunks so their example questions still answer.

### Hirer file upload (CHAT-04)
- **D-04:** Server-side extraction through a Next.js route handler (`app/api/extract/route.ts`): PDF via `unpdf`, DOCX via `mammoth`, TXT and MD as UTF-8. One file per conversation, stored on the conversation in the demo store, capped at 50,000 characters of extracted text, shown as a removable chip above the composer. The text enters the prompt through `buildPrompt`'s existing `<untrusted_file>` wrapper and is never treated as instructions; the canned answer acknowledges the file by name.

### Publish (PUB-01..04)
- **D-05:** Publish gate = persona complete (name, category, headline, description, at least one example question) AND at least 5 knowledge chunks (interview answers plus ready document chunks). Constants live in `lib/config/publish.ts`. Maria's seeded draft "Running form clinic" has 6 answers so it can be published live.
- **D-06:** Rate multiplier is a slider from 1× to 5× in 0.5 steps; the page shows typical hirer cost per message and the resulting expert share using `splitUsageCharge`.
- **D-07:** Consent checkbox (expert owns content, platform gets a limited license to serve it through this agent only, no training) must be ticked at first publish; after that the page shows the acceptance date.
- **D-08:** Publish and unpublish are instant. Unpublished agents leave the marketplace and their listing shows a "not published" state to non-owners; open chats keep working.
- **D-09:** The listing is generated from persona and profile with no extra input (already true in Phase 1); knowledge counts and "knowledge last updated" now come from the demo store so browser-built agents look right.

### Chat behaviour
- **D-10:** Conversation history sent to the prompt builder is windowed to the last 10 messages (CHAT-07). Constant in `features/runtime/agent.ts`.
- **D-11:** Per-message cost caption, wallet pill, agent header with contact link, persisted conversations and citation hover cards carry over from Phase 1 unchanged (CHAT-02, CHAT-10, CHAT-11, CHAT-12). Regulated-category disclaimer opens the first reply (CHAT-05), unchanged.
- **D-12:** Emergency and self-harm pattern reply (CHAT-06) is deferred out of Phase 3 at the user's request ("limit all edge case building for now"). It moves to Phase 4 in REQUIREMENTS.md and ROADMAP.md.

### Credits (CRED-04)
- **D-13:** Settlement is unchanged from Phase 1: hirer debit = raw cost × multiplier; ledger rows for hirer debit, platform cost, platform margin (15%), expert credit, written together when the reply completes. A first message in a conversation bumps the agent's usage count so "Most used" sorting moves.

### Process
- **D-14:** Direct build like Phase 1: no PLAN.md files or GSD executor agents. Lint, typecheck, unit tests and a browser walkthrough gate the result; ROADMAP, STATE and REQUIREMENTS are updated afterwards.
- **D-15:** The work lands through a pull request from `marketplace/phase-3-publish-discover-use` into `main`.

### Claude's Discretion
- Slider layout, checklist copy, chip styling, and the streaming reveal speed.
- Where interview-derived chunks are assembled (demo store) and how the extract route reports truncation.
- Small refactors needed to move knowledge counts from `components/app/builder.tsx` into the store.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and decisions
- `.planning/PROJECT.md` — core value, constraints, key decisions (wallet model, interview-first, margin share)
- `.planning/REQUIREMENTS.md` — Phase 3 requirement text; CHAT-06 moves to Phase 4 after this discussion
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria
- `.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md` — Phase 1 decisions D-01..D-19 that still apply (no auth, seeded identities, hard stop at zero, provisional regulated list)

### Contracts and UI
- `features/billing/pricing.ts` — `splitUsageCharge`, `typicalMessageCents`, `estimateCents`
- `features/knowledge/search.ts` — `searchKnowledge`, `toCitations` (extended for extra chunks and weak-retrieval detection)
- `features/runtime/agent.ts` — `buildPrompt`, `ChatStreamEvent`, `cannedAnswer`
- `features/builder/prompt-template.ts` — `personaToSystemPrompt`
- `.planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md` — listing page, chat page, builder drawer Publishing section, toast copy ("Agent published", "Unpublish agent" confirm text)

### Next.js
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — route handler conventions for `app/api/extract/route.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/demo-store.ts`: `sendChatMessage`, `startConversation`, `precheck`, `debitRow`, `updateAgent` already implement reserve-then-settle and the four-row split; publish actions and file attachment extend the same `setState` pattern.
- `components/app/chat.tsx`: `AssistantMessage` (citation chips), `Composer` (Enter to send, attach slot), `NotEnoughCredits`, `CostCaption`.
- `components/app/ui.tsx`: `StatusPill`, `Pill`, `Card`, `EmptyState`, `buttonClass`, `PlaceholderNote` (Phase 3 notes get removed).
- `components/app/form.tsx`: `Field`, `TextInput`, `TextArea` for the publish form.
- `lib/data/seed.ts`: `INTERVIEW_ANSWER_COUNTS`, `SOURCES`, `CHUNKS` feed the knowledge counts.

### Established Patterns
- Client components read the store with `useDemo()`; actions are plain functions that call `setState` and return `{ ok } | Refusal`.
- Every balance change writes a ledger row; nothing goes negative (Phase 1 D-10).
- Toasts via `sonner` for confirmations; empty states via `EmptyState`, never modals for stub notes.

### Integration Points
- `components/app/builder-section.tsx` `DetailsSection` (publish tab) becomes a real `PublishSection`.
- `app/(app)/agents/[slug]/page.tsx` uses store-derived knowledge stats and a not-published state.
- `app/(app)/chat/[conversationId]/page.tsx` wires the attach control to `/api/extract` and streams fresh replies.
- `next.config.ts` lists `unpdf` and `mammoth` as server external packages.

</code_context>

<specifics>
## Specific Ideas

- "Just build the basic functionality as quickly as possible, we will hone down on the demo functionality specifics later." Speed over polish; keep Phase 1 canned answers.
- "We will limit all edge case building for now." No guardrail or long-tail work in this phase.

</specifics>

<deferred>
## Deferred Ideas

- **Real Claude answers with a canned fallback** (server route streaming NDJSON per `ChatStreamEvent`, real token usage to the ledger) — the user chose canned-only for now; revisit when honing the demo.
- **CHAT-06 emergency and self-harm resource reply** — moved to Phase 4 (edge case by user decision). Resource list to decide then: 988 Suicide & Crisis Lifeline, 911, optionally the UW Madison UHS 24/7 line.
- **Daily spend cap enforcement in a server route (CRED-10)** — Phase 2, only meaningful once a real model call exists.
- **Transcript sharing, flags, ratings** — Phase 4 as planned.

</deferred>

---

*Phase: 03-publish-discover-use*
*Context gathered: 2026-09-26*
