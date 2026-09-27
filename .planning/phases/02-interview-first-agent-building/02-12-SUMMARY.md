---
phase: 02-interview-first-agent-building
plan: "12"
subsystem: browser-bridge
tags: [server-snapshot, ndjson, sandbox, drafts, idempotency, wallet]
requires:
  - phase: 02-04
    provides: Owned demo snapshot, explicit import, agent creation and reset
  - phase: 02-09
    provides: Durable interview and answer routes
  - phase: 02-10
    provides: Hash-bound source estimate and resend confirmation
  - phase: 02-11
    provides: Owner-scoped durable answer producer and replay
provides:
  - Typed browser API client and incremental replay-safe NDJSON decoder
  - Owned sandbox transcript, streaming and operation replay route
  - Server-backed wallet, agent and builder browser bridge with persistent local drafts
  - Idempotent mock grant route and exact fractional credit display
affects: [02-13-interview-ui, 02-14-persona-ui, 02-15-knowledge-ui, 02-16-shell, 02-18-live-acceptance]
tech-stack:
  added: []
  patterns: [server-authoritative snapshots, local draft-only persistence, stable request keys, owner-guarded event replay]
key-files:
  created: [lib/api-client.ts, lib/api-client.test.ts, lib/demo-store.test.ts, app/api/agents/[agentId]/sandbox/route.ts, app/api/wallet/grants/route.ts, features/runtime/sandbox-route.test.ts]
  modified: [lib/demo-store.ts, lib/format.ts, lib/server/demo.ts, supabase/migrations/20260927000250_phase2_seed.sql, components/app/builder-section.tsx]
key-decisions:
  - "Only selection and drafts, including stable request keys, persist in browser storage; wallet and ledger always come from the selected server snapshot."
  - "Sandbox identity, mode and conversation are fixed by the route; replay requires both selected identity and sandbox agent ownership."
  - "Existing Phase 3 hirer actions fail with a typed configuration error until their live route exists."
patterns-established:
  - "Confirm source intake with the same File/text and name used at preflight; never auto-reconfirm a stale estimate."
  - "On an unknown paid outcome, retain the draft and its request key for explicit retry or replay."
requirements-completed: [INTV-03, PERS-01, SBOX-01, CRED-03, CRED-05]
duration: 18min
completed: 2026-09-27
---

# Phase 2 Plan 12: Server Browser Bridge Summary

**The builder now calls persisted interview and sandbox services while the shell reads the selected server wallet; local storage holds drafts and selection only.**

## Performance

- **Started:** 2026-09-27T02:50:52Z
- **Completed:** 2026-09-27T03:08:22Z
- **Duration:** About 18 minutes
- **Tasks:** 2 of 2
- **Files changed:** 18

## Accomplishments

- Added strict owner-scoped sandbox GET transcript/replay and POST NDJSON streaming. POST accepts only bounded text and a matching idempotency key; the route fixes actor, sandbox mode and conversation. Its first producer event is read before response headers so pre-dispatch refusal has a typed HTTP error. Disconnect does not cancel durable answer settlement.
- Added typed browser fetch operations for snapshot, identity, agents, profile, grants, interview, answers, persona, sources, sandbox transcript and replay. The incremental decoder handles fragmented UTF-8 and lines, deduplicates repeated sequences, rejects gaps, and supports cancellation. Source confirmation resends the original bounded File or text plus name/token/key; stale estimates are surfaced without automatic confirmation.
- Replaced the Phase 1 local financial ledger and canned paid answer path. Selected snapshot state now supplies wallet, ledger, agents, persona, sources, interview turns and messages. Only identity and per-agent drafts/request keys persist locally. Failed transport keeps input, and late responses from a prior identity cannot overwrite the current wallet. Legacy profile/persona/answer import is an explicit action; financial rows are never sent.
- Updated the existing builder, profile, reset, new-agent and funding callers to await live acknowledgements and show errors. Existing hirer chat actions fail explicitly because Phase 3 has not exposed their live routes. New agents receive an owned sandbox conversation within the creation RPC.
- Corrected the compatibility display conversion to 10,000,000 units per credit and added an exact string-based fractional credit formatter. Wallet balance, held units and available units remain separate in the bridge.

## Task Commits

1. **Task 1: Sandbox, grants and typed transport** — `1667a94`
2. **Task 2: Authoritative browser bridge and caller compatibility** — `41d53c7`
3. **Task 2 correction: Visible configuration failures** — `c5f029a`

## Verification

- Full offline Vitest suite: **120 passed, 1 skipped** across 25 files. The skipped retrieval integration requires a disposable live Supabase instance.
- Installed Next type generation, TypeScript `tsc --noEmit`, targeted ESLint and `git diff --check`: **passed**.
- Focused tests cover fragmented NDJSON, duplicate replay sequences, pending cost, typed refusal, no automatic paid retry, exact source byte resend and stale estimate, server-fixed sandbox actor/mode, forbidden client pricing controls, unowned sandbox refusal, draft reload/separation, failed interview preservation, legacy ledger exclusion, stable grant retry keys and late identity responses.
- No SQL migration, Anthropic, Voyage or real database operation was executed here; plan 02-18 owns live acceptance. The prior production build hung during optimization in plan 02-07, so this execution used typegen, typecheck and the full offline suite rather than repeating an unbounded build.

## Browser Handoff for Plans 13–16

