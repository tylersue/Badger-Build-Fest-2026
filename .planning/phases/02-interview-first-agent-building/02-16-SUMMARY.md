---
phase: 02-interview-first-agent-building
plan: "16"
subsystem: builder-ui
tags: [nextjs, builder, interview, persona, knowledge, sandbox, wallet, responsive]
requires:
  - phase: 02-12
    provides: Server snapshot, wallet and asynchronous browser bridge
  - phase: 02-13
    provides: Interview view and answer editor
  - phase: 02-14
    provides: Persona view
  - phase: 02-15
    provides: Knowledge view and source intake
provides:
  - Existing builder routes mount real interview, persona, knowledge and sandbox views
  - Responsive Configure drawer with server-backed knowledge summaries
  - Acknowledged mock grants, profile, reset, legacy import and agent creation UI
  - Next 16-compatible API route exports with injectable handlers in sibling modules
affects: [02-17-integration, 02-18-live-acceptance, phase-3-publishing]
tech-stack:
  added: []
  patterns: [server-snapshot summaries, pending mutation locks, route-only Next exports]
key-files:
  created: [app/api/agents/[agentId]/interview/handlers.ts, app/api/agents/[agentId]/persona/handlers.ts, app/api/agents/[agentId]/sources/handlers.ts]
  modified: [components/app/builder-section.tsx, components/app/builder.tsx, components/app/add-credits.tsx, app/(app)/build/new/page.tsx, app/(app)/settings/page.tsx, app/(app)/wallet/page.tsx]
key-decisions:
  - "Use server interview and source state for Configure counts; fixture source data does not count as captured knowledge."
  - "Keep Inter and use an escalated network build for Next's build-time font fetch."
  - "Move testable API handler factories out of route modules to satisfy Next 16's export validation."
patterns-established:
  - "Mutation screens disable repeated submission and announce success only after server acknowledgement."
  - "At narrow widths Configure uses a focus-trapped Radix sheet; desktop keeps the 480px drawer."
requirements-completed: [INTV-03, PERS-01, DOCS-02, SBOX-01, CRED-03, CRED-05]
duration: 11min
completed: 2026-09-27
---

# Phase 2 Plan 16: Builder Integration Summary

**All existing Phase 2 builder sections now mount their real views, and funding and settings actions wait for server results while the wallet shows exact balances and pending holds.**

## Performance

- **Started:** Approximately 2026-09-27T03:24:00Z
- **Completed:** 2026-09-27T03:35:28Z
- **Duration:** About 11 minutes
- **Tasks:** 2 of 2
- **Files changed:** 19

## Accomplishments

- Routed Interview, Persona, Knowledge and Test to their completed components. Knowledge answer rows use the shared AnswerEditor. Loading or failed identity snapshots no longer expose stale builder content; the error offers retry.
- Configure reads selected snapshot sources and owned interview answers. It uses a 480px desktop drawer and a focus-trapped, closable sheet below 1024px, with wrapping rows and full-size touch targets.
- Mock Subscribe and Buy pack lock while pending and report only acknowledged grant amounts. New agent creation waits for a persisted ID before navigation. Settings adds explicit legacy draft import, precise reset copy and retained profile drafts on save failure. Wallet reads exact balance, available units and pending holds from the server snapshot.
- Corrected five API route modules so their injectable test factories live in adjacent `handlers.ts` modules. Route files now export only Next-supported HTTP methods.

## Task Commits

1. **Task 1: Route views and Configure drawer** — `4310ceb`
2. **Task 2: Acknowledged shell mutations and wallet** — `13a59e2`
3. **Integration fix: Next route export validation** — `4f0d215`

## Verification

- `next typegen`, `tsc --noEmit`, and repository-wide ESLint: passed.
- Vitest offline suite: **129 passed, 1 skipped**. The skipped test requires a disposable live Supabase instance.
- `pnpm build` with Turbopack: passed production compilation, TypeScript validation and static generation. `next build --webpack` also passed. Both successful builds used escalated network access so Next could fetch the approved Inter font at build time.
- The initial sandboxed webpack build failed DNS lookup for `fonts.googleapis.com`; a bounded escalated build confirmed the network cause. The initial Turbopack build was stopped after remaining at optimization with no output; the final default Turbopack build passed.
- No live Supabase migration, Anthropic, Voyage or paid provider call was executed. Plan 02-18 owns that acceptance.

## Decisions Made

- Kept the approved Inter font unchanged. The successful default build confirms the build-time font fetch works with network access.
- Preserved Phase 3's publish preview and placeholder because publishing controls are outside this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved test factories out of Next route modules**
- **Found during:** Overall production build after Task 2.
- **Issue:** Next 16 rejects arbitrary exports from route files, even though ordinary `next typegen` and `tsc` passed before a production build generated stricter route types.
- **Fix:** Moved five factories into sibling `handlers.ts` files and updated their offline test imports; route modules now export only HTTP handlers.
- **Files modified:** Five builder API route modules, five new handler modules and three route test files.
- **Verification:** 129 offline tests, typecheck, lint, webpack and default Turbopack production builds passed.
- **Committed in:** `4f0d215`

**Total deviations:** 1 blocking issue fixed. No packages or new network endpoints were added.

## Known Stubs

- `components/app/builder-section.tsx`: The Publish section retains the Phase 3 `PlaceholderNote` and preview link; publishing controls belong to Phase 3 and do not block Phase 2 builder views.

## Issues Encountered

- Build-time Google Fonts access is required by the existing Inter configuration. The sandbox had no DNS access; an escalated build succeeded without changing typography.

## Next Phase Readiness

- Phase 2 route integration, offline checks and a full production build pass. Browser and live-provider acceptance remain for plans 02-17 and 02-18.

## Self-Check: PASSED

- Builder route and drawer files, the summary, and the new API handler modules exist.
- All three task and integration commits are present: `4310ceb`, `13a59e2`, `4f0d215`.
