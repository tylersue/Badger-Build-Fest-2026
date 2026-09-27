---
phase: 02-interview-first-agent-building
reviewed: 2026-09-27T04:01:42Z
re_reviewed: 2026-09-27T04:28:00Z
re_review_range: 6e14e32..c71e88b
re_review_scope: CR-01..CR-03 fixes
cr04_code_fix: d0d8ee4
depth: standard
files_reviewed: 119
files_reviewed_list:
  - .env.example
  - app/(app)/agents/[slug]/page.tsx
  - app/(app)/build/new/page.tsx
  - app/(app)/chat/[conversationId]/page.tsx
  - app/(app)/settings/page.tsx
  - app/(app)/wallet/page.tsx
  - app/api/agents/[agentId]/answers/[answerId]/handlers.ts
  - app/api/agents/[agentId]/answers/[answerId]/route.ts
  - app/api/agents/[agentId]/interview/handlers.ts
  - app/api/agents/[agentId]/interview/route.ts
  - app/api/agents/[agentId]/persona/handlers.ts
  - app/api/agents/[agentId]/persona/route.ts
  - app/api/agents/[agentId]/sandbox/route.ts
  - app/api/agents/[agentId]/sources/[sourceId]/handlers.ts
  - app/api/agents/[agentId]/sources/[sourceId]/route.ts
  - app/api/agents/[agentId]/sources/handlers.ts
  - app/api/agents/[agentId]/sources/route.ts
  - app/api/agents/route.ts
  - app/api/demo/identity/route.ts
  - app/api/demo/import/route.ts
  - app/api/demo/reset/route.ts
  - app/api/demo/snapshot/route.ts
  - app/api/operations/[operationId]/route.ts
  - app/api/profile/route.ts
  - app/api/wallet/grants/route.ts
  - components/app/add-credits.tsx
  - components/app/answer-editor.tsx
  - components/app/builder-section.tsx
  - components/app/builder.tsx
  - components/app/chat-state.test.ts
  - components/app/chat-state.ts
  - components/app/chat.tsx
  - components/app/interview-view.tsx
  - components/app/knowledge-view.tsx
  - components/app/persona-view.test.ts
  - components/app/persona-view.tsx
  - components/app/sandbox-view.tsx
  - components/app/source-intake.test.ts
  - components/app/source-intake.tsx
  - components/app/tool-steps.tsx
  - components/shell/app-shell.tsx
  - features/billing/pricing.test.ts
  - features/billing/pricing.ts
  - features/billing/service.test.ts
  - features/billing/service.ts
  - features/builder/interview-route.test.ts
  - features/builder/interview-test-fixture.ts
  - features/builder/interview.test.ts
  - features/builder/interview.ts
  - features/builder/persona-route.test.ts
  - features/builder/persona.test.ts
  - features/builder/persona.ts
  - features/builder/prompt-template.ts
  - features/knowledge/chunk.test.ts
  - features/knowledge/chunk.ts
  - features/knowledge/index.test.ts
  - features/knowledge/index.ts
  - features/knowledge/intake-route.test.ts
  - features/knowledge/intake.test.ts
  - features/knowledge/intake.ts
  - features/knowledge/legacy-search.ts
  - features/knowledge/parse-worker.ts
  - features/knowledge/parse.test.ts
  - features/knowledge/parse.ts
  - features/knowledge/search.test.ts
  - features/knowledge/search.ts
  - features/runtime/agent.test.ts
  - features/runtime/agent.ts
  - features/runtime/events.ts
  - features/runtime/legacy-agent.ts
  - features/runtime/policy.ts
  - features/runtime/sandbox-route.test.ts
  - features/runtime/sufficiency.ts
  - features/runtime/web.test.ts
  - features/runtime/web.ts
  - lib/api-client.test.ts
  - lib/api-client.ts
  - lib/config/credits.ts
  - lib/contracts/phase2.ts
  - lib/contracts/schemas.test.ts
  - lib/contracts/schemas.ts
  - lib/data/seed.ts
  - lib/demo-store.test.ts
  - lib/demo-store.ts
  - lib/format.ts
  - lib/llm/anthropic.ts
  - lib/llm/gateway.test.ts
  - lib/llm/gateway.ts
  - lib/llm/voyage.test.ts
  - lib/llm/voyage.ts
  - lib/server/db.ts
  - lib/server/db.types.ts
  - lib/server/demo.test.ts
  - lib/server/demo.ts
  - lib/server/env.test.ts
  - lib/server/env.ts
  - lib/server/repository.ts
  - lib/server/request.test.ts
  - lib/server/request.ts
  - lib/types.ts
  - package.json
  - scripts/check-phase2-env.ts
  - scripts/phase2-live.ts
  - scripts/reconcile-usage.ts
  - scripts/seed.ts
  - supabase/config.toml
  - supabase/migrations/20260927000100_phase2_core.sql
  - supabase/migrations/20260927000200_phase2_knowledge.sql
  - supabase/migrations/20260927000250_phase2_seed.sql
  - supabase/migrations/20260927000275_phase2_persona.sql
  - supabase/migrations/20260927000300_phase2_billing.sql
  - supabase/migrations/20260927000400_phase2_index.sql
  - supabase/migrations/20260927000500_phase2_intake.sql
  - supabase/migrations/20260927000600_phase2_interview.sql
  - tests/integration/billing.live.test.ts
  - tests/integration/builder-flow.test.ts
  - tests/integration/intake.live.test.ts
  - tests/integration/live-support.ts
  - tests/integration/retrieval.live.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings: 4
