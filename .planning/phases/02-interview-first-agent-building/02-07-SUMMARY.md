---
phase: 02-interview-first-agent-building
plan: "07"
subsystem: knowledge
tags: [pgvector, indexing, retrieval, leases, quota, metering]
requires:
  - phase: 02-02
    provides: Revision, chunk, job, quota and service-role schema
  - phase: 02-05
    provides: Metered Voyage embedding gateway and operation settlement
  - phase: 02-06
    provides: Bounded coordinate-preserving chunking
provides:
  - Synchronous bounded, resumable revision indexing with atomic activation
  - Agent-scoped exact cosine retrieval with immutable citation snapshots
  - Service-role RPCs for quota reservation, leases, batch persistence and search
affects: [interview, knowledge-intake, sandbox-runtime, phase-02-18]
tech-stack:
  added: []
  patterns: [per-revision compare-and-swap activation, persisted paid batches, SQL-scoped retrieval]
key-files:
  created: [supabase/migrations/20260927000400_phase2_index.sql, features/knowledge/index.ts, features/knowledge/index.test.ts, features/knowledge/search.test.ts, features/knowledge/legacy-search.ts, tests/integration/retrieval.live.test.ts]
  modified: [features/knowledge/search.ts, features/runtime/agent.ts, lib/demo-store.ts]
key-decisions:
  - "Keep the last active revision searchable while a replacement is pending or fails; tombstones and linked-parent tombstones exclude it immediately."
  - "A completed provider attempt whose vectors were not durably staged cannot be redispatched automatically; it requires reconciliation."
  - "Indexing settles its operation on completed or irrecoverably stale work by default; callers sharing later model stages pass settle:false."
requirements-completed: [INTV-02, INTV-04, DOCS-02, DOCS-03, RETR-01, RETR-02, RETR-03]
duration: 14min
completed: 2026-09-27
---

# Phase 2 Plan 07: Revision-Safe Indexing and Scoped Retrieval Summary

**Saved interview answers and document chunks now become searchable only after every metered embedding batch is durable and the current live revision passes atomic activation.**

## Performance

- **Started:** 2026-09-27T02:11:48Z
- **Completed:** 2026-09-27T02:26:02Z
- **Tasks:** 2 of 2
- **Files created/modified:** 9

## Accomplishments

- Added service-role `enqueue_index_revision`, `claim_index_job`, `complete_index_batch`, `yield_index_job`, `fail_index_job`, and `activate_revision` RPCs. Jobs freeze their input, reserve concurrent chunk quota, lease processing for 120 seconds, persist each batch, and compare the expected revision and tombstone before activation. A bounded request processes at most four batches of eight chunks; a short answer completes in the same awaited call. Later requests resume unfinished batches without repeating completed stages.
- Added `enqueueIndexRevision` and `indexRevision`. Answer indexing loads the saved revision and preserves its original question. Document indexing accepts extracted source segments and preserves page/heading coordinates. Every provider batch uses `embedTexts(..., { settle: false })`; known failed stages use a new retry generation, while ambiguous or completed-but-unstaged paid attempts block automatic redispatch.
- Added `search_agent_knowledge` with agent and active-revision predicates inside SQL before cosine ordering and LIMIT. Search uses a metered query embedding and returns the database's original score, source IDs, revision IDs, question, page, and heading. Empty results remain empty. `toCitations` freezes evidence snapshots.
- Moved the Phase 1 browser fixture lookup to `legacy-search.ts` so the real search module is server-only. Removed its fabricated empty-agent fallback chunks.

## Task Commits

1. **Task 1: Leased revision indexing and activation** — `bbfe8fc`
2. **Task 1 safety correction: superseded quota and paid replay** — `b676456`
3. **Task 2: Scoped metered vector retrieval** — `6bce5bc`
4. **Task 1 resume regression test** — `80d9564`

## Verification

