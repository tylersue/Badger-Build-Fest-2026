---
phase: 02-interview-first-agent-building
plan: "01"
subsystem: infra
tags: [contracts, zod, money, evidence, environment]
requires:
  - phase: 01-shell-wallet-shared-contracts
    provides: Existing display types, fixture records and runtime imports
provides:
  - Versioned money, operation, revision, evidence, service and stream contracts
  - Strict API/model boundary schemas and fixture provenance
  - Exact audited dependencies and lazy server-only configuration
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12]
tech-stack:
  added: [ai@7.0.116, "@ai-sdk/anthropic@4.0.65", "@supabase/supabase-js@2.117.2", zod@4.6.5, pdfjs-dist@6.3.289, mammoth@1.13.0]
  patterns: [Strict untrusted boundary schemas, lazy ServiceResult configuration, decimal JSON money and bigint service inputs]
key-files:
  created: [lib/contracts/phase2.ts, lib/contracts/schemas.ts, lib/contracts/schemas.test.ts, features/runtime/events.ts, lib/server/env.ts, lib/server/env.test.ts]
  modified: [lib/types.ts, lib/data/seed.ts, features/runtime/agent.ts, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, .env.example]
key-decisions:
  - MoneyAmount is a canonical nonnegative decimal string validated against SQL bigint bounds; financial service inputs use bigint.
  - Legacy display types allow optional origin during migration; every seed record is explicitly fixture and new service records require origin.
  - Models return issued evidence IDs; only server-created evidence snapshots carry provenance or URLs.
  - Configuration uses server-only SUPABASE_URL, per-service lazy getters, standard published price policy and names-only errors.
  - Existing runtime ChatStreamEvent import path re-exports the sequenced shared event contract.
patterns-established:
  - Browser request schemas reject unknown owner/model/pricing fields and require observed versions for persona edits.
  - Missing credentials return configuration failures without module-load validation or test adapter fallback.
requirements-completed: [CRED-02, CRED-03, INTV-02, PERS-02, SBOX-02]
duration: 18min
completed: 2026-09-27
---

# Phase 2 Plan 01: Shared Contracts and Configuration Summary

**Revision-safe shared types, strict API/model schemas, exact decimal money, and lazy server configuration backed by six pinned audited packages.**

## Performance

- Tasks: 2/2
- Files created/modified: 13
- Duration: approximately 18 minutes
- Isolation: `/private/tmp/badger-phase2-01`, `worktree-agent-phase2-01`, base `3f25d6ca947cf28c45aea343ab61e34790d75a87`

## Accomplishments

- Exported money, operations/attempts, revision/index state, persona ownership, source estimates, immutable citation snapshots, tool steps, service signatures, and ordered stream events.
- Added strict request/model boundaries that reject client authority/cost injection, fabricated model provenance, invalid URLs and stale unversioned persona edits.
- Added lazy database, Anthropic, Voyage and policy getters with typed configuration failures. Documented names and defaults without credentials.
- Preserved the existing display fixture pages and runtime import path; seed history is explicitly labeled fixture.

## Task Commits

1. **Task 1: Freeze domain and transport contracts** — `1bec307` (feat)
2. **Task 2: Install researched packages and configuration contracts** — `442f363` (feat)

## Verification

- `pnpm test`: 4 files, 19 tests passed, including six boundary and five environment tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed, Next 16.3.6 production build and all page generation.
- Names-only configuration audit confirmed no required provider/database variables and no local environment files in this worktree during verification.
- Installed declarations and runtime exports confirmed `generateText`, `streamText`, `Output.object`, `createAnthropic`, `webSearch_20250305`, and `webFetch_20260318`.
- Installed Next environment/server-boundary documentation read before implementation. Context7 was unavailable; Zod's official API/basic documentation and installed declarations were used.
- No live provider/database calls were made. Live acceptance remains plan 02-18.

## Decisions Made

The contract exports are additive to legacy display types. `KnowledgeChunk` is the revisioned/vector-bearing live contract; existing `Chunk` remains a display bridge. Existing lexical/canned retrieval remains owned by plan 02-07. All new streams use mandatory operation/event IDs and sequence; `done` makes no settlement claim.

`getDatabaseEnv`, `getAnthropicEnv`, `getVoyageEnv`, `getPolicyEnv`, and `getServerEnv` return `ServiceResult`. Services can validate only their own required credentials. Domain policy permits an allow list or block list, and parser/provider budgets reject invalid or unsafe ranges. Pricing policy is standard only until a verified discount implementation exists.

## Deviations from Plan

- **[Rule 2 — Missing critical provenance/compatibility]** Modified `lib/data/seed.ts` to label every seed record fixture and `features/runtime/agent.ts` to re-export the new event type. These small additions outside the task file list are required by its fixture-label and compatibility acceptance criteria. Verified by tests and typecheck; commit `1bec307`.
- **[Rule 3 — Dependency ordering]** Installed Task 2's exact audited dependencies before Task 1 verification because its Zod schemas require Zod. Dependency/config changes remain in the separate Task 2 commit.
- **[Rule 3 — Package-manager configuration]** pnpm added the exact `mammoth@1.13.0` minimum-release-age exception to `pnpm-workspace.yaml`. This is the researched approved version; no version substitution occurred. Included in `442f363` for reproducible installation.

## Issues Encountered

- Corepack initially needed cache access outside the sandbox; the approved elevated install succeeded. Later checks used the same dependency environment. No package legitimacy failure occurred.
- A boundary test found that Zod refinement still ran after a decimal regex failure; guarded bigint conversion now returns validation failure for malformed money instead of throwing. Unsafe URL refinements also guard URL parsing. Reverified all tests.
- pnpm reported existing peer/deprecation warnings; they did not fail verification and unrelated dependency upgrades are outside this plan.

## Known Stubs

- `features/runtime/agent.ts:3` still documents the pre-existing canned Phase 1 answer/interview implementation. This plan only changes its type re-export; plans 02-09 and 02-11 replace the behavior.
- Fixture records in `lib/data/seed.ts` remain intentional presentation history and are now tagged `origin: fixture`; plan 02-04 owns server import and plan 02-07 excludes them from live evidence.
- No new unimplemented runtime/provider behavior was introduced; service function types are contracts for dependent plans.

## User Setup Required

Real database/provider execution requires the names documented in `.env.example`; missing configuration does not block offline builds. Live credentials and entitlement validation remain plan 02-18.

## Next Phase Readiness

Dependent lanes can import the shared types/schemas and lazy env getters. No contract-level blocker remains. STATE, ROADMAP, REQUIREMENTS and config are intentionally untouched under the orchestrator's single-writer protocol.

## Self-Check: PASSED

All six created source/test files exist. Both task commits exist, contain no tracked deletions, and verification passes. No new endpoint, provider execution or secret-bearing client surface was introduced.
