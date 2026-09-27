# Phase 2 source coverage and execution map

Discovery: existing approved research is sufficient; no additional library selection. All plans are standard execution; Nyquist/TDD modes disabled. Every plan includes scoped STRIDE/ASVS controls. Shared contracts freeze first; terminal live gate is not satisfied by offline tests.

## Dependency and ownership map

| Plan | Wave | Needs | Creates | Checkpoint |
|---|---:|---|---|---|
| 02-01 | 1 | Approved sources | Freeze shared contracts and install audited dependencies | No |
| 02-02 | 2 | 02-01 | Create durable schema and server authorization boundary | No |
| 02-03 | 3 | 02-02 | Implement transactional wallet, reservations and recovery | No |
| 02-04 | 3 | 02-02 | Bootstrap server read models and preserve demo continuity | No |
| 02-05 | 4 | 02-03 | Build metered Anthropic and Voyage provider gateway | No |
| 02-06 | 2 | 02-01 | Parse and chunk optional sources within resource limits | No |
| 02-07 | 5 | 02-02, 02-05, 02-06 | Activate revision-safe indexes and scoped retrieval | No |
| 02-08 | 3 | 02-02 | Preserve persona ownership and custom prompt mode | No |
| 02-09 | 6 | 02-05, 02-07, 02-08 | Run the adaptive saved interview and answer lifecycle | No |
| 02-10 | 6 | 02-07, 02-06 | Implement confirmed document intake and durable processing | No |
| 02-11 | 6 | 02-05, 02-07, 02-08 | Build shared grounded answer runtime and isolated web fallback | No |
| 02-12 | 7 | 02-04, 02-09, 02-10, 02-11 | Connect server APIs to the browser state bridge | No |
| 02-13 | 8 | 02-12 | Build interview editing and persona review views | No |
| 02-14 | 8 | 02-12 | Build optional knowledge intake and source lifecycle UI | No |
| 02-15 | 8 | 02-12 | Render streaming evidence, web steps and retained composers | No |
| 02-16 | 9 | 02-13, 02-14, 02-15 | Wire builder views and migrate remaining shell mutations | No |
| 02-17 | 10 | 02-16 | Complete offline acceptance and prepare real-service diagnostics | No |
| 02-18 | 11 | 02-17 | [BLOCKING] Apply migrations and prove the real build loop | Terminal real-service access |

Same-wave files are exclusively owned. Later shared-file writers depend on earlier owners. Each task's read_first, files, action and acceptance criteria provide its concrete needs/creates; dependencies above are precomputed. No branch changes. ROADMAP plan count is left to the orchestrator using the required gsd-phase skill.

## Multi-source coverage

