---
phase: 02-interview-first-agent-building
plan: "11"
subsystem: runtime
tags: [grounding, retrieval, web-fallback, citations, streaming, billing]
requires:
  - phase: 02-05
    provides: Metered Anthropic/Voyage gateway and durable operation settlement
  - phase: 02-07
    provides: Scoped vector retrieval and immutable expert citation snapshots
  - phase: 02-08
    provides: Versioned persona state and persona-only prompt text
provides:
  - Shared sandbox/chat runAnswer service with scoped retrieval and evidence sufficiency
  - Minimized provider-managed web fallback with ordered search/page events
  - Persisted messages, citation snapshots, replayable events and raw sandbox cost settlement
affects: [02-12 browser bridge, 02-18 live acceptance, phase-03 hirer chat]
tech-stack:
  added: []
  patterns: [persist-before-emit event log, tool-free synthesis, separate expert/web evidence namespaces]
key-files:
  created: [features/runtime/sufficiency.ts, features/runtime/web.ts, features/runtime/web.test.ts, features/runtime/policy.ts, features/runtime/agent.test.ts, features/runtime/legacy-agent.ts]
  modified: [features/runtime/agent.ts, lib/demo-store.ts]
key-decisions:
  - "RunAnswer takes a server-resolved actor and mode, verifies the SQL conversation and sandbox owner, and shares the same core pipeline with future hirer chat."
  - "The web context contains only allowlisted public query terms; unknown private tokens are dropped, and unsearchable gaps fail closed."
  - "A client disconnect does not cancel the answer producer; events are stored before delivery and can be replayed by operation."
patterns-established:
  - "Reserve one answer operation; retrieval, sufficiency, web and synthesis stages use settle:false; settle in the durable completion path."
  - "Keep platform rules in immutable provider instructions and persona/evidence in tool-free prompt data."
requirements-completed: [SBOX-01, SBOX-02, RETR-01, RETR-02, CRED-02, CRED-03]
duration: 13min
completed: 2026-09-27
---

# Phase 2 Plan 11: Grounded answer runtime and web fallback Summary

**Server-side answers now verify expert coverage, research missing public portions with bounded Anthropic tools, stream durable tool steps, and settle actual sandbox usage.**

## Performance

- **Started:** 2026-09-27T02:29:19Z
- **Completed:** 2026-09-27T02:42:08Z
- **Duration:** 13 minutes
- **Tasks:** 2 of 2
- **Files created/modified:** 8

## Accomplishments

- `assessSufficiency` checks each question part against valid retrieved IDs through a metered structured call. Empty evidence stays empty; similarity scores alone never claim coverage.
- `researchWeb` receives only a minimized public gap query, uses the existing metered Anthropic web search and fetch tools (one search, two reads), and forwards actual query/title/link/status events as the provider streams them. Failed reads retain other usable page evidence.
- `runAnswer` checks the selected conversation and sandbox owner, retrieves live agent-scoped chunks, emits a specific expert gap, synthesizes with tools disabled under immutable platform instructions, validates cited IDs against observed expert/web snapshots, and uses uncertainty copy when evidence is unavailable or citations are invalid. Online findings are never written to Knowledge.
- SQL-backed messages and monotone `message_events` are persisted before emission. Replay uses the operation ID; the producer continues after a stream disconnect and records settled cost or a pending hold. Pre-dispatch refusals surface as typed `AnswerFailure`.

## Task Commits

1. **Task 1: Evidence sufficiency and minimized web research** — `c997984`
2. **Task 2: Durable shared cited answers and settlement** — `6b1d2d7`
3. **Task 1 privacy correction: Public query allowlist** — `aeddde1`

## Verification