- Full offline Vitest suite: **72 passed, 1 skipped** across 16 files. The skipped file is the explicitly opt-in live Supabase two-agent isolation test; it requires `RUN_LIVE_RETRIEVAL=1`, `LIVE_RETRIEVAL_DISPOSABLE=1`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` against an applied disposable database.
- Installed Next `typegen`, TypeScript `tsc --noEmit`, targeted ESLint, and `git diff --check`: passed.
- Index tests cover edit/edit and edit/delete stale activation, failed replacement retaining the old active pointer, retry with a distinct paid stage, unknown-usage no-redispatch, and a 33-chunk job resuming after four batches. Search adapter tests assert the actual RPC parameters, typed provider/database errors, cross-agent row rejection, empty results, original scores, and both citation coordinate types.
- The production `next build` was stopped after it remained at “Creating an optimized production build” without further output. No build success is claimed. SQL migrations and the real RPC isolation case were not run locally; plan 02-18 owns live migration and provider acceptance.

## Decisions Made

- `enqueueIndexRevision({ jobId, agentId, revisionId, operationId, answerId? | sourceId?, sourceSegments?, maxChunks? })` freezes chunks and returns `ServiceResult<IndexResult>`. `indexRevision(jobId, { settle?: boolean } = {})` does awaited bounded work and returns ready/pending/failed plus progress. Interview and intake actions should await it before responding. `settle:false` leaves final settlement to a caller with later paid stages.
- A known failed batch can be retried under the same open operation with a new retry generation. Callers must retain the operation reservation when offering Retry indexing. A failed job with unknown usage remains blocked for reconciliation.
- `searchKnowledge({ agentId, query, operation, k? })` returns `ServiceResult<RetrievedChunk[]>` and leaves operation settlement to the answer pipeline. It defaults to six results and clamps k to 1–12.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Released superseded quota reservations**
- **Found during:** Task 1 race review
- **Issue:** A superseded edit could keep a quota hold and block the replacement job.
- **Fix:** The agent-locked enqueue marks older jobs stale and releases their holds; an in-flight batch cannot stage or activate after that transition.
- **Files modified:** `supabase/migrations/20260927000400_phase2_index.sql`, `features/knowledge/index.ts`
- **Verification:** Edit/edit and edit/delete race tests; typecheck and lint passed.
- **Committed in:** `b676456`

**2. [Rule 2 - Missing critical functionality] Preserved browser/server import boundary**
- **Found during:** Task 2 search replacement
- **Issue:** The existing browser demo store imported the search module that now needs server-only database and metering code.
- **Fix:** Kept the Phase 1 fixture lookup in a named legacy module and updated its two imports; removed fabricated empty-agent fallback chunks.
- **Files modified:** `features/knowledge/legacy-search.ts`, `features/runtime/agent.ts`, `lib/demo-store.ts`
- **Verification:** Typecheck, targeted lint, and full offline tests passed.
- **Committed in:** `6bce5bc`

**Total deviations:** 2 auto-fixed. Both are required for race safety and the client/server boundary.

## Known Stubs

- `features/knowledge/legacy-search.ts` remains a fixture-only Phase 1 presentation lookup for the existing browser demo flow. It never supplies evidence to the new server retrieval path. Plan 02-12 replaces that browser flow with server-backed state.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: privileged RPC | `supabase/migrations/20260927000400_phase2_index.sql` | New service-role functions access paid operation state and source text; all execute grants are revoked from public/anon/authenticated. |

## Issues Encountered

- The local environment had no running Supabase/Postgres database for migration or live RPC validation. The explicit live test remains an acceptance gate in plan 02-18.
- The optional optimized build did not complete before being stopped; static and offline checks passed.

## Next Phase Readiness

Plans 02-09 and 02-10 can enqueue the durable job after saving the answer/source revision and reserving an operation, then await `indexRevision(jobId, { settle: false })` when the action has later paid stages. Retry calls `indexRevision(jobId)` on the same job and operation; a pending job yields and can be resumed immediately, while a crashed worker's lease expires after 120 seconds. Plan 02-11 can call `searchKnowledge` with an already reserved operation and then settle after synthesis. Live SQL application and provider accounting acceptance remain for plan 02-18.

## Self-Check: PASSED

All created files exist; all four task and correction commits resolve; no tracked files were deleted; the full offline suite, typecheck, and targeted lint passed.
