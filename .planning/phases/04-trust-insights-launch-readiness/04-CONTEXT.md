# Phase 4: Trust, Insights & Launch Readiness - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 closes the loop after a hire: hirers rate, review, give thumbs feedback, flag, and control transcript sharing; experts see insights, shared transcripts, earnings and request a mock cash-out; admins review flags and unpublish. It also adds a **Benchmark** feature that shows why hirers should use our expert agents over general-purpose AI agents.

Requirements: MKT-05, MKT-06, CHAT-08, CHAT-09, CRED-08, CRED-09, EXPT-01, EXPT-02, ADMN-01, plus two scope additions from this discussion: **MKT-V2-03** (written reviews, pulled forward from v2) and a new **benchmark** requirement (proposed ID **BENCH-01**, see D-10).

Phase 4 runs in parallel with Phases 2 and 3 on its own branch. Success criteria 4 (outside users + adversarial checks) and 5 (end-to-end ledger reconciliation) are planned here but can only pass after Phases 2 and 3 land.

</domain>

<decisions>
## Implementation Decisions

### Working in parallel
- **D-01:** All Phase 4 work happens on branch `trust/phase-4-trust-insights-launch-readiness`, never on `main`. Merge through small PRs.
- **D-02:** Build on the Phase 1 localStorage demo store (`lib/demo-store.ts`). Phase 2 will bring a real backend later, so put Phase 4 logic in `features/` modules with plain typed functions (e.g. `features/trust/`, `features/insights/`, `features/benchmark/`, a new file under `features/billing/` for cash-out) and keep `setState` calls thin, so porting is cheap.
- **D-03:** Additions to shared files (`lib/types.ts`, `lib/demo-store.ts`, `lib/data/seed.ts`) are additive only: new types, new optional `DemoState` collections, no renames. Existing saved browser state must keep loading. Missing new collections default to empty or seed values rather than wiping state or bumping `STORAGE_KEY`. Land these additions as the first, smallest plan so other lanes can rebase on them.
- **D-04:** Do not change the frozen Phase 1 contracts (`searchKnowledge`, `personaToSystemPrompt`, `buildPrompt`, wallet check, settlement math in `features/billing/pricing.ts`, chat stream types).
- **D-05:** `components/app/chat.tsx`, `components/app/marketplace.tsx` and `app/(app)/agents/[slug]/page.tsx` are also being edited by the Phase 3 owners. Keep Phase 4 edits there minimal and slot-shaped (render a Phase 4 component in one place) so merges stay easy.
- **D-06 [informational]:** Do not commit edits to `.planning/STATE.md` or `.planning/ROADMAP.md` from this branch; a single coordinator owns them. Proposed `REQUIREMENTS.md` additions (MKT-V2-03 moved to v1, BENCH-01) need coordinator sign-off. Plans reference the IDs anyway.

### Ratings and written reviews (MKT-05 + MKT-V2-03)
- **D-07:** Hirer rates 1–5 stars with an optional written comment, once per agent per identity, unlocked after 5+ messages sent to that agent across the hirer's conversations. The listing shows the average, the count, and a reviews list (stars, comment, reviewer name, relative date). Update `Agent.ratingAvg`/`ratingCount` so marketplace sorting keeps working. Seed a handful of reviews per published agent so listings look lived-in (placeholder content per Phase 1 D-03).

### Feedback, sharing, flags, admin (CHAT-08, CHAT-09, MKT-06, ADMN-01)
- **D-08:** Thumbs up/down on every assistant answer (the icons already render in `CostCaption`; make them toggle `Message.feedback`). Transcript sharing is a per-conversation toggle in the chat view, off by default (`Conversation.shareTranscript` already exists). Anyone can flag an agent from its listing or a conversation from chat, with a reason; flags go to the `/admin` queue (`Flag` type exists). The admin can see open flags for agents and conversations, resolve them, and unpublish an agent with a required note. Unpublished agents disappear from the marketplace.

### Expert insights and money (EXPT-01, EXPT-02, CRED-08, CRED-09)
- **D-09:** `/insights` shows aggregates for each agent: conversations, messages, top questions asked, and thumbs-down count. It also shows only the transcripts hirers opted to share. `/earnings` shows gross, platform share and net per conversation, plus a full wallet history. Mock cash-out debits credits and records a payout at 1¢ per credit with status "requested" (replacing the current toast), writing a `cashout` ledger row.