| Source | ID | Behavior/constraint | Plan(s) | Status |
|---|---|---|---|---|
| GOAL | Phase 2 | Own answers → grounded agent, optional sources, expert and labeled web verification before publishing | 01–18 | COVERED |
| REQ | CRED-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-01, 02-02, 02-03, 02-04, 02-05, 02-11 | COVERED |
| REQ | CRED-03 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-01, 02-03, 02-05, 02-10, 02-11, 02-12, 02-15, 02-16 | COVERED |
| REQ | INTV-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-01, 02-02, 02-07, 02-09 | COVERED |
| REQ | PERS-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-01, 02-08, 02-13 | COVERED |
| REQ | SBOX-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-01, 02-11, 02-15 | COVERED |
| REQ | PERS-01 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-02, 02-04, 02-08, 02-12, 02-13, 02-16 | COVERED |
| REQ | DOCS-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-02, 02-07, 02-10, 02-14, 02-16 | COVERED |
| REQ | RETR-03 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-02, 02-07 | COVERED |
| REQ | CRED-05 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-03, 02-04, 02-05, 02-10, 02-12, 02-15, 02-16 | COVERED |
| REQ | CRED-10 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-03, 02-05 | COVERED |
| REQ | INTV-06 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-03, 02-09 | COVERED |
| REQ | PERS-03 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-05, 02-08, 02-13 | COVERED |
| REQ | DOCS-01 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-06, 02-10, 02-14 | COVERED |
| REQ | DOCS-03 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-06, 02-07, 02-10, 02-14 | COVERED |
| REQ | DOCS-04 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-06, 02-10, 02-14 | COVERED |
| REQ | INTV-04 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-07, 02-09, 02-13, 02-14 | COVERED |
| REQ | RETR-01 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-07, 02-11 | COVERED |
| REQ | RETR-02 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-07, 02-11, 02-15 | COVERED |
| REQ | INTV-05 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-08, 02-09, 02-13 | COVERED |
| REQ | INTV-01 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-09, 02-13 | COVERED |
| REQ | INTV-03 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-09, 02-12, 02-13, 02-16 | COVERED |
| REQ | INTV-07 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-09, 02-13 | COVERED |
| REQ | SBOX-01 | Exact REQUIREMENTS.md behavior; terminal plan 18 verifies | 02-11, 02-12, 02-15, 02-16 | COVERED |
| CONTEXT | D-01 | Deep thread, concrete follow-ups, skip | 09, 13 | COVERED |
| CONTEXT | D-02 | Pause/resume/edit/link detail; preserve original | 07, 09, 12, 13, 14 | COVERED |
| CONTEXT | D-03 | Advisory readiness and continue | 09, 13 | COVERED |
| CONTEXT | D-04 | Untouched fields update; expert edits/suggestions preserved | 08, 09, 12, 13 | COVERED |
| CONTEXT | D-05 | Faithful supported concise persona; no claims invented | 08, 09, 13 | COVERED |
| CONTEXT | D-06 | Custom prompt remains; explicit regenerate; immutable safety | 08, 11, 13 | COVERED |
| CONTEXT | D-07 | Separate answer/document sections and real metadata | 07, 10, 14, 16 | COVERED |
| CONTEXT | D-08 | Preflight limits/estimate then confirm; actual settlement | 03, 06, 10, 14 | COVERED |
| CONTEXT | D-09 | Collapsed excerpts, coordinates, relevance | 07, 11, 15 | COVERED |
| CONTEXT | D-10 | Scoped web fallback/gap/distinct evidence; no web knowledge | 11, 15, 18 | COVERED |
| CONTEXT | D-11 | Immediate expandable query/page tool steps and provenance | 11, 15, 18 | COVERED |
| RESEARCH | Contracts/persistence | Text IDs, revision/version/persona ownership, server read model, fixture exclusion | 01, 02, 04, 12 | COVERED |
| RESEARCH | Stack/audit | Six pinned OK dependencies; Next installed docs; no new AI framework | 01 | COVERED |
| RESEARCH | Wallet/cap | Exact bigint money, max-envelope holds, day locks, replay, all-attempt usage, unknown recovery | 03, 05, 17, 18 | COVERED |
| RESEARCH | Pricing | Cache writes/reads/search/embedding, price snapshot and gross/effective allowance policy | 03, 05, 17, 18 | COVERED |
| RESEARCH | Revision protocol | Current vs indexed, staged atomic activate, stale worker/delete races and linked details | 07, 09 | COVERED |
| RESEARCH | Persona | Evidence-linked field ownership, stale merge, custom prompt isolation | 08, 13 | COVERED |
| RESEARCH | Intake | Five input kinds, actual metadata, signature/ZIP/worker bounds, confirmation/quota leases/retries | 06, 07, 10, 14 | COVERED |
| RESEARCH | Retrieval | Exact cosine 1024, filter before LIMIT, active revisions, no fabricated fallback | 07, 17, 18 | COVERED |
| RESEARCH | Web | Coverage assessment, minimized context, managed search/fetch, conservative bounded envelope, tool-free synthesis | 11 | COVERED |
| RESEARCH | Events/provenance | Persist-before-emit NDJSON, immutable snapshots, failed/partial tool result, replay | 01, 11, 12, 15 | COVERED |
| RESEARCH | Legacy bridge | Explicit idempotent draft import; no browser money; safe reset; unavailable config | 04, 12, 16 | COVERED |
| RESEARCH | Security | ASVS scoped controls; server owner checks/private storage/revoked grants; no auth/RLS additions | 02–18 | COVERED |
| RESEARCH | Environment | Complete offline work first; terminal access/migration/live gate; no false live claims | 17, 18 | COVERED |
| RESEARCH | Verification | Financial concurrency/replay/rollover, isolation, indexing races, parsing/security/UI/live walkthrough | 03–18 | COVERED |

| Source | Contract surface | Plan(s) | Status |
|---|---|---|---|
| UI-SPEC | Interview/status/readiness/persona/custom prompt/dirty drafts | 12, 13, 16 | COVERED |
| UI-SPEC | Knowledge/intake/limits/confirmation/source deletion | 10, 14, 16 | COVERED |
| UI-SPEC | Sandbox/expert-web details/tool stream/cost/no-evidence | 11, 15, 16 | COVERED |
| UI-SPEC | Responsive/theme/touch/keyboard/focus/scroll/live statuses | 13–16, 18 | COVERED |
| Phase 1 inherited | No auth/RLS; two identities; shell/section routes; real wallet/raw build charge; repeatable mock funds; model/safety config | 01–05, 12, 16 | COVERED |

No unplanned source items. Phase 3 publishing/hirer route and split-settlement, Phase 4 insights/moderation and explicitly deferred voice/URL ingestion/hybrid retrieval remain outside Phase 2. The shared runtime supports Phase 3 integration without prematurely exposing its route. Legacy Phase 1 canned-contract instruction is superseded by Phase 2 real-service scope.

Pre-mortem controls: financial ambiguity retains a reconciled hold (03/05); stale indexing cannot reactivate deleted evidence (07/10); missing credentials cannot produce false completion (17/18). Source/code changes should remain within each task's named files; report cross-plan contract changes before dependent execution.

