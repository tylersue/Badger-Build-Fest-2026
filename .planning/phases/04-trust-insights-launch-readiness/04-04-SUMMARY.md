---
phase: 04-trust-insights-launch-readiness
plan: 04
subsystem: benchmark, marketplace
tags: [sample-data, scoring, leaderboard, marketplace, comparison]

# Dependency graph
requires:
  - phase: 04-trust-insights-launch-readiness
    provides: published seed agents and category model
provides:
  - Single-file illustrative benchmark dataset and weighted scoring model
  - Labeled benchmark leaderboard, category filter, and reusable agent comparison panel
  - Marketplace score badges and Benchmarks sidebar navigation
affects: [04-05, marketplace, benchmark]

# Actuals (#2632)
actuals:
  tokens: 7200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Keep illustrative benchmark numbers in one read-only dataset and label every display
    - Normalize metric dimensions into bounded 0–100 scores before weighted ranking
    - Reuse a single comparison panel across the global route and agent listings

key-files:
  created:
    - lib/data/benchmarks.ts
    - features/benchmark/score.ts
    - features/benchmark/score.test.ts
    - components/benchmark/benchmark-ui.tsx
    - components/benchmark/agent-benchmark-panel.tsx
    - app/(app)/benchmarks/page.tsx
  modified:
    - components/shell/app-shell.tsx
    - components/app/marketplace.tsx

key-decisions:
  - "Benchmark figures are hand-picked sample data, not measured runs, and are all held in lib/data/benchmarks.ts."
  - "Overall score weights cost, tokens, latency, build time, task success, and tool-call accuracy; lower cost/usage/time is better."
  - "The named suite bases are τ²-bench, BFCL, and GAIA task formats."

patterns-established:
  - "Benchmark views show a visible Sample data label and caption; badges provide the caveat in title and aria-label."
  - "Score bars use the success color for our agents and neutral line color for general agents."

requirements-completed: [BENCH-01]

coverage:
  - id: D1
    description: The benchmark route ranks published expert agents and general agents on six weighted dimensions.
    requirement: BENCH-01
    verification:
      - kind: unit
        ref: features/benchmark/score.test.ts
        status: pass
      - kind: automated_ui
        ref: Browser walkthrough of /benchmarks and category filter
        status: pass
      - kind: other
        ref: pnpm typecheck && pnpm lint && pnpm test && pnpm build
        status: pass
    human_judgment: true
    rationale: The rendered charts and table readability still benefit from visual review against the established UI spec.
  - id: D2
    description: The comparison panel and marketplace badges consistently disclose that scores are sample data.
    requirement: BENCH-01
    verification:
      - kind: automated_ui
        ref: Browser walkthrough of comparison panel and marketplace benchmark badges
        status: pass
      - kind: other
        ref: Acceptance checks for sample label, caption, and benchmark number placement
        status: pass
    human_judgment: true
    rationale: Automated checks verify labels and placement; a person should confirm that the caveat is visually prominent enough.

# Metrics
duration: 9min
completed: 2026-09-27
status: complete
---

# Phase 4 Plan 4: Benchmarks Summary

**A sample-labeled benchmark leaderboard compares published expert agents with Muse, Grok, and Hermes across six scored dimensions.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-27T05:57:23Z (approximate)
- **Completed:** 2026-09-27T06:06:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added a central sample dataset and tested dimension and weighted overall scoring, including bounds, monotonicity, and category rankings.
- Added a labeled, filterable `/benchmarks` leaderboard and a reusable panel with overall and per-dimension comparisons.
- Added benchmark badges on marketplace grid cards and a shared Benchmarks sidebar link.
- Verified the category filter and route content in the browser. Typecheck, lint, all 128 tests, and production build passed.

## Task Commits

1. **Task 1: Sample data, scoring, and leaderboard** - `3948ae1` (feat)
2. **Task 2: Comparison panel, category filter, sidebar, and marketplace badge** - `a5af31a` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `lib/data/benchmarks.ts` - all sample metrics, competitor labels, and suite descriptions.
- `features/benchmark/score.ts` - dimension scores, aggregate scores, comparison rows, and leaderboard selection.
- `features/benchmark/score.test.ts` - bounds, weights, monotonicity, ranking, and exclusion tests.
- `components/benchmark/benchmark-ui.tsx` - sample disclosure, score badge, and accessible score bar.
- `components/benchmark/agent-benchmark-panel.tsx` - reusable agent-to-competitor comparison.
- `app/(app)/benchmarks/page.tsx` - category-filtered leaderboard, agent comparison, and scoring guide.
- `components/shell/app-shell.tsx` - Benchmarks navigation row.
- `components/app/marketplace.tsx` - sample score badge in each benchmarked grid card.

## Decisions Made

- Sample values remain in one data file and are labeled as illustrative, not measured.
- The scoring formula gives task success the largest weight, with cost, token use, answer time, build time, and tool-call accuracy also included.
- The selected suite formats are τ²-bench, BFCL, and GAIA because they map to domain conversation success, tool-call accuracy, and multi-step question efficiency.

## Deviations from Plan

None - implementation followed the plan. The comparison panel and page filter were developed alongside the base route so the route shipped as one coherent feature.

## Issues Encountered

- Initial tests assumed seed agents were stored on `DemoState`; the app keeps them in `lib/data/seed.ts`, so tests were corrected to use the exported seed list.
- A typecheck caught a mistaken module import for benchmark dimensions; the import was corrected before full verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The reusable `<AgentBenchmarkPanel>` is ready for plan 04-05 to mount in the agent listing's Benchmark tab.

---
*Phase: 04-trust-insights-launch-readiness*
*Completed: 2026-09-27*
