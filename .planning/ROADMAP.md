# Roadmap: Expert Agent Platform

## Overview

Deliver one interview-first BUILD → PUBLISH → HIRE → USE loop in four weeks with four collaborators. The MVP is a presentation build: no authentication, two seeded identities (an expert and a hirer) with a sidebar switcher in place of accounts, seeded placeholder content on every page, and a UI copied closely from LangSmith. The interview, chat, metering and ledger run for real. The first phase establishes the shell and shared contracts so builder, knowledge, runtime, and marketplace work can proceed in parallel. The next two phases make the complete loop work by the end of week 2. The final phase adds the remaining trust, privacy, earnings, and operator workflows and verifies the system with real users and content. `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` define the current scope; the older `docs/ROADMAP.md` and related docs need reconciliation because they still describe Stripe, document-first setup, and per-agent trials.

## Phases

- [ ] **Phase 1: Shell, Wallet & Shared Contracts** - The app opens straight into a LangSmith-style shell with every loop route stubbed, two seeded identities, a funded credit wallet, and frozen schema and service contracts.
- [ ] **Phase 2: Interview-First Agent Building** - Experts can create knowledge through an adaptive interview, add documents, edit their agent, and test grounded answers at real build cost.
- [ ] **Phase 3: Publish, Discover & Use** - An expert can publish an agent; another account can find it, chat safely with citations, and pay credits that generate expert earnings.
- [ ] **Phase 4: Trust, Insights & Launch Readiness** - Hirers control feedback and transcript sharing; experts see earnings and insights; admins handle flags; the full loop is verified.

## Delivery Checkpoints

| Checkpoint | Expected result |
|------------|-----------------|
| Kickoff gate | Phase 1 complete: deployed scaffold, shell with every route stubbed, seeded identities and wallets, and agreed contracts; four owners can work against the same interfaces. |
| End of week 1 | Phase 2 complete: an expert can build and test an agent from an interview; optional documents work too. |
| End of week 2 | Phase 3 complete: switching between the seeded expert and hirer walks BUILD → PUBLISH → HIRE → USE on a deployed URL, with real metering and mock funding. |
| Weeks 3–4 | Phase 4 complete: privacy, moderation, ratings, earnings, adversarial checks, and outside-user fixes are ready for release. |

Phase gates describe integrated outcomes. Within a phase, the four owners can work in parallel against the shared contracts. Sandbox is an integration checkpoint between knowledge and runtime; published chat is an integration checkpoint between builder, marketplace, runtime, and wallet. The AI core must have separate knowledge and runtime owners.

## Four-Person Collaboration

Assign one teammate to each lane at kickoff; the names are intentionally open until the team agrees on ownership. A lane owns its feature folders and reviews changes to its contracts. The platform owner reviews migrations and shared infrastructure changes. Each issue and PR has one primary owner, with a second lane reviewing changes that cross a contract.

| Lane | Primary ownership | Phase 1 contribution | Phase 2–3 contribution | Phase 4 contribution |
|------|-------------------|----------------------|------------------------|----------------------|
| Platform → Builder | App shell, identity switcher, schema coordination, `features/builder/`, build pages | Scaffold, LangSmith-style shell with stub routes, seeded identities, profile, builder contracts and typed schema | Interview and persona UI, sandbox UI, publish flow | Builder fixes, admin access and moderation UI |
| Knowledge | `features/knowledge/`, ingestion API, source and chunk retrieval | Source/chunk schema and `searchKnowledge` contract | Interview-answer embedding, document ingestion, retrieval and isolation test; citation data for chat | Retrieval and citation evaluation |
| Runtime | `features/runtime/`, chat API and chat pages, LLM wrapper | Model registry, usage-logging contract, chat stream and safety contracts | Shared sandbox pipeline; hirer chat, grounding, citations, safety and file context | Privacy and feedback behavior, streaming and safety checks |
| Marketplace → Credits | `features/marketplace/`, `features/billing/`, listing and wallet pages | Wallet, ledger, seeded balances and mock funding contract | Browse/listings and wallet checks; usage settlement and expert credit | Ratings, earnings, cash-out and expert insights |

