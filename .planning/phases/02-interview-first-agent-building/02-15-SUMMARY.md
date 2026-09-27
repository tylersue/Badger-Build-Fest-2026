---
phase: 02-interview-first-agent-building
plan: "15"
subsystem: sandbox-ui
tags: [chat, evidence, retrieval, web-steps, streaming, accessibility, recovery]
requires:
  - phase: 02-11
    provides: Durable grounded answer events, citation snapshots and web steps
  - phase: 02-12
    provides: Typed NDJSON client, owned transcript/replay routes and saved drafts
provides:
  - Accessible expert and online evidence disclosures with retrieved excerpts and relevance scores
  - Replay-safe tool-step state and a real streamed sandbox view
  - Retained composer drafts and explicit pending, estimated and settled cost labels
affects: [02-16-shell, 02-18-live-acceptance]
tech-stack:
  added: []
  patterns: [sequence-and-event-ID reducer, native evidence disclosures, server-authoritative sandbox transcript]
key-files:
  created: [components/app/chat-state.ts, components/app/chat-state.test.ts, components/app/tool-steps.tsx, components/app/sandbox-view.tsx]
  modified: [components/app/chat.tsx]
key-decisions:
  - "SandboxView owns its BuilderSplit and accepts {agent,isOwner}, so the shell can replace the complete legacy Test section."
  - "The browser retains the original request key on refusal or transport failure and polls a known operation before allowing another send."
  - "Stored charged_units or a settled cost event alone can be labeled Charged; missing cost remains pending."
patterns-established:
  - "Live and replayed events reduce through one bounded state machine keyed by operation, sequence and event ID."
requirements-completed: [SBOX-01, SBOX-02, RETR-02, CRED-03, CRED-05]
duration: 10min
completed: 2026-09-27
---

# Phase 2 Plan 15: Streaming Sandbox Evidence Summary

**Sandbox answers now show live and replayed web steps, inspectable expert and online citations, retrieved excerpts, and honest charge states while preserving interrupted drafts.**

## Performance

- **Started:** 2026-09-27T03:10:00Z
- **Completed:** 2026-09-27T03:20:00Z
- **Duration:** About 10 minutes
- **Tasks:** 2 of 2
- **Files created/modified:** 5

## Accomplishments

- `AssistantMessage` accepts both legacy citations and immutable `EvidenceCitation` snapshots. Citation details use native click/keyboard disclosures, distinguish interview, document and online provenance, show deleted-source history, and validate external HTTP(S) links. `RetrievedSources` starts collapsed and includes full excerpts, question/page/heading, relevance score and an explicit zero-source message.
- `ToolSteps` displays ordered search and page-read rows as events arrive, updating running rows by stable ID and retaining failed rows. The reducer handles duplicate/replayed events, partial text and final cost without resetting progress.
- `SandboxView({ agent, isOwner })` loads the owner-scoped stored transcript, streams NDJSON through the shared client, overlays live evidence, and replays known interrupted operations. It keeps per-agent drafts and request keys on refusal or transport failure, checks operation status before another send, provides mock funding for insufficient credits, shows UTC daily-cap reset text, and preserves reader scroll with a Jump to latest control.

## Task Commits

1. **Task 1: Extend shared chat evidence and composer states** — `998b713`
2. **Task 2: Create sandbox stream view with cost and recovery** — `a9d8fc1`
3. **Task 2 correction: Mark deleted historical sources** — `7f48947`

## Verification

- Focused reducer, API-client and demo-store tests: **13 passed**.
- Installed Next type generation, TypeScript `tsc --noEmit`, targeted ESLint and `git diff --check`: **passed**.
- Reducer tests cover start-before-result updates, duplicate and partial-error replay, draft retention on refusal, and exact expert versus web grouping. No live provider or SQL service was available in this UI worktree; plan 02-18 owns end-to-end acceptance.

## Decisions Made

- `SandboxView` includes `BuilderSplit` and its own composer, so plan 02-16 can replace the existing Test section directly with `<SandboxView agent={agent} isOwner={isOwner} />`.
- The client uses stored `tool_steps`, `retrieved` and immutable `citations` on reload. Replay augments an interrupted operation without inventing a result or charge.
- A missing `charged_units` value reads **Charge pending**. An operation estimate reads **Estimated** until a settled cost event or persisted charge exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prevented the composer from clearing a newer draft after an earlier send finishes.**
- **Found during:** Task 2 integration.
- **Issue:** An acknowledgement could clear text entered while a request was pending.
- **Fix:** Compare the current text at completion and clear only the acknowledged draft; catch send errors and keep the draft visible.
- **Files modified:** `components/app/chat.tsx`
- **Verification:** Focused tests, typecheck and targeted lint.
- **Committed in:** `a9d8fc1`

**2. [Rule 1 - Bug] Labeled sources deleted after a citation was saved.**
- **Found during:** Task 2 post-commit review.
- **Issue:** The immutable citation snapshot can say `historical: false` even after its source is deleted later.
- **Fix:** Compare its source ID with current active document or answer IDs for display, while leaving the saved snapshot untouched.
- **Files modified:** `components/app/sandbox-view.tsx`, `components/app/chat-state.ts`, `components/app/chat-state.test.ts`
- **Verification:** Active/deleted-source assertions, focused tests, typecheck and targeted lint.
- **Committed in:** `7f48947`

## Known Stubs

- The existing Phase 1 `attach` prop in `Composer` still displays upload wording without a file action. It is outside the sandbox path and is retained for legacy callers; plan 02-16 replaces the remaining legacy builder surface.

## Issues Encountered

- `pnpm test` attempted a module-directory purge in the linked worktree and stopped for lack of TTY. The already installed `node_modules/.bin` executables ran the planned checks without package churn.
- The worktree Git index is under the protected main checkout `.git`; task commits required narrow escalation.

## Next Phase Readiness

- Plan 02-16 can mount the exported view without changing its props. Plan 02-18 must verify the persisted transcript, provider web events and actual cost settlement against live services.

## Self-Check: PASSED

All five implementation files and this summary exist; all three task/correction commits resolve. No tracked files were deleted. Focused tests, typecheck, targeted lint and whitespace checks passed.
