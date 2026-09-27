---
phase: 02-interview-first-agent-building
plan: "14"
subsystem: knowledge-ui
tags: [source-intake, knowledge, interview-answers, source-lifecycle, wallet]
requires:
  - phase: 02-interview-first-agent-building
    provides: hash-bound source intake and owned interview/source APIs from plans 10 and 12
provides:
  - explicit upload and paste estimate confirmation retaining original payload
  - separate interview-answer and document sections with real status and limits
  - confirmed source retry, resume, and acknowledged deletion controls
affects: [builder-integration, phase-2-live-acceptance]
tech-stack:
  added: []
  patterns: [ephemeral File retention, server-estimate confirmation, owned source overview reads]
key-files:
  created:
    - components/app/source-intake.tsx
    - components/app/source-intake.test.ts
    - components/app/knowledge-view.tsx
  modified: []
key-decisions:
  - "A source estimate and request key stay in component memory; reload restores only paste text and name, requiring fresh preflight."
  - "Knowledge reads the owned source overview for exact status, counts, errors and remaining quotas."
  - "The builder can mount AnswerEditor through renderAnswerActions(answer, onChange) in plan 16."
patterns-established:
  - "Retain source rows and input on failed mutations; remove a document only after deletion acknowledgment."
requirements-completed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04, INTV-04]
duration: 8min
completed: 2026-09-27
---

# Phase 2 Plan 14: Knowledge Intake and Lifecycle Summary

**Experts can review source limits and approximate credit cost before processing a retained file or paste, then inspect real interview answers and document processing states on the Knowledge page.**

## Performance

- **Started:** 2026-09-27T03:11:03Z
- **Completed:** 2026-09-27T03:19:21Z
- **Duration:** About 8 minutes
- **Tasks:** 2 of 2
- **Files changed:** 3

## Accomplishments

- The intake sheet accepts PDF, DOCX, TXT, MD and pasted text. It shows server remaining files, bytes and chunks, known projected use, nullable page/chunk projections, approximate credits, maximum wallet hold, available credits and held credits. Processing requires an explicit confirmation with the original File or text, estimate token and stable request key. Edits, expiry and stale server estimates require a fresh preflight and confirmation.
- Paste drafts survive reload without restoring an estimate; a file lost on reload must be reselected. Quota, type, size and credit failures keep the input available. Credit refusal opens the existing mock funding flow for explicit retry.
- Knowledge loads owned interview answers and a separate source overview. Answers show question, text, linked details and current/indexed status. Documents show kind, queued/processing/ready/failed state, page and chunk counts, processing progress and charged/pending units. Source overview supplies remaining quotas. Failed sources use stored blob retry after a fresh estimate; pending sources can resume. Deletion keeps the row until server acknowledgment and retains it with an error on failure.

## Task Commits

1. **Task 1: Upload and paste confirmation sheet** — `0d5b445`
2. **Task 2: Knowledge sections and source lifecycle** — `3d9870d`

## Verification

- Full offline Vitest suite: **123 passed, 1 skipped** across 26 files. The skipped test requires a live disposable Supabase instance.
- Focused intake, API transport and source route tests: **11 passed**. New state tests prove byte retention, edit and expiry invalidation, paste preservation, and inability to confirm a file after reload without its bytes.
- Installed Next type generation, TypeScript `tsc --noEmit`, targeted ESLint and `git diff --check`: **passed**.
- Real SQL, Storage and provider settlement still require plan 02-18 live acceptance.

## Decisions Made

- The optional `renderAnswerActions(answer, onChange)` prop lets plan 16 mount plan 13's `AnswerEditor` without importing a file unavailable during this wave. Its `answer` is exactly `InterviewView["answers"][number]`; `onChange` reloads Knowledge after an acknowledged edit.
- Retry uses a fresh server estimate and its own explicit confirmation. Unknown transport outcomes retain the request key for a deliberate retry; stale or insufficient-credit estimates clear the review and require preflight again.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prevented duplicate snapshot refresh and editing during confirmation.**
- **Found during:** Task 2 integration
- **Issue:** SourceIntake and the Knowledge caller could both refresh the shared snapshot after confirmation, causing one refresh to be rejected by the bridge generation guard. Inputs also remained editable while a request was in flight.
- **Fix:** A provided `onComplete` owns refresh; standalone intake refreshes itself. Disabled input changes while preflight or confirmation is pending.
- **Files modified:** `components/app/source-intake.tsx`
- **Verification:** Full suite, typecheck and lint.
- **Committed in:** `3d9870d`

## Known Stubs

- `components/app/knowledge-view.tsx` defaults to an `Edit answer in interview` link when no editor slot is supplied. Plan 16 mounts plan 13's `AnswerEditor` through `renderAnswerActions`; this keeps this independent wave compilable.

## Next Phase Readiness

- Plan 16 should mount `KnowledgeView({ agent, isOwner, renderAnswerActions: (answer, onChange) => <AnswerEditor agentId={agent.id} answer={answer} isOwner={isOwner} onChange={onChange} /> })` on the builder Knowledge route.
- `SourceIntake` exports `({ agentId, open, onOpenChange, onComplete? })` and refreshes itself only when no `onComplete` callback is passed.
- Plan 02-18 must verify live Storage, SQL quotas, indexing and wallet settlement. This plan added no packages, network endpoints, auth paths, file access or schema changes.

## Self-Check: PASSED

All three created implementation/test files and this summary exist; task commits `0d5b445` and `3d9870d` resolve. No tracked files were deleted.

---
*Phase: 02-interview-first-agent-building*
*Completed: 2026-09-27*