### Benchmark (new, BENCH-01)
- **D-10:** Benchmark compares **our expert agents** against **other AI agents: Muse, Grok, and Hermes**. It is framed as coming from our internal benchmark suite built on popular open-source agent benchmarks with real traction online (for example τ²-bench, GAIA, SWE-bench Verified, BFCL, Terminal-Bench). The planner may pick the set to name.
- **D-11:** Scored dimensions: **cost** (per task), **efficiency** (tokens/steps per task), **speed** (latency / time to answer), **build time** (time to create a working agent), and **tool use / task success**. The team changed the criteria: agents now have tool use and can pull from GitHub. This is not yet reflected in REQUIREMENTS.md, whose Out of Scope table still lists "agent tools". An overall score may combine the dimensions.
- **D-12:** Placement: (a) a **Benchmark tab on each agent's listing page** comparing that agent with Muse, Grok and Hermes; (b) a **score badge on marketplace cards**; (c) a global **`/benchmarks` page** in the sidebar ranking our agents against the generic agents. Charts follow the Phase 1 visual system.
- **D-13:** Numbers are hand-picked sample data that makes our agents look strong. This is a hackathon demo about the idea; the user accepted that the numbers are not measured. Keep them in one data file (e.g. `lib/data/benchmarks.ts`) and show a small "Sample data" label on benchmark views, matching the team's rule to label preloaded demo data (docs/BUILDFEST-STRATEGY.md).

### Acceptance gates (success criteria 4 and 5)
- **D-14:** Plan the adversarial fixtures (cross-tenant access, transcript privacy, citation validity, weak-retrieval refusal, regulated-category safety, streaming errors) and a ledger reconciliation unit test now, against the demo store. Mark the full outside-user run and real-data checks as blocked on Phases 2–3; do not fake them as passed.

### Claude's Discretion
- Exact layout of the review form, flag dialog, admin queue and benchmark charts, within 01-UI-SPEC.md.
- Which named open-source benchmarks to cite, the overall-score formula, and the sample values.
- Module and file names under `features/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and decisions
- `.planning/REQUIREMENTS.md`: Phase 4 IDs, MKT-V2-03 wording, Out of Scope table
- `.planning/ROADMAP.md`: Phase 4 goal, success criteria, lane table
- `.planning/STATE.md`: Phase 1 pivot (frontend-only, localStorage demo store)
- `.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md`: Phase 1 decisions (no auth, seeded identities, placeholder content)
- `docs/BUILDFEST-STRATEGY.md`: label demo data; Art of the Break stress test

### Visual reference
- `.planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md`: design contract reused for Phase 4 (no separate Phase 4 UI-SPEC)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/app/ui.tsx`: `Breadcrumbs`, `PageHeader`, `PageBody`, `EmptyState`, `StatTile`, `PlaceholderNote`, `StatusPill`, `Pill`, `NumberPill`, `DataTable`, `Num`, `Card`, `Toolbar`, `SearchField`, `buttonClass`, `AgentTile`, `IdentityAvatar`
- `lib/types.ts`: `Conversation.shareTranscript`, `Message.feedback`, `Flag`, `Agent.ratingAvg/ratingCount`, `AgentStatus` includes `"unpublished"`, `LedgerKind` includes `"cashout"`
- `lib/demo-store.ts`: `useDemo`, `ledgerFor`, `allLedger`, `balanceOf`, `allConversations`, `messagesFor`, `conversationStats`, `updateAgent`, `currentIdentity`
- `lib/format.ts`: credit/relative-date formatting

### Established Patterns
- Client pages under `app/(app)/*` read state with `useDemo()` and mutate through exported store functions.
- Sidebar nav items are declared in `components/shell/app-shell.tsx` (`NavItem` with `side: "hirer" | "expert" | "both"`).
- Vitest unit tests sit next to code (`features/billing/pricing.test.ts`, `lib/data/seed.test.ts`).

### Integration Points
- `app/(app)/admin/page.tsx`, `app/(app)/insights/page.tsx` and `app/(app)/earnings/page.tsx` are Phase 4 placeholders. Replace their `PlaceholderNote`s.
- `app/(app)/agents/[slug]/page.tsx`: rating summary, reviews, flag button, Benchmark tab.
- `components/app/marketplace.tsx`: benchmark badge on cards; hide unpublished agents.
- `components/app/chat.tsx` `CostCaption`: thumbs toggles; chat header: share toggle and flag.
- `lib/data/seed.ts`: `FLAGS` is empty; add seeded reviews, a flag or two, and benchmark data.

</code_context>

<specifics>
## Specific Ideas

- The benchmark exists to answer "why stay on this platform instead of Muse, Grok or Hermes": cheaper, faster, quicker to build, better task success on expert questions.
- Named competitor agents: Muse, Grok ("Grok bot"), Hermes.

</specifics>

<deferred>
## Deferred Ideas

- Running the benchmark for real against the competitor agents (live harness, measured numbers)
- Moderating individual review text from the admin queue
- **CHAT-06** (fixed emergency/self-harm resource reply + auto-flag): moved into Phase 4 on `main` by Phase 3, deferred out of this plan set by the user on 2026-09-26 during plan-phase source audit. Adversarial fixture RS-03 stays marked blocked. Coordinator to confirm where it lands (e.g. Phase 4.1). Open inputs: resource list (988 / 911 / UW UHS proposed) and an exception to D-03/D-05 for a guard at the top of `sendChatMessage`.
- Updating REQUIREMENTS.md (MKT-V2-03 → v1, BENCH-01, tool use / GitHub removed from Out of Scope): coordinator's call

</deferred>

---

*Phase: 04-trust-insights-launch-readiness*
*Context gathered: 2026-09-26 via plan-phase inline questions*
