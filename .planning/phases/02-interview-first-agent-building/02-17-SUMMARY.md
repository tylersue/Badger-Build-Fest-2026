---
phase: 02-interview-first-agent-building
plan: "17"
subsystem: integration-acceptance
tags: [vitest, supabase, billing, retrieval, intake, diagnostics, paid-acceptance]
requires:
  - phase: 02-16
    provides: Connected builder routes and production build
  - phase: 02-03
    provides: Atomic billing RPCs and attempt ledger
  - phase: 02-05
    provides: Revisioned knowledge and agent-scoped retrieval
  - phase: 02-09
    provides: Durable interview and persona service
  - phase: 02-10
    provides: Confirmed source intake and indexing
  - phase: 02-11
    provides: Cited answer runtime and web fallback
provides:
  - Offline cross-service builder acceptance with injected adapters
  - Explicitly gated live SQL race, replay, quota, privacy and retrieval tests
  - Names-only diagnostics and disposable local paid acceptance runner
  - Eight-migration setup and recovery guide
affects: [02-18-live-acceptance, phase-3-publishing]
tech-stack:
  added: []
  patterns: [explicit offline/live labels, loopback disposable mutation gate, route-and-storage evidence assertions]
key-files:
  created: [tests/integration/builder-flow.test.ts, tests/integration/billing.live.test.ts, tests/integration/intake.live.test.ts, tests/integration/live-support.ts, scripts/phase2-live.ts, scripts/check-phase2-env.ts, docs/PHASE2-SETUP.md]
  modified: [tests/integration/retrieval.live.test.ts, package.json]
key-decisions:
  - "Mutation-heavy SQL and paid acceptance run only against an explicitly disposable loopback Supabase and app."
  - "The paid runner checks route responses against stored provider attempts, vectors, citations, tool steps and ledger."
  - "Versioned standard rates represent computed usage cost, not an invoice or account discount."
patterns-established:
  - "RUN_LIVE_TESTS=1 fails with missing configuration names; the default suite labels and skips live tests."
  - "Paid acceptance requires separate opt-ins and a bounded UTC day cap."
requirements-completed: [INTV-01, INTV-02, INTV-03, INTV-04, INTV-05, INTV-06, INTV-07, PERS-01, PERS-02, PERS-03, DOCS-01, DOCS-02, DOCS-03, DOCS-04, RETR-01, RETR-02, RETR-03, SBOX-01, SBOX-02, CRED-02, CRED-03, CRED-05, CRED-10]
duration: 20min
completed: 2026-09-27
---

# Phase 2 Plan 17: Integration Acceptance Summary

**Offline builder handoffs now run end to end through injected service adapters, while guarded SQL and paid-provider scripts require a disposable local target and verify persisted evidence.**

## Performance

- **Started:** approximately 2026-09-27T03:36:00Z
- **Completed:** 2026-09-27T03:56:00Z
- **Duration:** approximately 20 minutes
- **Tasks:** 2 of 2
- **Files created or modified:** 9

## Accomplishments

- Added an offline cross-service scenario covering interview answer, pause/resume, edit/detail/delete, persona suggestions and expert-owned custom text, confirmed paste, source cost state, cited expert and web answers, no-evidence uncertainty, and no online Knowledge writes. It uses explicit in-memory adapters and is labeled offline.
- Added opt-in real Supabase RPC/REST checks for shared UTC day and wallet concurrency, exact fractional settlement and replay, unresolved dispatch holds, orphan settlement, public RPC denial, quota races, active revision visibility, tombstones and two-agent retrieval isolation. An explicit `RUN_LIVE_TESTS=1` with missing configuration fails at suite load.
- Added a names-only configuration checker, a loopback-only paid runner and a setup guide naming all eight current migrations. The runner creates a test-owned agent and checks interview, persona, PDF/DOCX/TXT/MD/paste intake, sandbox citations and tool steps against stored vectors, provider attempts and ledger. It rejects missing paid opt-ins and a configured daily cap above USD 2.

## Task Commits

