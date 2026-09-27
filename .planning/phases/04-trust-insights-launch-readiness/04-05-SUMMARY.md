---
phase: 04-trust-insights-launch-readiness
plan: 05
subsystem: marketplace, trust
tags: [reviews, ratings, flagging, benchmark-tab, moderation]

# Dependency graph
requires:
  - phase: 04-trust-insights-launch-readiness/04-01
    provides: review collections, demo-store commit seam, moderation actions
  - phase: 04-trust-insights-launch-readiness/04-02
    provides: reusable agent flag dialog
  - phase: 04-trust-insights-launch-readiness/04-04
    provides: reusable sample-labeled benchmark comparison panel
provides:
  - Message-gated, once-per-identity agent ratings and written reviews
  - Listing Reviews and Benchmark tabs, plus an agent flag control
  - Owner-visible moderation note when an agent has been unpublished
affects: [04-06, marketplace, trust, benchmark]

# Actuals (#2632)
actuals:
  tokens: 9200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Count only hirer-authored user messages across that identity's conversations with the agent
    - Revalidate eligibility inside commitDemo before adding a review and rolling the rating
    - Keep review text as React children and cap validated comments at 1000 characters

key-files:
  created:
    - features/trust/reviews.ts
    - features/trust/reviews.test.ts
    - components/trust/agent-reviews.tsx
    - components/trust/listing-extras.tsx
  modified:
    - app/(app)/agents/[slug]/page.tsx

key-decisions:
  - "Ratings unlock after five user messages by the hirer across conversations with the agent; the owner and prior reviewers remain ineligible."
  - "The rolling average uses the existing seeded aggregate and is rounded to two decimal places."
  - "The listing page keeps a two-line Phase 4 slot after About the expert; its total diff is two insertions."

patterns-established:
  - "Review submission re-plans against committed state to prevent duplicate reviews."
  - "The listing's sample benchmark panel and agent flag flow reuse shared components from earlier plans."

requirements-completed: [MKT-05, MKT-V2-03, MKT-06, BENCH-01]

coverage:
  - id: D1
    description: Eligible hirers can leave one 1–5 star rating with an optional written review after five messages.
    requirement: MKT-05
    verification:
      - kind: unit
        ref: features/trust/reviews.test.ts
        status: pass
      - kind: automated_ui
        ref: Browser walkthrough: Sam unlocked at 5 messages and submitted a 5-star review
        status: pass
    human_judgment: true
    rationale: Form states and the review list layout still benefit from visual review against the listing UI spec.
  - id: D2
    description: The listing and marketplace show the updated rating count and the newest written review.
    requirement: MKT-V2-03
    verification:
      - kind: unit
        ref: features/trust/reviews.test.ts
        status: pass
      - kind: automated_ui
        ref: Browser walkthrough: review appeared first; listing and marketplace showed 24 ratings
        status: pass
    human_judgment: false
  - id: D3
    description: Visitors can flag an agent; the listing includes a sample-labeled Benchmark tab and owners can see unpublish notes.
    requirement: MKT-06
    verification:
      - kind: automated_ui
        ref: Browser walkthrough: flag appeared in Admin queue with Sam as reporter; Benchmark tab displayed Sample data
        status: pass
      - kind: manual_procedural
        ref: Owner-only moderation note path is implemented from moderationActionsFor and unpublished agent status
        status: unknown
    human_judgment: true
    rationale: The listing flag and benchmark tab were walked through; the owner-only unpublished note needs a direct visual check when an unpublished owner preview is available.

# Metrics
duration: 8min
completed: 2026-09-27
status: complete
---

# Phase 4 Plan 5: Reviews and Listing Controls Summary

**Agent listings now accept one message-gated rating per hirer, show written reviews, and provide flag and benchmark tabs.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-27T06:06:38Z (approximate)
- **Completed:** 2026-09-27T06:14:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added review eligibility, input validation, two-decimal rolling rating, and a commit-time duplicate guard.
- Added review form states, star buttons, comment counter, reviewer names, dates, and literal text rendering.
- Added Reviews and Benchmark tabs, an always-available agent flag control, and owner-only moderation note rendering.
- Connected the single listing extras slot after About the expert.
- Verified the targeted and full test suites, typecheck, lint, build, and the live review, marketplace, flag, and benchmark flows.

## Task Commits

1. **Task 1: Message-gated ratings and written reviews** - `54580af` (feat)
2. **Task 2: Listing tabs, flag action, and moderation note** - `242fecc` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `features/trust/reviews.ts` - message threshold, eligibility, validation, rating roll, and store-backed submission.
- `features/trust/reviews.test.ts` - boundary, duplicate, update, and persistence checks.
- `components/trust/agent-reviews.tsx` - review form, eligibility states, summary, and review list.
- `components/trust/listing-extras.tsx` - Reviews/Benchmark tabs, flag control, and owner note.
- `app/(app)/agents/[slug]/page.tsx` - one slot after the About the expert card.

## Decisions Made

- Count user-authored messages in the hirer's conversations with the agent; replies and other identities' messages do not unlock ratings.
- Roll new ratings into the existing aggregate so seeded rating history remains reflected.
- Preserve free-text comments as React text and reject trimmed comments longer than 1000 characters.

## Deviations from Plan

None - plan behavior and file boundaries were followed.

## Issues Encountered

- Browser verification used two prompted chat turns and added one review and one test flag to the browser's local demo state. The identity switcher was returned to Maria after verification.
- An initial browser tab became stale after the development server restarted; reconnecting to the existing browser session restored the check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-05 is complete. Plan 04-06 is ready; the benchmark panel is also ready for the Phase 4 listing integration already added here.

---
*Phase: 04-trust-insights-launch-readiness*
*Completed: 2026-09-27*
