---
phase: 02-interview-first-agent-building
plan: "06"
subsystem: knowledge
tags: [pdfjs-dist, mammoth, parsing, chunking]
requires:
  - phase: 02-01
    provides: frozen Phase 2 source and segment contracts
provides:
  - bounded PDF, DOCX, TXT, Markdown, and pasted-text extraction
  - page, heading, question, and source-aware chunking
affects: [knowledge-intake, indexing, retrieval]
tech-stack:
  added: []
  patterns: [terminable parser worker, ZIP directory validation, coordinate-preserving chunks]
key-files:
  created: [features/knowledge/parse.ts, features/knowledge/parse-worker.ts, features/knowledge/parse.test.ts, features/knowledge/chunk.ts, features/knowledge/chunk.test.ts]
  modified: []
key-decisions:
  - "Parser hard ceilings cap even looser server configuration at 5 MiB input, 100 pages, 100,000 extracted characters, 20 MiB inflated DOCX data, 128 MiB worker heap, and 15 seconds."
  - "Chunking returns every bounded chunk with an ordinal; intake must compare the returned count with the agent's active-chunk quota before indexing."
patterns-established:
  - "Document extraction returns plain text only and preserves source coordinates before indexing."
requirements-completed: [DOCS-01, DOCS-03, DOCS-04]
duration: approximately 8 min of continuation work
completed: 2026-09-27
---

# Phase 2 Plan 06: Bounded Source Parsing and Chunking Summary

PDF, DOCX, UTF-8 text, Markdown, and pasted text now produce bounded plain-text segments in a terminable worker; paragraph chunks retain their page, heading, interview question, and optional source identifiers.

## Performance

- **Duration:** Approximately 8 minutes after resuming partial parser files
- **Completed:** 2026-09-27T01:30:13Z
- **Tasks:** 2 of 2
- **Files created:** 5

## Accomplishments

- Added signature, MIME, Unicode, size, page, ZIP expansion, worker heap, output, and timeout checks. PDF pages and DOCX headings come from parsed document structure; malformed, encrypted, image-only, binary, empty, and oversized sources fail with a paste-text alternative.
- Added generated binary PDF and DOCX fixtures plus negative cases, including encrypted PDF, ZIP expansion, invalid UTF-8, and image-only PDF.
- Added configurable 2,000-character target and 200-character paragraph overlap, with exact coordinate boundaries, long-paragraph splitting, and a full returned chunk count for caller quota checks.

## Task Commits

1. **Task 1: Bounded text extraction adapters** — `5a01a66`
2. **Task 2: Coordinate-preserving chunking** — `33d8ec7`

## Verification

- Full installed Vitest suite: 6 files, 25 tests passed.
- Installed Next type generation and `tsc --noEmit`: passed.
- ESLint on all five plan files: passed.
- `pnpm test` wrapper attempted a noninteractive module reinstall and aborted; direct installed executables supplied the equivalent checks without changing dependencies.

## Decisions Made

- Keep interview question and source/answer IDs as optional extensions of the frozen `TextSegment` shape in `ChunkSegment`; no shared-contract edit is required.
- Return all chunks, including chunks above an agent's remaining quota. The intake/index caller owns the atomic quota check and must reject excess before paid embedding.

## Deviations from Plan

None — plan executed as written. No new packages, routes, trust boundaries, or external service configuration were added.

## Known Stubs

None.

## Issues Encountered

The workspace's `pnpm` bootstrap wanted to purge and reinstall modules in a noninteractive shell. The installed `vitest`, `next`, `tsc`, and `eslint` binaries ran successfully.

## Next Phase Readiness

Knowledge intake can call `parseSource` and `chunkSegments`, then compare the complete chunk count with the agent quota before embedding. Live provider and database acceptance remains assigned to plan 02-18.

## Self-Check: PASSED

All five created files exist, both task commits are present, and all task and plan verification checks passed.