1. **Task 1: Offline and live SQL acceptance** — `a63519c`
2. **Task 2: Diagnostics, paid runner and setup** — `7cc1d7c`
3. **Task 1 correction: No-evidence answer assertion** — `6a9cd4b`

## Verification

- Offline Vitest: **131 passed, 5 explicitly skipped live tests** across 31 files.
- Repository ESLint, sequential Next type generation and `tsc --noEmit`: **passed**.
- Default Next production build: **passed** compilation, TypeScript and static generation with network access for the existing Inter font. An initial sandboxed build stalled during optimization and was stopped; no source or font change was needed.
- `node --experimental-strip-types scripts/check-phase2-env.ts --offline`: **passed**, reporting missing names only and no network call.
- `RUN_LIVE_TESTS=1` without configuration: **failed as designed** with `LIVE_CONFIG_MISSING` listing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `LIVE_TEST_DISPOSABLE`. The paid runner likewise rejected missing configuration before a network or paid call.
- `pnpm test` in this isolated worktree tried to purge the preinstalled `node_modules` and aborted without a TTY. The corresponding installed Vitest, ESLint, Next and TypeScript binaries were used directly. No package was added or installed.
- No live SQL migration, provider charge or hosted service mutation was performed in this execution. Those checks remain mandatory in plan 02-18.

## Decisions Made

- Restricted mutating acceptance to loopback app and Supabase endpoints with explicit disposable and paid opt-ins. Hosted configuration diagnostics remain read only.
- Kept synthetic charged ledger rows and unknown holds in the disposable database for inspection; the runner does not erase paid usage.
- Preserved the standard-rate price version and treated computed nanodollar units as usage estimates rather than invoice-exact charges.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Safety gate] Restricted live mutation targets**
- **Found during:** Tasks 1 and 2.
- **Issue:** Automatic approval review rejected drafts that could mutate a shared hosted daily budget or send paid calls to arbitrary endpoints.
- **Fix:** Live mutation tests require `LIVE_TEST_DISPOSABLE=1` and a loopback Supabase URL; the paid runner additionally requires a loopback app, `RUN_PAID_ACCEPTANCE=1`, and a daily cap at or below USD 2. The day-cap test starts from an absent UTC budget row and changes only the row it created.
- **Files modified:** `tests/integration/live-support.ts`, `tests/integration/billing.live.test.ts`, `scripts/phase2-live.ts`, `docs/PHASE2-SETUP.md`.
- **Verification:** Default suite skips with labels; explicit missing-config run fails; static lint/typecheck/build pass.
- **Committed in:** `a63519c`, `7cc1d7c`.

**2. [Rule 1 - Test completeness] Exercised unsupported evidence**
- **Found during:** Task 1 final review.
- **Issue:** The integrated offline scenario referenced the uncertainty string without running an unsupported-evidence request.
- **Fix:** Added an actual no-evidence `runAnswer` call and asserted uncertainty text with no citations.
- **Files modified:** `tests/integration/builder-flow.test.ts`.
- **Verification:** Focused Vitest, ESLint and TypeScript passed.
- **Committed in:** `6a9cd4b`.

## Known Stubs

None in the created product tooling. Empty arrays and objects in `builder-flow.test.ts` are intentional adapter state and are populated during the tested flow. The paid runner is intentionally opt-in and remains unexecuted without local services.

## Issues Encountered

- The worktree Git metadata is outside the normal writable sandbox. Required branch sentinel and commits used narrow escalation.
- This environment has no live Supabase or provider credentials. Plan 02-18 must apply migrations, run the guarded SQL tests and paid acceptance, and record actual service outcomes. A local model or web-search entitlement failure blocks live acceptance until resolved.

## Next Phase Readiness

Plan 02-18 has runnable diagnostics, migration instructions, an offline baseline, guarded live SQL tests and a paid acceptance script. It must run them against an approved disposable local setup, then verify the presentation deployment separately. Current evidence does not claim SQL or provider behavior.

## Self-Check: PASSED

- All nine code, test, documentation and package files, plus this summary, exist.
- Task commits `a63519c`, `7cc1d7c` and `6a9cd4b` resolve.
- `git diff --check` passed and no tracked files were deleted.
