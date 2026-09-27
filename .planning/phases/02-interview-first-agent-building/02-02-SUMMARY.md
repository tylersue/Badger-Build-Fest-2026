---
phase: 02-interview-first-agent-building
plan: "02"
subsystem: database
tags: [supabase, postgres, pgvector, service-role, request-validation]
requires:
  - phase: 02-01
    provides: Frozen Phase 2 contracts and lazy environment validation
provides:
  - Durable text-ID core and knowledge schema with revision ownership constraints
  - Server-only service-role client and typed repository adapter
  - Bounded same-origin demo request and ownership boundary
affects: [interview, persona, knowledge, billing, runtime, api, phase-02-18]
tech-stack:
  added: []
  patterns: [append-only revisions, composite agent foreign keys, compare-and-swap activation, server-only lazy client]
key-files:
  created: [supabase/config.toml, supabase/migrations/20260927000100_phase2_core.sql, supabase/migrations/20260927000200_phase2_knowledge.sql, lib/server/db.types.ts, lib/server/db.ts, lib/server/repository.ts, lib/server/request.ts, lib/server/request.test.ts]
  modified: []
key-decisions:
  - "Preserve all nine seeded identity text IDs; only Maria and Sam are switchable demo identities."
  - "Keep current saved revisions separate from indexed or active revisions, with compare-and-swap activation."
  - "Reject unsafe database BIGINT JSON numbers before exposing money as decimal strings."
patterns-established:
  - "Agent-scoped repository reads and revision activation require agent ID and expected version."
  - "Mutation handlers validate exact origin and bounded JSON/form payloads before service calls."
requirements-completed: [INTV-02, PERS-01, DOCS-02, RETR-03, CRED-02]
duration: 18min
completed: 2026-09-27
---

# Phase 2 Plan 02: Durable schema and request boundary Summary

**PostgreSQL tables preserve agent state and immutable knowledge revisions, while server-only adapters scope reads and reject forged demo requests.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-27T01:17:00Z (approximate session start)
- **Completed:** 2026-09-27T01:35:43Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- Created core identity, agent, persona, interview, message, operation, attempt, wallet, ledger, and daily budget tables using text IDs and BIGINT money.
- Created answer and source revisions, 1024-dimensional chunks, index jobs, quota holds, intake estimates, composite agent/revision keys, tombstone guards, and a private source bucket. Anonymous, public, and authenticated database grants are revoked.
- Added a lazy service-role client, typed read-model repository, version-checked activation methods, seeded identity selector, server owner check, and strict request parser.

## Task Commits

1. **Task 1: Durable schema and revision ownership** — `07b44c1`
2. **Task 2: Server database and request adapters** — `6ef6f54`

## Verification

- `next typegen` and `tsc --noEmit`: passed.
- `vitest run lib/server/request.test.ts`: 5 tests passed; covers forged owner and identity, origin, content type, body limits, unknown/duplicate fields, and error redaction.
- `eslint` on all new TypeScript files: passed.
- `supabase status`: cannot connect to Docker daemon. Migration application, SQL behavior, and live service acceptance remain mandatory in plan 02-18. No live evidence is claimed here.
- `pnpm` wrapper attempted to reinstall the independently cloned `node_modules` and aborted without a TTY; equivalent installed binaries were used for all checks above.

## Decisions Made

- Seeded every existing identity ID so archived agent owners remain representable, while the browser selector permits only `maria` and `sam`.
- Kept answer/source revisions immutable and separated current versus searchable pointers so failed indexing does not replace prior evidence.
- Kept SQL transaction RPCs reserved for the later billing, interview, and knowledge plans as specified in the frozen contract.

## Deviations from Plan

None — plan executed within its assigned files and contract. No shared contract edits were needed.

## Issues Encountered

- Local Docker is unavailable, so SQL migrations could not be applied or exercised in this worktree. Plan 02-18 owns live migration and integration acceptance.
- The `pnpm` wrapper attempted a dependency reinstall; direct installed tool binaries provided equivalent offline verification.

## Known Stubs

None in runtime paths. Empty arrays and records in request parsing are temporary accumulators; the cached database client starts null until configured and first used.

## Next Phase Readiness

Downstream plans can use `getServiceDb`/`requireServiceDb`, `createRepository`, `resolveDemoIdentity`, `requireAgentOwner`, `parseRequest`, `demoIdentityResponse`, and `apiError`. The identity cookie is `bx-demo-identity`. SQL RPC implementations and live migration proof remain assigned to later plans.

## Self-Check: PASSED

All eight created files exist; task commits `07b44c1` and `6ef6f54` are present; no tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