The knowledge and runtime lanes must be owned by different people. Freeze the shared `searchKnowledge`, `personaToSystemPrompt`, `buildPrompt`, wallet check, settlement, and chat stream types in Phase 1; changes to those contracts require review from every affected lane. Work on Phase 3 listings and chat UI may begin against stubs during Phase 2. The phase dependency marks when the integrated outcome can be accepted, not when another teammate may start work.

Before parallel implementation, record the four owners in the project board and `.github/CODEOWNERS`, replace obsolete issues with phase-mapped work, and land small PRs through CI and preview deploys. Use a deployed walkthrough that switches between the seeded expert and hirer as the merge gate for the Phase 3 loop; verify build costs, hirer debit, and expert credit from the same run.

## Phase Details

### Phase 1: Shell, Wallet & Shared Contracts
**Goal**: Anyone who opens the site lands in a LangSmith-style shell where every route of the loop exists, can switch between a seeded expert and a seeded hirer, and sees a funded wallet, while every team member has stable interfaces for building the core loop.
**Depends on**: Nothing (first phase)
**Requirements**: SHEL-01, SHEL-02, SHEL-03, AUTH-03, CRED-01, CRED-06
**Success Criteria** (what must be TRUE):
  1. The deployed URL opens straight into the shell (collapsible sidebar, breadcrumb bar) on the marketplace; every loop route (my agents, interview, persona, knowledge, test, publish, marketplace, listing, chat, wallet, earnings, insights, admin) renders a page with a title, empty state and working nav.
  2. A "Viewing as" switcher in the sidebar footer swaps between the seeded expert and hirer (name, avatar, wallet), survives a reload, and the expert profile page shows seeded values that can be edited.
  3. Each identity starts with $50 (5,000 credits) visible in the shell; mock Subscribe and Buy pack add credits instantly and repeatably with ledger rows; the wallet and earnings pages show seeded history.
  4. A deployed app and local setup work with the agreed database schema, seed data, and typed contracts for interview knowledge, retrieval, persona prompts, chat stream, wallet check (pre-call reservation, hard stop at zero), usage settlement, and per-category model and regulated-category config; every stub returns canned placeholder data.
**Plans**: None — built directly on 2026-09-26 as a frontend-only app (see STATE.md "Phase 1 pivot"); unfinished plan drafts and the dropped Supabase schema are in `.planning/phases/01-shell-wallet-shared-contracts/drafts/`
**UI hint**: yes
**Context**: `.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md`

### Phase 2: Interview-First Agent Building
**Goal**: An expert can turn their own answers into a grounded agent, add optional material, and verify what the agent knows before publishing.
**Depends on**: Phase 1
**Requirements**: INTV-01, INTV-02, INTV-03, INTV-04, INTV-05, INTV-06, INTV-07, PERS-01, PERS-02, PERS-03, DOCS-01, DOCS-02, DOCS-03, DOCS-04, RETR-01, RETR-02, RETR-03, SBOX-01, SBOX-02, CRED-02, CRED-03, CRED-05, CRED-10
**Success Criteria** (what must be TRUE):
  1. An expert can complete a typed, adaptive interview, pause and resume it, and review, edit, or delete the embedded answers and their source questions.
  2. The interview drafts a persona; the expert can edit its short form and advanced prompt, while the platform assigns the model by category.
  3. The expert can add and remove supported documents or pasted text, see source status and limits, and retrieve cited chunks from both interview and document knowledge.
  4. The expert can test the draft agent through the same grounded answer pipeline used for hirers and inspect retrieved chunks and scores; a cross-tenant test proves agent A cannot retrieve agent B's chunks.
  5. Interview, embedding, and sandbox calls log actual usage and charge raw cost; insufficient balance prompts a mock top-up before the call, and the daily platform spend cap stops further calls.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Publish, Discover & Use
