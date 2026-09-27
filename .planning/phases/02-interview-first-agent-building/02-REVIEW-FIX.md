---
phase: 02-interview-first-agent-building
fixed_at: 2026-09-27T04:19:12Z
review_path: .planning/phases/02-interview-first-agent-building/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-09-27T04:19:12Z  
**Source review:** `.planning/phases/02-interview-first-agent-building/02-REVIEW.md`  
**Iteration:** 1

**Summary:** Three critical findings fixed; none skipped. CR-03 is a logic fix that requires human verification of its database behavior before phase completion.

## Fixed Issues

### CR-01: Intake migration privilege signature

**Files modified:** `supabase/migrations/20260927000500_phase2_intake.sql`, `features/knowledge/intake-migration.test.ts`  
**Commit:** `44de225`  
**Applied fix:** Both privilege statements now match the 17 declared argument types. A regression test compares the declaration with both signatures. The migration has not been applied to a fresh database in this fixer run.

### CR-02: Settled sandbox charges after reload

**Files modified:** `lib/money.ts`, `lib/money.test.ts`, `components/app/sandbox-view.tsx`, `app/api/agents/[agentId]/sandbox/route.ts`, `features/runtime/sandbox-route.test.ts`  
**Commit:** `4e47d98`  
**Applied fix:** The transcript API and client share a parser that turns safe nonnegative numeric JSON and exact PostgreSQL bigint decimal strings into canonical strings. Unsafe values fail rather than appearing as a pending charge.

### CR-03: Partial answer replay and recovery

**Files modified:** `features/runtime/agent.ts`, `features/runtime/agent.test.ts`, `features/runtime/events.ts`, `app/api/agents/[agentId]/sandbox/route.ts`, `features/runtime/sandbox-route.test.ts`, `components/app/sandbox-view.tsx`, `components/app/chat-state.test.ts`, `tests/integration/builder-flow.test.ts`, `supabase/migrations/20260927000650_phase2_answer_recovery.sql`  
**Commit:** `c71e88b`  
**Status:** fixed: requires human verification  
**Applied fix:** Complete logs replay immediately. Unfinished logs replay while active; after five minutes without database activity, a serialized database transaction settles recorded attempts, reconstructs a durable answer or failure, and appends cost and done events. A recovery marker fences late event writes and new provider attempt transitions. Prepared attempts are released as unused; dispatched or unknown attempts keep their hold pending reconciliation. Retried requests never redispatch an existing operation. The sandbox polls until a durable done event and keeps failed drafts with a new request key.

## Verification

The full offline suite passed: 151 tests passed, 5 live tests skipped. `next typegen`, `tsc --noEmit`, `eslint .`, and the production build passed. No paid provider calls were made. PostgreSQL migration application and live concurrent recovery behavior remain for plan 02-18; this report does not mark that gate or an independent re-review complete.

---

_Fixed: 2026-09-27T04:19:12Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 1_