status: code_review_passed_live_gate_pending
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-27T04:01:42Z
**Depth:** standard
**Files Reviewed:** 119
**Status:** Code findings addressed by inspection; live database and provider gate pending.

## Narrative Findings (AI reviewer)

The original scoped review found three blockers. Fix re-review resolves CR-01 through CR-03 by code inspection. Commit `d0d8ee4` addresses CR-04 by code inspection. The latest reported offline run had 152 passing tests and five skipped live tests; lint, typecheck, and build also passed. SQL migrations and concurrent recovery have not been executed against PostgreSQL in this re-review.

## Fix Re-review

- **CR-01 — resolved by code inspection.** Both privilege statements now match the 17-argument declaration. Fresh database migration application remains unverified.
- **CR-02 — resolved by code inspection.** The transcript API and UI parse safe numeric money and exact decimal strings; unsafe values fail.
- **CR-03 — resolved by code inspection for the original stranded replay path.** Incomplete logs are recovered after an inactivity grace period by a serialized SQL transaction. Paid attempt transitions are fenced, and ambiguous holds remain pending. SQL execution and concurrent recovery remain unverified.
- **CR-04 — resolved by code inspection; live gate pending.** `settle_operation` now stores zero `actual_units` when a zero-attempt operation settles. Recovery and normal finalization read that known zero charge. The new live test asserts direct zero-attempt settlement and replay, but PostgreSQL execution and an end-to-end zero-attempt recovery case remain unverified.

## Critical Issues

### CR-01 [BLOCKER — RESOLVED]: Intake migration aborts at its function privilege statements

**File:** `supabase/migrations/20260927000500_phase2_intake.sql:242` (also line 247; declaration lines 59–65)

**Issue:** `reserve_source_quota` declares 17 arguments (12 `text` arguments before `p_byte_count bigint`), but both `REVOKE` and `GRANT` name an 18-argument signature (13 `text` arguments before `bigint`). PostgreSQL resolves function identity by its argument types; the `REVOKE` therefore targets a nonexistent function and aborts this explicit transaction. The intake tables/functions are not installed, and subsequent migration 00600 cannot provide a usable Phase 2 database.

**Fix:** Remove the extra `text` before `bigint` in both privilege statements, then apply the migrations to a fresh database as a gate. The intended signature is `public.reserve_source_quota(text,text,text,text,text,text,text,text,text,text,text,text,bigint,text,integer,bigint,text)`.

### CR-02 [BLOCKER — RESOLVED]: Settled sandbox charges display as pending after reload

**File:** `components/app/sandbox-view.tsx:32` (display at line 183; persisted column at `supabase/migrations/20260927000100_phase2_core.sql:144`)

**Issue:** `messages.charged_units` is a PostgreSQL `bigint`. The transcript endpoint selects the raw row, so ordinary PostgREST JSON values arrive in JavaScript as numbers. `parseMessage` accepts only strings and replaces every numeric charge with `null`. A sandbox answer can settle and show its charge in the live cost event, then display `Charge pending` after the page reloads. This misstates actual wallet usage to the expert.

**Fix:** Parse both decimal strings and safe nonnegative integers into a decimal string, rejecting unsafe numeric values. Use the same money parser at the transcript API boundary so large amounts cannot silently lose precision.

### CR-03 [BLOCKER — RESOLVED]: Partial answer replay permanently strands interrupted operations

**File:** `features/runtime/agent.ts:134` (terminal persistence at lines 181–191; caller at `app/api/agents/[agentId]/sandbox/route.ts:53`)

**Issue:** Reusing an idempotency key returns immediately whenever any event exists, even when there is no `done` event. If the server restarts after `operation-start` or a later event, or final persistence fails after settlement, every retry of that key replays the incomplete prefix and exits. No code resumes finalization or marks the operation terminal. The sandbox client polls while the operation remains nonterminal, so the expert can be stuck with a draft and a wallet hold indefinitely; if settlement happened but `finish` failed, the stored assistant row can remain blank.

**Fix:** Distinguish complete event logs from in-progress or abandoned ones. Replay a completed log only when `done` is durable; for an unfinished operation, expose its persisted pending/unknown status and a safe recovery path that finalizes known usage and message state without redispatching an ambiguous provider call. Persist a terminal failure event for unrecoverable work and release only holds proven unused.

### CR-04 [BLOCKER — RESOLVED BY CODE INSPECTION]: Zero-attempt settlements report pending usage

**File:** `supabase/migrations/20260927000300_phase2_billing.sql:270` (recovery at `supabase/migrations/20260927000650_phase2_answer_recovery.sql:79`; normal answer finalization at `features/runtime/agent.ts:199`)

**Issue:** An operation abandoned or failed after reservation but before any paid attempt has known zero usage. `settle_operation` releases its unallocated hold and sets `state='settled'`, but leaves `actual_units` SQL `NULL` because the attempt loop never ran. Recovery reads that null as `v_cost`, emits an `unknown_usage` error and a `pending` cost event, and stores a null charge although no hold remains. The normal answer finalizer likewise reports a pending charge for a settled zero-attempt failure. Reproduce with an operation containing an assistant message and `operation-start` event but no provider attempts, wait beyond the recovery grace, then invoke `recover_answer_operation`.

**Fix:** When `settle_operation` transitions to `settled`, set `actual_units=coalesce(actual_units,0)` in the same transaction. Make recovered and normal cost events report a settled zero charge; reserve `pending` for unresolved usage. Assert this with a database-backed zero-attempt recovery test at the live gate.

---

_Reviewed: 2026-09-27T04:01:42Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