**Goal**: An expert's agent can be published and found, and a hirer can use it safely while both sides see the credit effect.
**Depends on**: Phase 2
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, MKT-02, MKT-03, MKT-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-10, CHAT-11, CHAT-12, CRED-04
**Success Criteria** (what must be TRUE):
  1. An expert accepts content consent, sets a 1x–5x rate, publishes an eligible agent instantly, sees its generated listing, and can unpublish it immediately.
  2. A hirer can browse and search published agents, compare profiles and typical message cost, and start a conversation from a listing or example question.
  3. A hirer can stream a reply, return to the conversation later, see valid source citations and the cost of each answer, and get a clear refusal with the expert's contact link when the knowledge is weak.
  4. A hirer can supply one conversation file as untrusted context; regulated-category disclaimers persist, emergency or self-harm patterns receive a fixed resource reply, and long conversations continue with windowed history.
  5. A deployed walkthrough that switches between the seeded hirer and expert charges the hirer by actual cost × expert multiplier and atomically records platform cost recovery, margin share, and expert wallet credit; mock funding is the only money-in path.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Trust, Insights & Launch Readiness
**Goal**: Hirers, experts, and admins can review outcomes and exercise privacy and moderation controls; the full loop holds up under outside and adversarial use.
**Depends on**: Phase 3
**Requirements**: MKT-05, MKT-06, CHAT-08, CHAT-09, CRED-08, CRED-09, EXPT-01, EXPT-02, ADMN-01
**Success Criteria** (what must be TRUE):
  1. A hirer can rate an agent once after five messages, give thumbs feedback on answers, flag an agent, and choose per conversation whether the expert may read its transcript; sharing starts off.
  2. An expert can see aggregate questions, conversation and message counts, thumbs-down counts, only opted-in transcripts, a complete wallet history, and a per-conversation gross/platform/net earnings breakdown.
  3. An expert can request a mock cash-out that debits credits and records a requested payout; an admin can inspect agent and conversation flags and unpublish an agent with a note.
  4. Outside users can complete the deployed loop using real seed content; cross-tenant access, transcript privacy, citation validity, weak-retrieval refusal, regulated-category safety, and streaming errors are checked with representative and adversarial cases.
  5. End-to-end ledger checks reconcile build-time raw costs and use-time markup, platform share, expert credit, and cash-out without missing or duplicate entries.
**Plans**: TBD
**UI hint**: yes

## Planning Notes

- Phase 1 must freeze the wallet and service contracts before parallel implementation. Decided in Phase 1 context: margin share stays a configurable 15%; each seeded identity starts with $50; the wallet reserves the estimated cost before a call and hard-stops at zero.
- Authentication, RLS and the admin allowlist are out of the MVP (presentation build). Admin pages are open. Seed content is placeholder; the interview, chat, metering and ledger are real. Work lands on branch `platform/skeleton-ui` and merges to `main` by PR.
- Phase 2 planning needs focused research on interview turn-taking, answer segmentation, and persona drafting. Hirer-uploaded files need a prompt-injection threat model before Phase 3 delivery.
- Health/PT and tax/finance get the regulated-category treatment; career/admissions does not. This list is provisional and must live in config so it can change in one line. Safety checks and grounded refusal are part of the first published-chat release, then verified more deeply in Phase 4.
- After this roadmap is accepted, reconcile the older `docs/` scope and the existing GitHub issues with these phases; remove obsolete Stripe, trial, and document-first assumptions before implementation issues are assigned.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Shell, Wallet & Shared Contracts | n/a (built directly) | Built locally, awaiting deploy + PR | - |
| 2. Interview-First Agent Building | 0/TBD | Not started | - |
| 3. Publish, Discover & Use | 0/TBD | Not started | - |
| 4. Trust, Insights & Launch Readiness | 0/TBD | Not started | - |
