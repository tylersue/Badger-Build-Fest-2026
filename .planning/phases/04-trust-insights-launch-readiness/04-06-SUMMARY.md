---
phase: 04-trust-insights-launch-readiness
plan: 06
subsystem: launch-readiness, billing
tags: [ledger-reconciliation, adversarial-testing, launch-runbook, blockers]

# Dependency graph
requires:
  - phase: 04-trust-insights-launch-readiness/04-01
    provides: demo-store commit seam and typed wallet state
  - phase: 04-trust-insights-launch-readiness/04-02
    provides: transcript-sharing and feedback controls
  - phase: 04-trust-insights-launch-readiness/04-03
    provides: earnings, mock cash-out, and shared transcript selectors
provides:
  - Seed and scripted-session wallet reconciliation with tamper detection
  - Runnable adversarial fixture catalog plus blocked fixture todos
  - Launch-readiness matrix and outside-user verification protocol
affects: [phase-04-closeout, launch-readiness, billing]

# Actuals (#2632)
actuals:
  tokens: 11800
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reconcile wallet state through pure reports over ledger and payout snapshots
    - Require one executable assertion per automated fixture and one named todo per blocked fixture
    - State dependencies for external, backend, and deferred safety checks instead of recording assumed passes

key-files:
  created:
    - features/billing/reconcile.ts
    - features/billing/reconcile.test.ts
    - features/launch/adversarial-fixtures.ts
    - features/launch/adversarial.test.ts
    - docs/LAUNCH-READINESS.md
  modified: []

key-decisions:
  - "CHAT-06 remains blocked and unimplemented until resource copy and a D-03/D-05 scope exception are decided."
  - "The outside-user run and checks requiring real Phase 2–3 data remain blocked; the runbook does not claim they passed."
  - "Single-call build debits are checked against raw usage; aggregate historical seed rows are excluded from that exact per-call comparison."

patterns-established:
  - "Each fixture is either executed by an assertion or represented by a Vitest todo with its blocking dependency."
  - "Launch docs separate today's demo-store evidence from real-data and outside-user gates."

requirements-completed: [CRED-08, CRED-09, EXPT-02, CHAT-09]
requirements-blocked: [CHAT-06]

coverage:
  - id: D1
    description: Seed and scripted demo ledgers reconcile, and tampering in balances, usage splits, build charges, and payouts is detected.
    verification:
      - kind: unit
        ref: features/billing/reconcile.test.ts
        status: pass
      - kind: other
        ref: pnpm typecheck
        status: pass
    human_judgment: false
  - id: D2
    description: All seven adversarial categories have representative and adversarial fixtures; runnable cases execute while unavailable cases remain blocked todos.
    verification:
      - kind: unit
        ref: features/launch/adversarial.test.ts (14 automated assertions, 9 blocked todos)
        status: pass
    human_judgment: false
  - id: D3
    description: The launch runbook lists automated evidence, dependencies for blocked gates, outside-user protocol, and demo limitations.
    verification:
      - kind: other
        ref: docs/LAUNCH-READINESS.md acceptance checks for BLOCKED labels and no passed outside-user claim
        status: pass
    human_judgment: true
    rationale: The runbook describes a future participant protocol and its safety boundaries; a project owner should approve it before conducting that session.
  - id: D4
    description: CHAT-06 remains explicitly blocked and the emergency-response behavior is not implemented or represented as passed.
    verification:
      - kind: unit
        ref: features/launch/adversarial.test.ts (RS-03 blocked todo)
        status: pass
      - kind: other
        ref: docs/LAUNCH-READINESS.md CHAT-06 blocker statement
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-27
status: complete
---

# Phase 4 Plan 6: Launch Readiness Summary

**Demo-store billing now reconciles end to end, and launch evidence separates 14 runnable adversarial fixtures from 9 explicit blockers.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-27T06:14:56Z (approximate)
- **Completed:** 2026-09-27T06:26:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added reconciliation for unique ledger IDs, balance chains, chat splits, raw single-call build charges, cash-out rows, and requested payouts.
- Exercised the real demo store through three grounded chat messages, an interview answer, a sandbox message, and a cash-out; verified amounts and final balance.
- Added 14 automated adversarial assertions across seven categories and 9 dependency-named blocked todos.
- Added `docs/LAUNCH-READINESS.md` with a fixture matrix, a three-role outside-user protocol, reconciliation evidence, and known limits.
- Verified the full suite: 170 tests passed, 9 blocked todos, typecheck, lint, and production build passed.

## Task Commits

1. **Task 1: Scripted-session reconciliation and tamper detection** - `e03be55` (test)
2. **Task 2: Adversarial catalog, blocked todos, and readiness runbook** - `6ea434e` (docs)

**Plan metadata:** pending

## Files Created/Modified

- `features/billing/reconcile.ts` - pure report generation for ledger and payout integrity.
- `features/billing/reconcile.test.ts` - seed, scripted store flow, and tampering cases.
- `features/launch/adversarial-fixtures.ts` - seven categories with 14 runnable and 9 blocked scenarios.
- `features/launch/adversarial.test.ts` - executable fixture map, blocked todos, and completeness meta-checks.
- `docs/LAUNCH-READINESS.md` - current evidence, blockers, outside-user protocol, and known limits.

## Decisions Made

- Chat and build activity are reconciled against the current demo contracts; reruns on real usage remain blocked on Phases 2–3.
- CHAT-06 stays deferred pending approved resource language and an exception to the shared-file constraints.
- Outside-user and real-data checks are listed as blocked and are not counted as passed.

## Deviations from Plan

### Reconciliation of aggregated seed charges

**1. Historical seed build debits are not single-call rows**
- **Found during:** Task 1 seeded-ledger verification
- **Issue:** Seed rows include batch history such as multiple interview answers or indexed chunks. Treating each aggregate as one call would incorrectly report markup and fail the required clean seed reconciliation.
- **Fix:** Compare exact raw cost for current single-call build debits. Skip the exact single-call check for seed rows whose notes identify aggregate answers, test messages, or chunks; keep balance-chain validation on every row.
- **Files modified:** `features/billing/reconcile.ts`
- **Verification:** Seed reconciliation passes; the scripted single-call interview and sandbox debits reconcile; a tampered single-call debit produces `markup_outside_usage`.
- **Committed in:** `e03be55`

**Total deviations:** 1 auto-adjustment to accommodate legacy aggregate seed history.
**Impact on plan:** Current per-call charge behavior remains checked; existing batch seed rows still participate in balance and total checks.

## Issues Encountered

- The seeded sandbox aggregate predates the current per-call usage contract, so exact build-cost checks are scoped to current single-call rows while all balance checks include seed history.
- No implementation was added for online fallback, real model stream errors, cross-account authentication, or CHAT-06; those stay named blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six Phase 4 plans have summaries. Demo-store checks are green; outside-user and real-data gates remain blocked on Phases 2–3, and CHAT-06 needs coordinator decisions.

---
*Phase: 04-trust-insights-launch-readiness*
*Completed: 2026-09-27*
