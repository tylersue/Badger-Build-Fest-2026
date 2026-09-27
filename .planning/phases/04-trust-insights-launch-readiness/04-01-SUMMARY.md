---
phase: 04-trust-insights-launch-readiness
plan: 01
subsystem: data
tags: [demo-store, localstorage, vitest, seed-data, reviews, flags, moderation, payouts]

# Dependency graph
requires:
  - phase: 03-publish-discover-use
    provides: "conversationEdits, knowledgeTouchedAt, isWeakRetrieval, the demo store load()/setState() seam"
provides:
  - "Review, ReviewStars, Payout, PayoutStatus, ModerationAction types; Flag gains reporterId/resolvedAt/resolutionNote; LedgerEntry.refType gains payout"
  - "normalizeDemoState shape-repair, createInitialDemoState, readDemo/commitDemo seam"
  - "allReviews, reviewsFor, allFlags, messageById, allPayouts, payoutsFor, allModerationActions, moderationActionsFor selectors"
  - "messagesFor/messageById apply the messageFeedback overlay"
  - "18 seeded REVIEWS rows, 3 seeded FLAGS rows, three reviewer-only identities (riley, morgan, casey)"
  - "in-memory localStorage test harness (lib/testing/demo-store-harness.ts)"
affects: [04-02, 04-03, 04-04, 04-05, 04-06]

actuals:
  tokens: 7700
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "commitDemo(update) is the single write seam for every Phase 4 feature module (D-02); features/ compute pure functions and commit once"
    - "normalizeDemoState repairs each optional Phase 4 collection independently (Array.isArray for lists, non-null non-array object for records), so one corrupted key never wipes the rest of saved state"
    - "Overlay pattern: seeded rows + browser-written rows, admin/user edits merged in by id (flagEdits, messageFeedback) rather than mutating seeded arrays"

key-files:
  created:
    - lib/testing/demo-store-harness.ts
    - lib/demo-store.test.ts
  modified:
    - lib/types.ts
    - lib/demo-store.ts
    - lib/data/seed.ts
    - lib/data/seed.test.ts

key-decisions:
  - "Reused existing avatar colors for the three new reviewer-only identities (riley, morgan, casey) instead of inventing new ones, per the plan's instruction to reuse the file's existing palette"
  - "normalizeDemoState written generically from Task 1 (a single isRecord helper plus per-key Array.isArray/isRecord checks) so Task 2 only added lines, never restructured the function"
  - "Test assertions compare review/flag ids rather than full deep-equality against a separately-imported seed module, because vi.resetModules() gives the dynamically-loaded store its own seed.ts instance whose ago()-derived timestamps differ by milliseconds from a statically-imported REVIEWS/FLAGS in the test file — an artifact of the harness, not a real behavior difference"

requirements-completed: [MKT-05, MKT-V2-03, MKT-06, CHAT-08, CHAT-09, CRED-09, ADMN-01]

coverage:
  - id: D1
    description: "Shared Phase 4 data contracts (types, demo-store additions, seed data) land additively; old saved browser state keeps loading unchanged"
    requirement: "MKT-05"
    verification:
      - kind: unit
        ref: "lib/demo-store.test.ts#loads a pre-Phase-4 saved payload without losing its data (T-04-03)"
        status: pass
      - kind: unit
        ref: "lib/demo-store.test.ts#repairs a malformed Phase 4 collection to its default without losing the rest of the state (T-04-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The commitDemo seam persists a Phase 4 write (review) to localStorage and it survives a reload"
    requirement: "MKT-V2-03"
    verification:
      - kind: unit
        ref: "lib/demo-store.test.ts#a review written through commitDemo is persisted and reappears after a reload"
        status: pass
    human_judgment: false
  - id: D3
    description: "Seeded reviews (18 rows) satisfy the once-per-agent-per-reviewer rule, never the switchable hirer or the agent's own owner, and stay within each agent's seeded ratingCount"
    requirement: "MKT-V2-03"
    verification:
      - kind: unit
        ref: "lib/data/seed.test.ts#reviewer ids are unique per agent and never the agent's owner or sam"
        status: pass
      - kind: unit
        ref: "lib/data/seed.test.ts#every reviewed agent is published, and every reviewer id exists in IDENTITIES"
        status: pass
      - kind: unit
        ref: "lib/data/seed.test.ts#each agent's seeded review count is at most its ratingCount"
        status: pass
    human_judgment: false
  - id: D4
    description: "Thumbs feedback overlay (CHAT-08) and transcript-sharing reuse (CHAT-09) are wired through messagesFor/messageById without a second share collection"
    requirement: "CHAT-08"
    verification:
      - kind: unit
        ref: "lib/demo-store.test.ts#messageFeedback overlay applies to messagesFor and messageById, and is a no-op for an unknown id"
        status: pass
    human_judgment: false
  - id: D5
    description: "Seeded flags reference real agents/conversations and admin resolve edits merge into allFlags"
    requirement: "MKT-06"
    verification:
      - kind: unit
        ref: "lib/data/seed.test.ts#every conversation flag's conversation exists and has the same agentId"
        status: pass
      - kind: unit
        ref: "lib/demo-store.test.ts#flagEdits overlay merges into allFlags"
        status: pass
    human_judgment: false
  - id: D6
    description: "Payout and ModerationAction collections exist with newest-first selectors, ready for the cash-out and admin-unpublish features in later Phase 4 plans"
    requirement: "CRED-09"
    verification:
      - kind: unit
        ref: "lib/demo-store.test.ts#payoutsFor and moderationActionsFor return newest first"
        status: pass
    human_judgment: false
  - id: D7
    description: "resetDemo clears every Phase 4 collection (reviews, flags, flagEdits, messageFeedback, payouts, moderationActions)"
    requirement: "ADMN-01"
    verification:
      - kind: unit
        ref: "lib/demo-store.test.ts#resetDemo leaves every Phase 4 collection empty"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-27
