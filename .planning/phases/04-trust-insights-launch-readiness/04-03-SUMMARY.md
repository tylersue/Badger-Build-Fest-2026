---
phase: 04-trust-insights-launch-readiness
plan: 03
subsystem: billing, expert-insights
tags: [cashout, earnings, privacy, transcripts, insights, vitest]

# Dependency graph
requires:
  - phase: 04-trust-insights-launch-readiness
    provides: trust model, seeded experts and conversations, demo wallet store
provides:
  - Mock expert cash-out with safe wallet debit and requested payout record
  - Per-conversation earnings breakdown and complete wallet history
  - Privacy-gated expert insights and shared transcript display
affects: [04-04, 04-05, 04-06, billing, insights]

# Actuals (#2632)
actuals:
  tokens: 12500
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure planning functions validate wallet mutations before committing them
    - Derived view models aggregate earnings and insights from the effective demo store
    - Shared transcripts require both explicit conversation consent and expert ownership

key-files:
  created:
    - features/billing/cashout.ts
    - features/billing/cashout.test.ts
    - components/earnings/cashout-dialog.tsx
    - features/billing/earnings.ts
    - features/billing/earnings.test.ts
    - features/insights/insights.ts
    - features/insights/insights.test.ts
    - components/insights/shared-transcripts.tsx
  modified:
    - app/(app)/earnings/page.tsx
    - app/(app)/insights/page.tsx

key-decisions:
  - "Cash-out is capped by earned credits and current wallet balance, keeping seed and pack credits non-withdrawable."
  - "Transcript visibility is controlled by the existing per-conversation shareTranscript flag and the agent's ownerId."

patterns-established:
  - "Validate cash-out against the latest state inside commitDemo's updater to guard duplicate requests."
  - "Use privacy-minimized selectors that omit hirer identity from expert-facing transcript data."

requirements-completed: [CRED-08, CRED-09, EXPT-01, EXPT-02]

coverage:
  - id: D1
    description: Experts can request a mock cash-out that debits credits once and records a requested payout.
    requirement: CRED-09
    verification:
      - kind: unit
        ref: features/billing/cashout.test.ts
        status: pass
      - kind: other
        ref: pnpm typecheck
        status: pass
    human_judgment: true
    rationale: Dialog flow and earnings layout were checked in the browser; final visual sign-off against the UI spec still benefits from a human.
  - id: D2
    description: Earnings are grouped per conversation and the full wallet history remains visible.
    requirement: CRED-08
    verification:
      - kind: unit
        ref: features/billing/earnings.test.ts
        status: pass
      - kind: automated_ui
        ref: Browser walkthrough of /earnings and /wallet
        status: pass
    human_judgment: false
  - id: D3
    description: Expert insights summarize owned agents and expose only consented transcripts for owned agents.
    requirement: EXPT-01
    verification:
      - kind: unit
        ref: features/insights/insights.test.ts
        status: pass
      - kind: automated_ui
        ref: Browser walkthrough of /insights with sharing enabled and disabled
        status: pass
    human_judgment: false
  - id: D4
    description: Shared transcript rendering is privacy-minimized and treats conversation text as text.
    requirement: EXPT-02
    verification:
      - kind: unit
        ref: features/insights/insights.test.ts
        status: pass
      - kind: other
        ref: Privacy acceptance checks for owner, sharing, and safe React text rendering
        status: pass
    human_judgment: false

# Metrics
duration: 17min
completed: 2026-09-27
status: complete
---

# Phase 4 Plan 3: Earnings and Expert Insights Summary

**Expert earnings now support guarded mock cash-outs, conversation-level breakdowns, and privacy-gated insight transcripts.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-27T05:40:00Z (approximate)
- **Completed:** 2026-09-27T05:57:23Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added mock cash-out requests that revalidate available earned credits during the store update, debit the wallet once, and create a requested payout.
- Added deterministic conversation earnings summaries and retained complete, newest-first wallet history.
- Added expert insight summaries and transcript sharing that requires consent and ownership.
- Verified targeted tests, typecheck, lint, build, and browser walkthroughs. The full suite passed with 120 tests across 13 files.

## Task Commits

1. **Task 1: Mock cash-out** - `8b4b78b` (feat), with zero-total display correction `455fa45` (fix)
2. **Task 2: Earnings breakdown and wallet history** - `ade60bc` (test), `9361c24` (feat)
3. **Task 3: Expert insights and shared transcripts** - `be70f1c` (test), `28bcb85` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `features/billing/cashout.ts` and `features/billing/cashout.test.ts` - guarded cash-out planning, application, and store action.
- `components/earnings/cashout-dialog.tsx` - request dialog and button.
- `features/billing/earnings.ts` and `features/billing/earnings.test.ts` - per-conversation earnings view model and aggregation tests.
- `features/insights/insights.ts` and `features/insights/insights.test.ts` - insight aggregation and privacy selectors.
- `components/insights/shared-transcripts.tsx` - safe rendering for consented transcripts.
- `app/(app)/earnings/page.tsx` - cash-out, earnings breakdown, payouts, and wallet history.
- `app/(app)/insights/page.tsx` - expert metrics and consented transcript view.

## Decisions Made

- Cash-outs are limited to earned credits not already cashed out, capped by current balance.
- Transcript access follows the existing `shareTranscript` choice and agent owner, with revocation taking effect on the next selector read.

## Deviations from Plan

### Auto-fixed Issues

**1. Negative zero shown in cash-out summary**
- **Found during:** Task 1 browser walkthrough
- **Issue:** Before any cash-out, the negated sum of cash-out rows could display as `-0 credits`.
- **Fix:** Clamp lifetime cash-outs at zero and add regression coverage.
- **Files modified:** `features/billing/cashout.ts`, `features/billing/cashout.test.ts`
- **Verification:** Cash-out tests and full suite passed.
- **Committed in:** `455fa45`

**Total deviations:** 1 auto-fixed.
**Impact on plan:** Corrected an edge-case display without expanding scope.

## Issues Encountered

- During browser checks, Maria initially saw only the shoulder transcript because Sam had not enabled sharing on the knee conversation. Enabling the existing share control caused it to appear as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-03 is complete. Proceed with plan 04-04, then plan 04-05; plan 04-06 is also unblocked by this plan.

---
*Phase: 04-trust-insights-launch-readiness*
*Completed: 2026-09-27*
