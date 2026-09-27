---
phase: 02-interview-first-agent-building
plan: "03"
subsystem: billing
tags: [postgres, supabase-rpc, nanodollars, idempotency, reconciliation]
requires:
  - phase: 02-02
    provides: Service-role database adapter and durable billing tables
provides:
  - Exact standard-rate nanodollar pricing for tokens, cache, embeddings and searches
  - Transactional wallet and UTC-day holds, attempt journal, settlement, mock grants and operator reconciliation
  - Owner-scoped operation polling and dry-run recovery command
affects: [provider-gateway, interview, knowledge, runtime, api, phase-02-18]
tech-stack:
  added: []
  patterns: [day-wallet-operation lock order, per-attempt dispatch-day accounting, explicit unknown-usage evidence]
key-files:
  created: [supabase/migrations/20260927000300_phase2_billing.sql, features/billing/service.ts, features/billing/service.test.ts, scripts/reconcile-usage.ts, app/api/operations/[operationId]/route.ts]
  modified: [features/billing/pricing.ts, features/billing/pricing.test.ts, lib/config/credits.ts, lib/contracts/phase2.ts, .planning/phases/02-interview-first-agent-building/02-CONTRACTS.md]
key-decisions:
  - "Snapshot published standard prices at 2026-09-26-standard-v1; gross and effective cost match until an account allowance is verified."
  - "Require complete provider usage counters or explicit operator evidence; ambiguous dispatched attempts keep their holds."
  - "Move attempt holds to their UTC dispatch day and retain original day accounting through settlement."
patterns-established:
  - "Only service-role RPCs change wallet, ledger, operation and daily budget state."
  - "Reconciliation defaults to a names-only listing; --apply requires a validated evidence file and --confirm."
requirements-completed: [CRED-02, CRED-03, CRED-05, CRED-10, INTV-06]
duration: 17min
completed: 2026-09-27
---

# Phase 2 Plan 03: Transactional Billing Summary

**Nanodollar pricing and PostgreSQL transaction functions reserve bounded spend, charge actual usage once, and keep ambiguous provider costs held for operator recovery.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-27T01:38:45Z
- **Completed:** 2026-09-27T01:55:21Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Replaced whole-credit minimum charging with integer nanodollar pricing. The standard snapshot covers input/output, five-minute cache writes, cache reads, Voyage embeddings and successful web searches. Display compatibility selectors remain separate from settlement arithmetic.
- Added service-role RPCs for reserve, expand, attempt transitions, settle, reconcile and repeatable mock grants. Reservation checks both available wallet balance and spent-plus-held UTC-day cap while holding day, wallet and operation locks. Settlement records actual usage, one debit ledger row per attempt, and releases only the operation's surplus. Unknown dispatches retain holds.
- Added a typed service adapter, owner-scoped operation polling, and a dry-run recovery script that requires complete recorded usage or operator proof of no dispatch before changing balances.

## Task Commits

1. **Task 1: Exact pricing and financial RPC invariants** — `fe00e58`
2. **Task 2: Durable operations and reconciliation** — `248e67c`

## Verification

- `next typegen`, `tsc --noEmit`, targeted ESLint, and `git diff --check`: passed.
- Full Vitest suite: 35 tests passed across 8 files. Billing tests cover fractional costs, reserve refusals, UTC reset and dispatch-day metadata, settlement replay response, evidence validation, and cross-identity polling.
- SQL migration was reviewed against the Phase 2 core schema but **was not applied or exercised against PostgreSQL**. This worktree has no live database credentials; concurrency, migration and provider acceptance remain required in plan 02-18. Offline adapter tests do not establish live transaction behavior.
- Price snapshot was checked against [Anthropic's pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [Voyage's pricing](https://docs.voyageai.com/docs/pricing) on 2026-09-27.

## Decisions Made

- Use published standard rates and record both gross and effective units as equal until account-specific allowance terms are verified. Computed usage cost is not represented as invoice-exact.
- Require all six usage counts for completed attempts and recorded-usage reconciliation. A missing count keeps usage unresolved; proof of no dispatch is a separate operator action.
- An expansion spanning midnight transfers only unallocated hold to the new UTC day; each dispatched attempt retains its original day for spending and reconciliation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical contract] Added explicit reconciliation evidence**
- **Found during:** Task 2
- **Issue:** The frozen `ReconcileOperation` type accepted `ProviderAttempt[]`, which could not express operator identity, rationale or proof of no dispatch.
- **Fix:** Added `ReconciliationEvidence` to the shared contract and documented its required fields in 02-CONTRACTS.md.
- **Files modified:** `lib/contracts/phase2.ts`, `.planning/phases/02-interview-first-agent-building/02-CONTRACTS.md`
- **Verification:** TypeScript and billing tests passed.
- **Committed in:** `248e67c`

**2. [Rule 2 - Missing critical serialization] Returned BIGINT money as decimal strings**
- **Found during:** Task 2
- **Issue:** JSON numbers from PostgreSQL BIGINT can exceed JavaScript's safe integer range.
- **Fix:** RPC responses serialize monetary fields as strings; the adapter rejects unsafe numeric responses.
- **Files modified:** `supabase/migrations/20260927000300_phase2_billing.sql`, `features/billing/service.ts`
- **Verification:** TypeScript and billing tests passed.
- **Committed in:** `248e67c`

**Total deviations:** 2 auto-fixed (2 missing critical functionality). Both are needed for safe settlement and truthful recovery.

## Issues Encountered

- Local PostgreSQL/Supabase was unavailable, so SQL syntax and transaction behavior are not claimed as live-verified. Plan 02-18 must apply migrations and exercise concurrent reserves, rollover, replay, and reconciliation.
- The pnpm wrapper previously attempted to reinstall cloned dependencies in this worktree; installed Next, Vitest, TypeScript and ESLint binaries supplied equivalent offline checks.

## Known Stubs

None. Nullable cost values represent genuinely unresolved usage; default empty reconciliation input is rejected.

## Next Phase Readiness

Provider adapters can import `reserveOperation`, `expandReservation`, `recordAttempt`, `settleOperation`, `reconcileOperation`, `grantMockCredits`, `PRICE_VERSION`, and `priceUsage`. They must prepare and dispatch an attempt before provider work, supply a bounded hold, disable hidden paid retries, and report complete usage or leave an unknown hold. The reconciliation contract now requires explicit operator evidence.

## Self-Check: PASSED

All key files exist, both task commits are present, no tracked files were deleted, and the worktree has no uncommitted code changes before this summary.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
