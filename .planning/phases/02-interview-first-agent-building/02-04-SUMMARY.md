---
phase: 02-interview-first-agent-building
plan: "04"
subsystem: demo-backend
tags: [supabase, seed, snapshot, import, reset, route-handlers]
requires:
  - phase: 02-02
    provides: Service-role database adapter, schema, and request ownership guards
provides:
  - Idempotent stable-ID presentation fixtures and atomic 5,000-credit opening grants
  - Owner-scoped snapshot with exact wallet units and source, persona, and indexing state
  - Transactional, per-record legacy draft import and safe presentation reset
  - Demo identity, agent creation, profile edit, import, reset, and snapshot routes
affects: [browser-bridge, interview, persona, knowledge, billing, phase-02-18]
tech-stack:
  added: []
  patterns: [service-role SQL transactions, origin-scoped fixture data, per-record import acknowledgement]
key-files:
  created: [scripts/seed.ts, lib/server/demo.ts, lib/server/demo.test.ts, app/api/demo/snapshot/route.ts, app/api/demo/identity/route.ts, app/api/demo/import/route.ts, app/api/demo/reset/route.ts, app/api/agents/route.ts, app/api/profile/route.ts, supabase/migrations/20260927000250_phase2_seed.sql]
  modified: []
key-decisions:
  - "Make opening grants and imported draft receipts transactional so replay cannot create money or acknowledge unsaved content."
  - "Expose published agent cards while scoping private builder state and spending to the selected demo identity."
  - "Reset by restoring missing fixture rows without deleting live drafts, usage, ledger, reservations, or daily spend."
patterns-established:
  - "The client removes a legacy local record only after its individual successful import result."
  - "Fixture answer and document metadata never receives vectors or an active searchable revision."
requirements-completed: [PERS-01, CRED-02, CRED-05]
duration: approximately 14 min
completed: 2026-09-27
---

# Phase 2 Plan 04: Demo Backend Continuity Summary

**Stable seeded identities, agent IDs, transcripts, and a one-time 5,000-credit balance now live in the server read model, with owned draft imports and safe reset.**

## Performance

- **Duration:** Approximately 14 minutes
- **Started:** 2026-09-27T01:39:00Z (approximate)
- **Completed:** 2026-09-27T01:53:00Z
- **Tasks:** 2 of 2
- **Files created:** 10

## Accomplishments

- Seeded all nine existing identities, profiles, agent IDs, persona fields, interview questions and answer revisions, document metadata, conversations, and messages with stable IDs and fixture origin. The seed script runs with `node --experimental-strip-types scripts/seed.ts` in a configured server environment.
- Added an atomic SQL opening grant guarded by a unique ledger key and wallet lock. Every identity starts with 50,000,000,000 nanodollar units; repeat seed/reset runs add no second grant.
- Added a selected-identity snapshot: published agents and owned drafts, owned sources/interviews/persona/index status, the selected wallet and ledger, selected hirer history, and only explicitly shared transcripts for an agent owner. Published agents' private custom prompts are omitted for other identities.
- Added transactional legacy imports for validated profile, persona, and answer content. Each result reports the original local key; financial and owner fields are rejected, stale keys conflict, and draft agent ownership is checked in both service and SQL.
- Added Node routes for snapshot, switchable demo identity, import, reset, owned agent creation, and versioned profile edits. Fresh agent IDs are full UUIDs with the `agent-` prefix and are returned in snapshots for the Phase 2 browser bridge.

## Task Commits

1. **Task 1: Fixture bootstrap and read model** — `596b875`
2. **Task 2: Identity and draft lifecycle routes** — `a944b9c`

## Verification

- Full installed Vitest suite: 8 files, 36 tests passed. The six demo tests cover seed replay, selected-identity scoping, reset preservation, financial import rejection, import key conflicts, new owned agents, URL validation, and profile version conflicts.
- Installed Next type generation and TypeScript type checking passed.
- ESLint on all files changed by this plan passed; `git diff --check` passed.
- Node's native TypeScript loader imported the seed script successfully. No service credentials were available in this worktree, so SQL migration application, RPC execution, and live Supabase acceptance remain for plan 02-18. Offline adapter tests are not live-service evidence.

## Decisions Made

- Fixture conversations, answers, and source metadata remain display-only. No fixture vectors are inserted, and answer/source active indexing pointers stay null.
- The reset endpoint restores missing presentation fixtures idempotently and returns a fresh snapshot. The Phase 2 browser bridge owns clearing local presentation deltas only after that acknowledgement.
- Profile updates require the existing version; the database trigger advances it on a successful compare-and-swap update.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added transaction RPCs for seed grants, draft imports, and agent creation.**
- **Found during:** Tasks 1 and 2
- **Issue:** Separate service-role calls could leave a grant ledger row without its wallet change, acknowledge an import before saving it, or expose a half-created agent.
- **Fix:** Added `20260927000250_phase2_seed.sql` with atomic seed, import, and new-agent functions; all are restricted to the service role.
- **Files modified:** `supabase/migrations/20260927000250_phase2_seed.sql`
- **Verification:** Offline replay/ownership tests pass; live SQL verification remains assigned to plan 02-18.
- **Committed in:** `596b875`, `a944b9c`

## Issues Encountered

- The worktree sandbox initially denied writes to its linked Git index; narrow Git escalation allowed both task commits.
- The repository has no direct TypeScript runner package. The seed script uses Node's native TypeScript loader and an explicit `.ts` fixture import, with a narrow TS5097 suppression for the project build configuration.

## Known Stubs

None. Empty arrays in validation and snapshot construction are genuine empty collections; missing backend configuration is an explicit error.

## Next Phase Readiness

- Plan 02-12 can call these routes and treat the snapshot as authoritative while preserving dirty browser drafts. The existing `/build/{id}` UI still reads the Phase 1 browser store until that bridge is connected.
- Plan 02-18 must apply this migration and execute live seed/import/reset and ledger conservation checks against Supabase. No live acceptance is claimed here.

## Self-Check: PASSED

All ten created files exist; commits `596b875` and `a944b9c` exist on this branch; no tracked files were deleted.
