---
phase: 02-interview-first-agent-building
plan: "10"
subsystem: knowledge-intake
tags: [source-intake, quota, supabase-storage, embeddings, idempotency]
requires:
  - phase: 02-interview-first-agent-building
    provides: bounded parsing, durable indexing, metered billing
provides:
  - hash-bound source preflight and explicit byte-resend confirmation
  - transactional file/byte reservation and persisted parsing/indexing lifecycle
  - owned source list, retry, resume, and tombstone APIs
affects: [knowledge-ui, phase-2-live-acceptance]
tech-stack:
  added: []
  patterns: [service-role RPC quota lock, persisted intake lease, private blob cleanup queue]
key-files:
  created:
    - features/knowledge/intake.ts
    - features/knowledge/intake.test.ts
    - features/knowledge/intake-route.test.ts
    - supabase/migrations/20260927000500_phase2_intake.sql
    - app/api/agents/[agentId]/sources/route.ts
    - app/api/agents/[agentId]/sources/[sourceId]/route.ts
  modified:
    - lib/contracts/phase2.ts
    - lib/server/db.types.ts
key-decisions:
  - "Preflight stores only hash and metadata; confirmation resends the exact bounded payload."
  - "The maximum wallet hold covers the indexer's full bounded Voyage dispatch envelope."
  - "Tombstone and private blob removal are separate durable steps."
patterns-established:
  - "Use one agent row lock for source count/byte reservation and chunk indexing."
requirements-completed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04, CRED-03, CRED-05]
duration: 11min
completed: 2026-09-27
---

# Phase 2 Plan 10: Confirmed Source Intake Summary

Bounded PDF, DOCX, TXT, MD, and pasted text intake now requires a fresh hash-bound estimate and byte-resend confirmation before private storage, parsing, or metered indexing.

## Performance

- **Duration:** approximately 11 minutes
- **Completed:** 2026-09-27T02:48:10Z
- **Tasks:** 2 of 2
- **Files changed:** 8

## Accomplishments

- Preflight reports source, byte, and chunk limits, nullable unknown page/chunk projections, available and held wallet units, approximate cost, maximum hold, and a ten-minute token. It stores no source bytes and makes no paid call.
- Confirmation recomputes the source hash and validates its name, kind, size, price version, expiry, limits, and wallet before billing reservation. The SQL RPC serializes competing source reservations on the agent row and binds a request key to one durable source revision. Parsing and indexing run in awaited bounded work with durable leases and index batches.
- Failed sources can receive a fresh estimate and retry from their owned retained blob. Unknown provider usage blocks redispatch. Deletion tombstones before cleanup and preserves historical citation snapshots; a cleanup queue retries private blob removal on later source reads.
- The source routes accept bounded multipart files or pasted JSON, require matching `Idempotency-Key` for paid actions, enforce agent ownership and same-origin mutations, and expose current status, progress, limits, and actual/pending cost.

## Task Commits

1. **Task 1: Preflight confirmation and source lifecycle** — `702e64d`
2. **Task 2: Source list, confirm, retry, resume, and delete endpoints** — `7b3f0cd`

## Verification

- Focused intake, route, and index tests: **20 passed**.
- Full offline suite: **87 passed, 1 skipped** across 18 files.
- Next type generation and TypeScript typecheck: **passed**.
- ESLint on changed TypeScript files and `git diff --check`: **passed**.
- `pnpm` attempted a modules purge in this manually provisioned worktree and stopped without a TTY; checks ran successfully through the installed `node_modules/.bin` commands. No package was installed.
- The SQL migration, Supabase Storage behavior, wallet settlement, and provider calls have **not** been verified against live services; plan 02-18 owns that gate.

## Decisions Made

- The source overview aggregates charged and pending units across all revisions, so retry does not hide earlier charges.
- Preflight returns numeric known quota use and separate nullable projected page/chunk counts. The additive `SourceEstimate` fields are `projectedPageCount`, `projectedChunkCount`, `walletAvailableUnits`, and `walletHeldUnits`; the Knowledge UI can use these directly.
- A consumed estimate replays only with the same request key and matching source payload. A new request key needs a fresh preflight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Durable blob cleanup after tombstone**
- **Found during:** Task 2
- **Issue:** A failed private Storage removal would leave an orphaned blob with no retry target.
- **Fix:** Added a persisted cleanup queue and bounded retries on source overview requests; deletion remains effective before cleanup.
- **Files modified:** `supabase/migrations/20260927000500_phase2_intake.sql`, `features/knowledge/intake.ts`, `lib/server/db.types.ts`
- **Verification:** Focused intake tests, route tests, typecheck, lint.
- **Committed in:** `7b3f0cd`

## Known Limits

- Offline adapters validate the request and lifecycle contract, including a modeled atomic quota race. They are not evidence that the SQL migration or external providers work live.
- A provider dispatch with unknown usage retains its wallet hold and requires explicit reconciliation before a source retry.

## Next Phase Readiness

The Knowledge UI can send `action: "preflight"` and then `action: "confirm"` with the same `fileOrText` and `name`, plus `estimateToken`, `requestKey`, and matching `Idempotency-Key`. Existing failed sources use `preflight-retry` then `retry`; pending sources use `resume`. Plan 02-18 must apply the migration and verify real SQL concurrency, Storage, provider usage, and settlement.

## Self-Check: PASSED

All six created implementation/test/migration files exist; both task commit objects exist; the worktree has no unexpected file deletions or remaining production edits.