- `lib/demo-store.ts` keeps `useDemo`, `useDemoSnapshot`, `agentById`, `messagesFor`, `interviewTurnsFor`, `balanceOf`, `ledgerFor` and other prior selectors. New exports are `refreshDemo`, `readDemoState`, `getDraft`, `saveDraft`, `clearDraft`, `walletStatus`, `availableWalletUnits`, `heldWalletUnits`, `readInterview`, `controlInterview`, `answerInterview`, `sendSandboxMessage`, `saveProfile`, `savePersona`, `createAgent`, `addCredits`, `resetDemo` and `importLegacyDrafts`. Mutations return promises and retain their drafts on failure.
- `lib/api-client.ts` exports `api.snapshot/identity/createAgent/saveProfile/grant/reset/importLegacy`, `api.interview/interviewControl/interviewSubmit/answerAction/deleteAnswer`, `api.persona/savePersona`, `api.sourcePreflight/sourceConfirm/sourceRetryPreflight/sourceRetry/sourceResume/sourceDelete`, `api.sandboxTranscript/sandboxReplay`, `streamSandbox`, `decodeNdjson`, `ApiClientError` and `newRequestKey`.
- The interview UI should read `InterviewView` through `readInterview`, use the current `pendingQuestion.id` and `version` when submitting, and keep `getDraft("interview", agentId)` in its composer. The persona and knowledge UIs should use the corresponding draft keys while presenting server snapshot state. A File can remain in component memory through preflight and confirmation; after reload it must be selected again and preflighted. The sandbox UI may consume `streamSandbox` directly for progressive events and use replay by operation ID after a disconnect.

## Decisions Made

- No server snapshot is stored locally. When backend configuration is unavailable, the bridge reports an actionable error and every paid mutation fails before a canned response or client debit.
- The compatibility `*Cents` numeric values are display credits, including fractions. Financial arithmetic and mutation inputs use exact decimal unit strings from the server.
- An acknowledged grant clears its retry key before refreshing the snapshot. An unacknowledged grant or sandbox call retains its key to prevent a second paid operation after a transport failure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] New agents had no sandbox conversation.**
- **Found during:** Task 1
- **Issue:** The new-agent RPC created persona and interview state but not `sandbox:{agentId}`; the route could not serve a new agent.
- **Fix:** Inserted the owned sandbox conversation inside the existing atomic creation RPC.
- **Files modified:** `supabase/migrations/20260927000250_phase2_seed.sql`
- **Verification:** Route contract tests, typecheck; live migration remains in plan 02-18.
- **Committed in:** `1667a94`

**2. [Rule 1 - Bug] Corrected 100× compatibility wallet display.**
- **Found during:** Task 2
- **Issue:** The snapshot's legacy numeric converter divided nanodollars by 100,000, displaying a 5,000-credit opening grant as 500,000 credits.
- **Fix:** Divided by 10,000,000 units per credit and preserved fractional display values.
- **Files modified:** `lib/server/demo.ts`, `lib/demo-store.ts`, `lib/format.ts`
- **Verification:** Store balance assertion, full suite and typecheck.
- **Committed in:** `41d53c7`

**3. [Rule 2 - Missing critical functionality] Made unavailable live actions visible.**
- **Found during:** Task 2 final UI review
- **Issue:** The old shell showed a zero wallet during configuration failure, and Phase 3 chat callers could surface uncaught errors.
- **Fix:** Show live service error or loading state, disable builder composers until a snapshot is ready, and render chat errors in a toast.
- **Files modified:** `components/shell/app-shell.tsx`, `components/app/builder-section.tsx`, `app/(app)/agents/[slug]/page.tsx`, `app/(app)/chat/[conversationId]/page.tsx`
- **Verification:** TypeScript typecheck, targeted ESLint and diff check.
- **Committed in:** `c5f029a`

**4. [Rule 3 - Blocking] Updated Phase 1 synchronous UI callers.**
- **Found during:** Task 2
- **Issue:** Builder, funding and profile callers assumed immediate local mutation and failed typecheck against acknowledged async actions.
- **Fix:** Awaited server actions, retained composer input on failure, displayed errors and used snapshot-backed source/answer counts.
- **Files modified:** `components/app/builder.tsx`, `components/app/builder-section.tsx`, `components/app/add-credits.tsx`, `app/(app)/build/new/page.tsx`, `app/(app)/settings/page.tsx`
- **Verification:** Full suite, typecheck and targeted lint.
- **Committed in:** `41d53c7`

## Known Stubs

- `lib/demo-store.ts` deliberately throws `configuration` for Phase 3 hirer chat and generic agent edits because no live mutation route exists yet. Plans 16 and Phase 3 must replace those actions when their server routes exist.
- `components/app/builder-section.tsx` retains the existing placeholder persona, knowledge and publish panels. Plans 13–15 replace the builder UI; this bridge already supplies their persisted data and actions.
- The bridge retains labeled seed fixtures for display while a first snapshot loads; wallet values and paid actions remain unavailable until server state arrives.

## Issues Encountered

- The linked worktree Git index is outside the write sandbox; narrow Git escalation was needed for both task commits.
- Missing live service credentials prevent verifying SQL migration, provider usage and settlement locally; those are required for plan 02-18.

## Next Phase Readiness

Plans 13–15 can build on typed API and draft exports above. Plan 16 can replace remaining placeholder shell panels. Plan 18 must apply the edited creation migration and verify real sandbox ownership, event replay, source resend, billing settlement and wallet conservation against live services.

## Self-Check: PASSED

All six created code/test files and this summary exist; task commits `1667a94`, `41d53c7` and `c5f029a` resolve. No tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
