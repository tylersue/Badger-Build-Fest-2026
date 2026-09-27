# Phase 2: Interview-First Agent Building - Discussion Log

> Audit trail only. Planning decisions are in `02-CONTEXT.md`.

**Date:** 2026-09-26  
**Areas:** Interview, Persona, Knowledge and testing

## Interview

| Question | Alternatives considered | Chosen |
|---|---|---|
| Explore after opening | One thread deeply; breadth first; expert picks topics | One thread deeply |
| Handle vague answers | Probe until concrete with skip; ask once; expert chooses | Probe until concrete, allow skip |
| Revisit an answer | Edit or add linked detail; edit only; resume thread | Edit or add linked detail at any time |
| Suggest next step | Suggest on substance; wait for expert; fixed question count | Suggest after examples and working principles; expert may continue |

## Persona

| Question | Alternatives considered | Chosen |
|---|---|---|
| First draft | During interview; readiness point; on request | During interview; unsupported fields blank |
| Later answers | Update untouched fields; approve every change; draft once | Update untouched fields, preserve expert edits, suggest changes to edited fields |
| Draft voice | Polished but faithful; near-verbatim; promotional | Concise and faithful, with no invented claims |
| Form edits after custom prompt | Keep custom prompt; merge; regenerate | Keep custom prompt until explicit regeneration; fixed safety rules remain |

## Knowledge and testing

| Question | Alternatives considered | Chosen |
|---|---|---|
| Knowledge layout | Separate sections; combined list; interview as main view | Separate answer and document sections on one page |
| Before source processing | Estimate cost and limits; process immediately; limits only | Show limits and estimated credits, then confirm |
| Retrieval evidence | Collapsed full evidence; always visible; compact metadata first | Collapsed excerpts, source details, and scores |
| Insufficient expert evidence | Refuse with diagnostic; refuse only; builder-specific reply; user-directed web fallback | Search online, cite the answer, note the expert-knowledge gap, show tool calls |
| Save online findings | Never; after expert approval; automatically | Never; cite as external for that answer only |
| Show tool calls | Expandable steps; always expanded; summary chip | Expandable live search/page-read steps with query, title, and link |
| Mix partial expert and web evidence | Cite both separately; web only; expert only | Cite both separately and identify the missing expert coverage |

**Scope note:** The online fallback was initially identified as outside the earlier roadmap. The user explicitly repeated the request and chose to include it in both sandbox and hirer chat. That later instruction supersedes the earlier refusal and no-web-access assumption. The user also requested concise Markdown artifacts.

## Planner's Discretion

Interview readiness heuristic, source limits, cost estimate method, and the exact uncertainty response when online search finds no usable source.

## Deferred Ideas

None.
