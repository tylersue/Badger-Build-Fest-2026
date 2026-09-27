---
phase: 02-interview-first-agent-building
reviewed: 2026-09-27T04:01:42Z
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
  critical: 3
  warning: 0
  info: 0
  total: 3
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-27T04:01:42Z
**Depth:** standard
**Files Reviewed:** 119
**Status:** issues_found

## Narrative Findings (AI reviewer)

The scoped Phase 2 source, migrations, routes, UI, and tests were screened; the review traced intake SQL privileges, sandbox persistence and billing display, and answer replay across their callers. The findings below are concrete failures in those paths. The live credential-dependent acceptance gate remains pending separately and is not counted as a code finding.

## Critical Issues

### CR-01 [BLOCKER]: Intake migration aborts at its function privilege statements

**File:** `supabase/migrations/20260927000500_phase2_intake.sql:242` (also line 247; declaration lines 59–65)

**Issue:** `reserve_source_quota` declares 17 arguments (12 `text` arguments before `p_byte_count bigint`), but both `REVOKE` and `GRANT` name an 18-argument signature (13 `text` arguments before `bigint`). PostgreSQL resolves function identity by its argument types; the `REVOKE` therefore targets a nonexistent function and aborts this explicit transaction. The intake tables/functions are not installed, and subsequent migration 00600 cannot provide a usable Phase 2 database.

**Fix:** Remove the extra `text` before `bigint` in both privilege statements, then apply the migrations to a fresh database as a gate. The intended signature is `public.reserve_source_quota(text,text,text,text,text,text,text,text,text,text,text,text,bigint,text,integer,bigint,text)`.

### CR-02 [BLOCKER]: Settled sandbox charges display as pending after reload

**File:** `components/app/sandbox-view.tsx:32` (display at line 183; persisted column at `supabase/migrations/20260927000100_phase2_core.sql:144`)

**Issue:** `messages.charged_units` is a PostgreSQL `bigint`. The transcript endpoint selects the raw row, so ordinary PostgREST JSON values arrive in JavaScript as numbers. `parseMessage` accepts only strings and replaces every numeric charge with `null`. A sandbox answer can settle and show its charge in the live cost event, then display `Charge pending` after the page reloads. This misstates actual wallet usage to the expert.

**Fix:** Parse both decimal strings and safe nonnegative integers into a decimal string, rejecting unsafe numeric values. Use the same money parser at the transcript API boundary so large amounts cannot silently lose precision.

### CR-03 [BLOCKER]: Partial answer replay permanently strands interrupted operations

**File:** `features/runtime/agent.ts:134` (terminal persistence at lines 181–191; caller at `app/api/agents/[agentId]/sandbox/route.ts:53`)

**Issue:** Reusing an idempotency key returns immediately whenever any event exists, even when there is no `done` event. If the server restarts after `operation-start` or a later event, or final persistence fails after settlement, every retry of that key replays the incomplete prefix and exits. No code resumes finalization or marks the operation terminal. The sandbox client polls while the operation remains nonterminal, so the expert can be stuck with a draft and a wallet hold indefinitely; if settlement happened but `finish` failed, the stored assistant row can remain blank.

**Fix:** Distinguish complete event logs from in-progress or abandoned ones. Replay a completed log only when `done` is durable; for an unfinished operation, expose its persisted pending/unknown status and a safe recovery path that finalizes known usage and message state without redispatching an ambiguous provider call. Persist a terminal failure event for unrecoverable work and release only holds proven unused.

---

_Reviewed: 2026-09-27T04:01:42Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