- Offline Vitest suite: **82 passed, 1 skipped**. The skipped retrieval integration test requires an explicitly configured live disposable Supabase instance.
- `next typegen`, `tsc --noEmit`, targeted ESLint, and `git diff --check`: passed.
- Runtime adapter tests cover expert-only, mixed expert/web, unsupported evidence, invented citation rejection, immutable policy despite a hostile custom prompt, ordered persist-before-emit replay, disconnect continuation, pre-dispatch credit refusal, and settled versus pending sandbox costs.
- Web adapter tests cover complete/partial/empty sufficiency, private sentinels in outbound-query isolation, unsafe URLs, failed search, a failed page with usable other evidence, actual tool step order, and the gateway's `web:true`/`settle:false` dispatch.
- No live Anthropic request or SQL migration was run here. Plan 02-18 owns real provider event/usage and database acceptance.

## Decisions Made

- `runAnswer(input, supplied?)` accepts `{ agentId, actorId, conversationId, requestKey, text, mode }` and yields `ChatStreamEvent`. The API route must resolve actor and mode server-side. The production store verifies conversation actor/mode, sandbox owner and sandbox conversation ID before reserving cost.
- The answer operation reserves a small initial hold and lets gateway stages expand only as needed. All paid stages use `settle:false`; final settlement is raw for sandbox. Phase 3 owns hirer multiplier and expert revenue in its route/billing integration.
- Unknown terms are removed from a web query because a lower-case name or identifier can be private. When safe terms do not form a useful query, web research returns no evidence and the answer uses supported expert material or uncertainty copy.
- The existing browser fixture answer and interviewer helpers moved to `legacy-agent.ts`; `lib/demo-store.ts` imports them only for its temporary Phase 1 presentation path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Protected lower-case private details in web queries**
- **Found during:** Task 1 privacy review
- **Issue:** Removing proper names, emails and identifiers by pattern could still leak a lower-case private name from the question.
- **Fix:** Public web queries now retain only explicitly allowed common terms and fail closed when insufficient terms remain.
- **Files modified:** `features/runtime/web.ts`, `features/runtime/web.test.ts`
- **Verification:** Sentinel tests with both upper-case and lower-case private tokens, targeted TypeScript and ESLint.
- **Committed in:** `aeddde1`

**2. [Rule 2 - Missing critical functionality] Kept the browser fixture import out of the server runtime**
- **Found during:** Task 2 client/server boundary review
- **Issue:** Replacing `agent.ts` with `server-only` code would break the existing browser demo store before plan 02-12 connects it to server state.
- **Fix:** Moved its canned helpers to `legacy-agent.ts` and updated the single browser import.
- **Files modified:** `features/runtime/legacy-agent.ts`, `lib/demo-store.ts`
- **Verification:** Full offline suite and typecheck.
- **Committed in:** `6b1d2d7`

**Total deviations:** 2 auto-fixed, both required for privacy or build correctness.

## Known Stubs

- `features/runtime/legacy-agent.ts` contains Phase 1 display-only canned answers and interview follow-ups. `lib/demo-store.ts` still calls them until plan 02-12 replaces that browser action path. Neither helper is reachable from `runAnswer` or supplies live retrieval evidence.

## Issues Encountered

- The worktree's Git index lives under the main checkout's protected `.git`; task commits used approved escalation.
- Live Anthropic tool event shapes, provider search accounting, and SQL persistence are unverified offline and remain mandatory for plan 02-18.

## Next Phase Readiness

Plan 02-12 can call `runAnswer` from a server route, with server-resolved actor/mode and an existing owned sandbox conversation, and stream its `ChatStreamEvent` values as NDJSON. `AnswerFailure.detail` carries a typed pre-dispatch refusal. `createSqlAnswerStore().replay(operationId)` returns persisted ordered events; the route must guard access before exposing replay. Browser fixture helpers can be removed after the bridge takes over. Plan 02-18 must apply migrations and validate live tool events, actual usage and cost settlement.

## Self-Check: PASSED

All eight created or modified code files and this summary exist; all three task/correction commits resolve; no tracked files were deleted. The offline suite, typecheck, targeted lint and whitespace check passed.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
