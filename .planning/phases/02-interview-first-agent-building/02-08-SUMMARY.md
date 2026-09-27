---
phase: 02-interview-first-agent-building
plan: "08"
subsystem: persona
tags: [persona, provenance, compare-and-swap, prompts, api, postgres]
requires:
  - phase: 02-02
    provides: Versioned persona fields, agent categories, answer revisions, and same-origin owner guards
provides:
  - Evidence-scoped persona suggestion merges and expert field ownership
  - Generated and custom prompt modes with explicit regeneration
  - Owner-guarded persona GET/PATCH route and atomic category field RPC
affects: [interview, builder-ui, runtime, phase-02-18]
tech-stack:
  added: []
  patterns: [per-field compare-and-swap, explicit custom prompt mode, transactional category mirror]
key-files:
  created: [features/builder/persona.ts, features/builder/persona.test.ts, features/builder/persona-route.test.ts, app/api/agents/[agentId]/persona/route.ts, supabase/migrations/20260927000275_phase2_persona.sql]
  modified: [features/builder/prompt-template.ts, lib/server/db.types.ts]
key-decisions:
  - "Use one restricted SQL function to commit the versioned category field and runtime category together."
  - "Return current server state and submitted patch on conflicts so the browser can preserve unsaved typing."
  - "Keep generated prompt text persona-only; the runtime layer owns immutable safety and citations."
patterns-established:
  - "Interview patches cite active current answer revisions for the same agent before applying."
  - "Expert fields queue suggestions until explicit accept or keep; custom prompts change only by explicit action."
requirements-completed: [PERS-01, PERS-02, PERS-03, INTV-05]
duration: 9min
completed: 2026-09-27
---

# Phase 2 Plan 08: Persona ownership and prompt modes Summary

**Evidence-linked persona fields preserve expert edits, while generated prompts stay separate from platform safety and category writes stay atomic.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-27T01:39:08Z
- **Completed:** 2026-09-27T01:47:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Suggestions cite active current answer revisions on the same agent, update untouched fields at their observed version, and queue beside expert-owned text. Save conflicts return the server state and submitted values.
- Answer revision reconciliation clears unsupported interview copy, preserves expert copy, and exposes fields whose prior evidence became inactive for review.
- The persona API validates owner, origin, lengths, list counts, field and prompt versions, and explicit regeneration. It exposes a generated preview and server-selected model metadata.
- Generated prompt text contains only configured persona claims. Custom text remains active after form changes; the runtime policy remains outside the editable prompt.
- Category edits use a restricted SQL compare-and-swap function to update `persona_fields` and `agents.category` in one transaction.

## Task Commits

1. **Task 1: Evidence-linked field merges and prompt modes** — `a75cafd`
2. **Task 2: Persona API and atomic category writes** — `ea38866`

## Verification

- `vitest run`: 43 tests passed across 9 files, including 13 persona service and route cases.
- `next typegen`, `tsc --noEmit`, and ESLint on changed TypeScript files: passed.
- SQL migration was reviewed statically; live application and RPC acceptance remain assigned to plan 02-18.

## Decisions Made

- A transactional RPC is necessary because runtime category/model selection reads `agents.category`, while field ownership is stored in `persona_fields`.
- The browser receives conflict field IDs, current server state, and its submitted patch; it can resolve a collision without losing text.
- Generated persona text omits grounding, disclaimer, fallback, and invented credentials; runtime policy is assembled separately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Made category metadata transactional**
- **Found during:** Task 2
- **Issue:** Independent PostgREST writes could leave the versioned persona category different from the category used for model and regulated-policy selection.
- **Fix:** Added a service-role-only compare-and-swap SQL function that updates both rows in one transaction, plus its typed database signature.
- **Files modified:** `supabase/migrations/20260927000275_phase2_persona.sql`, `lib/server/db.types.ts`, `features/builder/persona.ts`
- **Verification:** Category alignment test, TypeScript, ESLint; live SQL acceptance remains for plan 02-18.
- **Committed in:** `ea38866`

**Total deviations:** 1 auto-fixed (Rule 2). The addition is necessary for category correctness under concurrent edits.

## Issues Encountered

- The separate interview plan must call `reconcilePersonaEvidence(agentId)` after answer edits/deletes; this integration seam was sent to the orchestrator. Until it is wired, the reconciliation behavior exists but is not triggered by those mutations.
- The local offline test suite cannot prove SQL migration execution. Plan 02-18 owns live migration and RPC acceptance.

## Known Stubs

None. Empty arrays and objects in the service accumulate fields/conflicts; empty prompt output represents a genuinely blank persona.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: service-role-rpc | `supabase/migrations/20260927000275_phase2_persona.sql` | New server-only mutation function; grants are revoked from public, anon, and authenticated roles. |

## Next Phase Readiness

The interview lane can call `applyPersonaSuggestions` and `reconcilePersonaEvidence`. Builder UI can consume full persona views and conflict payloads. Runtime must prepend immutable policy when using generated or custom persona text. Plan 02-18 must apply and test the new SQL function against a live database.

## Self-Check: PASSED

All five created files exist; task commits `a75cafd` and `ea38866` are present; no tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
