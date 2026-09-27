---
phase: 02-interview-first-agent-building
plan: "05"
subsystem: provider-gateway
tags: [anthropic, voyage, ai-sdk-7, metering, reservations, embeddings]
requires:
  - phase: 02-03
    provides: Transactional wallet holds, provider attempt journal and exact price snapshot
provides:
  - Bounded Anthropic structured and streaming dispatch with durable attempt metering
  - Bounded Voyage document and query embeddings with 1024-dimensional validation
  - Exact per-stage hold expansion and explicit multi-stage settlement option
affects: [interview, knowledge, runtime, phase-02-18]
tech-stack:
  added: []
  patterns: [prepared-dispatched-before-network, explicit-test-adapter-injection, unknown-usage-hold]
key-files:
  created: [lib/llm/gateway.ts, lib/llm/anthropic.ts, lib/llm/gateway.test.ts, lib/llm/voyage.ts, lib/llm/voyage.test.ts]
  modified: [supabase/migrations/20260927000300_phase2_billing.sql]
key-decisions:
  - "One SDK provider step per gateway dispatch; subsequent stages are explicit journaled calls."
  - "Intermediate stages use settle:false and the caller settles the shared operation after all stages."
  - "Unknown or unprovable provider usage retains the attempt hold for operator reconciliation."
patterns-established:
  - "Provider credentials are read only by server adapters; test adapters require explicit injection."
  - "A stage cannot make a provider request until the exact bounded hold is prepared and dispatched in billing."
requirements-completed: [CRED-02, CRED-03, CRED-05, CRED-10, PERS-03]
duration: 13min
completed: 2026-09-27
---

# Phase 2 Plan 05: Metered Provider Gateway Summary

**Anthropic structured and stream calls plus Voyage embeddings now run behind bounded wallet holds and durable per-attempt usage accounting.**

## Performance

- **Duration:** approximately 13 min
- **Completed:** 2026-09-27T02:09:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `meteredStructured` and `meteredStream` with explicit AI SDK 7 server adapters. The gateway validates the model and bounded context/output envelope, prepares and marks an attempt dispatched before network activity, disables retries, records per-step uncached/cache-read/cache-write/output token counts and successful search fees once, stores provider request ID and latency, and settles measured usage.
- Added `embedTexts` with Voyage REST `voyage-4-lite`, `output_dimension: 1024`, `truncation: false`, document/query input types, a bounded batch/context, actual `usage.total_tokens`, and strict vector/count/finite-number validation. A malformed vector with known usage is charged; missing usage keeps its hold.
- Exposed `settle:false` for intermediate stages sharing one operation. Callers settle the operation in durable completion handling after all stages. The billing RPC now reports its locked unallocated hold so the gateway expands only the missing amount before dispatch.

## Task Commits

1. **Task 1: Metered Anthropic dispatch** — `db717b0`
2. **Task 1 correction: Partial failure accounting** — `1b97a93`
3. **Task 2: Voyage embeddings** — `bec9e41`
4. **Integration correction: Exact stage expansion** — `1da41c6`
5. **Integration correction: Explicit step and search bounds** — `09cee9d`

## Verification

- Full offline Vitest suite: **64 tests passed across 13 files**.
- Installed Next `typegen`, TypeScript `tsc --noEmit`, targeted ESLint, and `git diff --check`: passed.
- Adapter tests cover precheck before network, summed step usage, cache/search price, malformed output charged as known usage, partial failure, ambiguous usage hold, exact hold expansion, Voyage input types and dimensions, replay refusal, and disabled configuration.
- No live Anthropic/Voyage call or migration run occurred in this worktree. Plan 02-18 must validate provider entitlement, response usage fields, pricing policy, real request IDs, SQL migration and account settlement.

## Decisions Made

- The gateway caps AI SDK execution at one step per dispatch so every subsequent helper, web or synthesis call has a separate stage and attempt. Web tools are limited to one search and two fetches within that call.
- A caller with multiple stages passes `settle:false` to each intermediate gateway call and must call `settleOperation(operation.id)` after completion or failure. Unknown dispatched attempts remain held through settlement and require explicit `ReconciliationEvidence` to resolve.
- Voyage batches are capped at 32 texts and 32,000 UTF-8 bytes total. Callers split larger indexing jobs into unique stage keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Settled measurable partial Anthropic usage**
- **Found during:** Task 2 integration review
- **Issue:** An interrupted stream could have completed provider steps with usage even though the final output failed.
- **Fix:** Captured completed-step usage and request IDs; known partial use is recorded and charged, while ambiguous web search counts remain held.
- **Files modified:** `lib/llm/anthropic.ts`, `lib/llm/gateway.ts`, `lib/llm/gateway.test.ts`
- **Verification:** Targeted partial-failure test, TypeScript and ESLint passed.
- **Committed in:** `1b97a93`

**2. [Rule 2 - Missing critical functionality] Expanded only missing stage hold**
- **Found during:** Multi-stage reservation review
- **Issue:** Billing reported insufficient unallocated hold without its exact shortfall; expanding by a full stage could reject an otherwise affordable call.
- **Fix:** The locked billing RPC reports available and needed units; the gateway expands their difference and retries preparation once before network activity.
- **Files modified:** `supabase/migrations/20260927000300_phase2_billing.sql`, `lib/llm/gateway.ts`, `lib/llm/gateway.test.ts`
- **Verification:** Exact-delta test and full offline suite passed.
- **Committed in:** `1da41c6`

**3. [Rule 2 - Missing critical bounds] Restricted implicit continuation and ambiguous search accounting**
- **Found during:** Final provider dispatch review
- **Issue:** SDK continuation or incomplete web tool events could create an unjournaled call or undercount a search fee.
- **Fix:** Explicitly limit each SDK call to one step and retain unknown holds when a partial web search count cannot be proven.
- **Files modified:** `lib/llm/anthropic.ts`
- **Verification:** Targeted adapter tests, TypeScript and ESLint passed.
- **Committed in:** `09cee9d`

## Issues Encountered

- The worktree's Git metadata lives under the parent checkout's read-only `.git`; task commits used approved escalation. No package installation was needed.
- Context7 CLI was unavailable, so implementation used installed AI SDK 7 type declarations and the phase research's provider references. Live provider behavior remains unverified until plan 02-18.

## Known Stubs

None. Empty arrays and nullable IDs are local accumulation or genuinely unavailable provider evidence; no production test adapter is selected implicitly.

## Next Phase Readiness

`meteredStructured(input, options?, deps?)`, `meteredStream(input, options?, deps?)`, and `embedTexts(input, options?, deps?)` accept a pre-reserved `Operation`. Their optional dependencies are explicit test adapters; production uses configured server providers. For a shared operation, pass `settle:false` to intermediate calls and settle in the caller's durable completion path. Each stage needs a unique `stageKey`; reusing one refuses dispatch. The gateway returns a typed `ServiceResult` with attempt, operation, normalized usage and price snapshot on success.

## Self-Check: PASSED

All five created code files and the billing migration exist; all five code commits are present; the offline suite and required static checks passed; no tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
