---
phase: 02-interview-first-agent-building
plan: "09"
subsystem: interview
tags: [adaptive-interview, answer-revisions, indexing, persona-evidence, idempotency]
requires:
  - phase: 02-05
    provides: Metered structured generation and durable operation settlement
  - phase: 02-07
    provides: Revision-safe synchronous indexing and scoped retrieval
  - phase: 02-08
    provides: Evidence-linked persona suggestions and reconciliation
provides:
  - Saved one-question adaptive interview with pause, resume, skip and advisory readiness
  - Versioned answer edits, linked detail, deletion and durable index retry
  - Owner-guarded interview and answer lifecycle routes
affects: [builder-ui, knowledge-ui, phase-02-18]
tech-stack:
  added: []
  patterns: [atomic interview mutation RPC, request-key replay, awaited index-before-question pipeline]
key-files:
  created: [features/builder/interview.ts, features/builder/interview.test.ts, features/builder/interview-test-fixture.ts, features/builder/interview-route.test.ts, app/api/agents/[agentId]/interview/route.ts, app/api/agents/[agentId]/answers/[answerId]/route.ts, supabase/migrations/20260927000600_phase2_interview.sql]
  modified: [lib/server/db.types.ts]
key-decisions:
  - "Persist answer and session transitions through one agent-locked SQL RPC before any provider dispatch."
  - "A short answer is indexed and activated in its submit request; a pending or failed job is retried by its durable job ID."
  - "Readiness counts only active current revisions with supported example, principle and exception language."
requirements-completed: [INTV-01, INTV-02, INTV-03, INTV-04, INTV-05, INTV-06, INTV-07]
duration: 15min
completed: 2026-09-27
---

# Phase 2 Plan 09: Adaptive Interview and Answer Lifecycle Summary

**Experts can answer one saved question at a time; each short answer is indexed in the same request, while edits, linked details and retries preserve revision history and truthful search status.**

## Performance

- **Started:** 2026-09-27T02:28:50Z
- **Completed:** 2026-09-27T02:43:49Z
- **Tasks:** 2 of 2
- **Files created/modified:** 8

## Accomplishments

- Added an agent-locked SQL interview transaction for request-key replay, session-version compare-and-swap, question history, captured revisions, linked details and parent tombstones. The service saves before provider calls, awaits the real index job, calls the structured gateway with `settle:false`, and settles the operation in the caller.
- Kept one pending question through pause and resume. Opening prompts establish who the expert is and how they work; the current thread then asks for a concrete example, reasoning and an exception. Vague examples trigger a focused follow-up until answered or skipped. Readiness is dismissible and requires cited active answers.
- Exposed GET/POST interview and PATCH/DELETE answer routes with bounded strict schemas, same-origin and owner checks, and required idempotency keys. Responses expose current versus indexed revisions, previous-active state, job progress and error code. A failed generation leaves the saved answer retrievable; a later `continue` can request a new question.
- Editing or deleting calls `reconcilePersonaEvidence(agentId)`; generated persona patches must cite active current revisions before reaching the persona service.

## Task Commits

1. **Task 1: Stateful adaptive controller and atomic answer persistence** — `e193e89`
2. **Task 2: Interview and answer lifecycle routes** — `aa2d27e`
3. **Task 1 correction: Readiness evidence must match answer content** — `0ad67bd`

## Verification

- Full offline suite: **82 passed, 1 skipped** across 18 files. The skipped retrieval integration requires an explicitly configured disposable live database.
- Installed Next `typegen`, TypeScript `tsc --noEmit`, targeted ESLint, and `git diff --check` passed. `pnpm` attempted to purge the prepared worktree's dependencies, so installed binaries were used directly without installing packages.
- Service and route tests submit through the real orchestrator, await the real indexing module with an injected provider/DB adapter, and then call `searchKnowledge` without invoking an indexer from the test. They cover pause/resume, deep follow-up and skip, provider failure preservation, request replay, linked detail, edit, parent deletion, failed update with previous active revision, and PATCH retry to one active generation.
- SQL migration and live provider accounting were not run locally; plan 02-18 owns live migration/provider acceptance.

## Decisions Made

- `POST /api/agents/[agentId]/interview` accepts `{action:"control",control}` or `{action:"submit",questionId,text,expectedVersion}`. `PATCH /api/agents/[agentId]/answers/[answerId]` accepts `edit`, `add-detail`, or `retry-index`; DELETE accepts `expectedVersion`. Mutations require `Idempotency-Key`.
- `InterviewView` gives the builder `pendingQuestion`, `version`, `answers` with `revisionId`, `indexedRevisionId`, `previousActive`, `state`, `jobId`, `progress`, `jobErrorCode`, plus `readiness`. The browser should keep its per-agent draft locally and use `continue` when a saved answer has no pending question after generation failure.
- A failed or pending index keeps its operation available for retry; unknown paid embedding attempts remain blocked by the indexer's reconciliation rule. A short answer completes indexing and activation before the route returns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added an atomic interview mutation seam**
- **Found during:** Task 1
- **Issue:** Existing tables had no transactional answer/session compare-and-swap or durable request-key replay. Separate PostgREST writes could duplicate paid submissions or strand a revision.
- **Fix:** Added service-role-only `interview_action` and `interview_advance` RPCs plus a request ledger in the new 00600 migration.
- **Files modified:** `supabase/migrations/20260927000600_phase2_interview.sql`, `lib/server/db.types.ts`
- **Verification:** Offline race/idempotency adapter tests and static privilege review; live SQL application is deferred to plan 02-18.
- **Committed in:** `e193e89`

**2. [Rule 1 - Bug] Filtered unsupported readiness citations**
- **Found during:** Post-route acceptance review
- **Issue:** An active revision ID alone did not prove the answer contained the claimed example, principle or exception.
- **Fix:** Require active current revisions with matching answer language before readiness thresholds can be met.
- **Files modified:** `features/builder/interview.ts`
- **Verification:** Readiness test, typecheck and lint passed.
- **Committed in:** `0ad67bd`

**Total deviations:** 2 auto-fixed. Both support the plan's correctness and evidence requirements.

## Known Stubs

None. Empty collections and nullable values in the test fixture represent setup or genuinely absent interview data.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: privileged RPC | `supabase/migrations/20260927000600_phase2_interview.sql` | New service-role functions mutate answer revisions and session state; public, anon and authenticated execute grants are revoked. |

## Issues Encountered

- The isolated worktree's Git metadata is outside writable roots. Task commits used approved escalation after checking the worktree root and per-agent branch.
- Live SQL and provider credentials were unavailable locally; no live behavior or real charge claim is made here.

## Next Phase Readiness

Builder and knowledge UI can consume the route view and status fields. The 00600 migration follows the existing core, knowledge, persona and index migrations. Plan 02-18 must apply it to a disposable database and verify service-role privileges, concurrent CAS behavior, provider usage and end-to-end retrieval.

## Self-Check: PASSED

All eight created/modified files exist, task commits `e193e89`, `aa2d27e` and `0ad67bd` resolve, the final offline suite and static checks pass, the branch is `worktree-agent-phase2-09`, and no tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