status: complete
---

# Phase 4 Plan 01: Shared Phase 4 data contracts — reviews, flags, feedback overlay, payouts, moderation Summary

**Additive DemoState collections (reviews, flags, flagEdits, messageFeedback, payouts, moderationActions) plus the commitDemo write seam and normalizeDemoState shape-repair, so every later Phase 4 lane rebases on one small, tested foundation.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-27T01:22:00Z
- **Completed:** 2026-09-27T01:27:24Z
- **Tasks:** 2 (Task 1 tracer + Task 2 TDD)
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Merged/confirmed origin/main (Phase 3, #38) is an ancestor of this branch before any Phase 4 edit; installed the frozen lockfile
- Added `ReviewStars`/`Review` types and the `commitDemo`/`readDemo` write seam (D-02) that every future `features/` module will use instead of calling `setState` directly
- Added `normalizeDemoState`, exported `STORAGE_KEY`, and made `load()` route through it — a corrupted Phase 4 collection now resets to its default instead of throwing or wiping the rest of a saved browser state (T-04-01)
- Seeded 18 reviews (`REVIEWS`, 3 per published agent) and 3 flags (`FLAGS`) referencing real agents/conversations, plus three reviewer-only identities (riley, morgan, casey) that are never the switchable hirer and never an agent's own owner
- Added the `messageFeedback` overlay to `messagesFor`/new `messageById`, the `flagEdits` overlay to `allFlags`, and `allPayouts`/`payoutsFor`/`allModerationActions`/`moderationActionsFor` selectors (all currently empty until later plans write to them)
- Built an in-memory localStorage test harness (`lib/testing/demo-store-harness.ts`) that gives every test a fresh store module instance via `vi.resetModules()`
- 20 new/extended tests across `lib/demo-store.test.ts` and `lib/data/seed.test.ts`; full suite is 52/52 passing, typecheck and lint clean, frozen D-04 contract files unchanged

## Task Commits

Each task was committed atomically. Task 2 followed RED → GREEN (no REFACTOR needed — code was written cleanly on the first GREEN pass and required no further cleanup):

1. **Task 1: Tracer — sync with origin/main, round-trip seeded and new reviews through old saved state** - `7dcd7ff` (feat)
2. **Task 2 RED: failing tests for flags, feedback, payouts and moderation collections** - `a127929` (test)
3. **Task 2 GREEN: flags, thumbs overlay, payouts and moderation collections** - `ca8e1cc` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified

- `lib/types.ts` - `ReviewStars`, `Review`, `PayoutStatus`, `Payout`, `ModerationAction` types; `Flag.reporterId/resolvedAt/resolutionNote`; `LedgerEntry.refType` gains `"payout"`
- `lib/demo-store.ts` - exported `STORAGE_KEY`/`CANNED_USAGE`; `normalizeDemoState`, `createInitialDemoState`, `readDemo`, `commitDemo`; `allReviews`, `reviewsFor`, `allFlags`, `messageById`, `allPayouts`, `payoutsFor`, `allModerationActions`, `moderationActionsFor`; `messagesFor`/`messageById` apply the `messageFeedback` overlay
- `lib/data/seed.ts` - `REVIEWS` (18 rows), `FLAGS` (3 rows), reviewer identities `riley`/`morgan`/`casey`
- `lib/data/seed.test.ts` - review and flag seed-integrity tests
- `lib/testing/demo-store-harness.ts` (new) - `loadDemoStore`/`resetDemoHarness` in-memory localStorage test harness
- `lib/demo-store.test.ts` (new) - backward-compatibility, persistence, repair and overlay tests

## Decisions Made

- Reused the seed file's existing avatar colors for riley/morgan/casey instead of introducing new hex values
- Kept `normalizeDemoState` generic from Task 1 onward (one `isRecord` helper, per-key checks) so Task 2 only appended repair lines rather than restructuring
- Compared review/flag ids (not full deep-equality) against a statically-imported `REVIEWS`/`FLAGS` in two tests, since `vi.resetModules()` gives the dynamically-loaded store its own `seed.ts` instance whose `ago()`-derived timestamps differ by milliseconds — a harness artifact, not a real discrepancy in the data

## Deviations from Plan

None - plan executed exactly as written. Task 1's Step 0 sync found `origin/main` was already merged into this branch (visible in the branch's existing merge commit), so `git merge --no-edit origin/main` was a no-op; `pnpm install --frozen-lockfile` still ran as instructed and the baseline (`conversationEdits`, `knowledgeTouchedAt`, `isWeakRetrieval`) was confirmed present before any edit.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The three wave-2 lanes (ratings/reviews UI, feedback/sharing/flags/admin UI, insights/earnings/benchmark) can now rebase on `lib/types.ts`, `lib/demo-store.ts` and `lib/data/seed.ts` without further changes to these shared files.
- `allPayouts`/`allModerationActions` are wired but empty until a later plan writes to them via `commitDemo` (mock cash-out, admin unpublish).
- `/admin` still shows no table for the seeded flags (expected — Plan 04-02 replaces the placeholder page).

---
*Phase: 04-trust-insights-launch-readiness*
*Completed: 2026-09-27*
