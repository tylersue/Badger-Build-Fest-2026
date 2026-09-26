# Roadmap: Expert Agent Platform

## Overview

Deliver one interview-first BUILD → PUBLISH → HIRE → USE loop in four weeks with four collaborators. Phase 1 establishes shared contracts. Phase 2 agent-building and Phase 3 discovery, chat, and credits then run concurrently across owners, with integration checkpoints before either outcome is accepted. The complete loop must work by the end of week 2. Phase 4 trust, privacy, earnings, and operator work can begin where contracts are stable, then completes after the integrated loop is verified with real users and content. `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` define the current scope; the older `docs/ROADMAP.md` and related docs need reconciliation because they still describe Stripe, document-first setup, and per-agent trials.

## Phases

- [ ] **Phase 1: Accounts, Wallet & Shared Contracts** - Users can sign in, manage one identity, and fund a visible credit wallet while the team freezes the schema and service contracts.
- [ ] **Phase 2: Interview-First Agent Building** - Experts can create knowledge through an adaptive interview, add documents, edit their agent, and test grounded answers at real build cost.
- [ ] **Phase 3: Publish, Discover & Use** - An expert can publish an agent; another account can find it, chat safely with citations, and pay credits that generate expert earnings.
- [ ] **Phase 4: Trust, Insights & Launch Readiness** - Hirers control feedback and transcript sharing; experts see earnings and insights; admins handle flags; the full loop is verified.

## Delivery Checkpoints

**Competition deadline unresolved:** the team's event brief requires a Sunday 11 AM submission and a two-minute video. The four-week checkpoints below need a separate weekend prototype milestone if this means September 27. Track/challenge strategy and proposed early stress-test work are in [BUILDFEST-STRATEGY.md](../docs/BUILDFEST-STRATEGY.md); do not treat September 30 challenge results as extra build time.

| Checkpoint | Expected result |
|------------|-----------------|
| Kickoff gate | Phase 1 complete: deployed scaffold, RLS, auth, wallet, and agreed contracts; four owners can work against the same interfaces. |
| End of week 1 | Phase 2 complete: an expert can build and test an agent from an interview; optional documents work too. |
| End of week 2 | Phase 3 complete: two accounts can walk BUILD → PUBLISH → HIRE → USE on a deployed URL, with real metering and mock funding. |
| Weeks 3–4 | Phase 4 complete: privacy, moderation, ratings, earnings, adversarial checks, and outside-user fixes are ready for release. |

Phase gates describe integrated outcomes, not exclusive work periods. Phase 2 and Phase 3 implementation start together once Phase 1 contracts are stable. Sandbox is an integration checkpoint between knowledge and runtime; published chat is an integration checkpoint between builder, marketplace, runtime, and wallet. Phase 3 cannot pass verification until the Phase 2 knowledge and persona path works. The AI core must have separate knowledge and runtime owners.

## Four-Person Collaboration

Assign one teammate to each lane at kickoff; the names are intentionally open until the team agrees on ownership. A lane owns its feature folders and reviews changes to its contracts. The platform owner reviews migrations and shared infrastructure changes. Each issue and PR has one primary owner, with a second lane reviewing changes that cross a contract.

| Lane | Primary ownership | Phase 1 contribution | Phase 2–3 contribution | Phase 4 contribution |
|------|-------------------|----------------------|------------------------|----------------------|
| Platform → Builder | Auth, app shell, schema coordination, `features/builder/`, build pages | Scaffold, RLS, auth, profile, builder contracts and typed schema | Interview and persona UI, sandbox UI, publish flow | Builder fixes, admin access and moderation UI |
| Knowledge | `features/knowledge/`, ingestion API, source and chunk retrieval | Source/chunk schema and `searchKnowledge` contract | Interview-answer embedding, document ingestion, retrieval and isolation test; citation data for chat | Retrieval and citation evaluation |
| Runtime | `features/runtime/`, chat API and chat pages, LLM wrapper | Model registry, usage-logging contract, chat stream and safety contracts | Shared sandbox pipeline; hirer chat, grounding, citations, safety and file context | Privacy and feedback behavior, streaming and safety checks |
| Marketplace → Credits | `features/marketplace/`, `features/billing/`, listing and wallet pages | Wallet, ledger, free grant and mock funding contract | Browse/listings and wallet checks; usage settlement and expert credit | Ratings, earnings, cash-out and expert insights |

The knowledge and runtime lanes must be owned by different people. Freeze the shared `searchKnowledge`, `personaToSystemPrompt`, `buildPrompt`, wallet check, settlement, and chat stream types in Phase 1; changes to those contracts require review from every affected lane. Phase 2 and Phase 3 owners can build against stubs in separate branches or worktrees and merge in small PRs. A single coordinator updates shared `.planning/ROADMAP.md` and `.planning/STATE.md` during concurrent execution to avoid competing state edits. GSD's `parallelization` setting runs independent plans within one phase; it does not itself schedule separate phases concurrently. The phase dependencies below distinguish when work may start from when its integrated result can be accepted.

Before parallel implementation, record the four owners in the project board and `.github/CODEOWNERS`, replace obsolete issues with phase-mapped work, and land small PRs through CI and preview deploys. Use a two-account deployed walkthrough as the merge gate for the Phase 3 loop; verify build costs, hirer debit, and expert credit from the same run.

## Phase Details

### Phase 1: Accounts, Wallet & Shared Contracts
**Goal**: A person can enter the platform with one account and a usable credit balance, while every team member has stable interfaces for building the core loop.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, CRED-01, CRED-06, CRED-07
**Success Criteria** (what must be TRUE):
  1. A user can sign up and return with email or Google, use the same account to build and hire, and edit an expert profile whose credentials are labeled self-reported.
  2. A new account receives a configurable free grant and sees its balance in the app shell; mock monthly subscription and credit-pack actions add credits with ledger entries and no real payment.
  3. An allowlisted admin can access admin routes; a non-admin cannot. Owner data and private uploads are isolated by RLS.
  4. A deployed app and local setup work with the agreed database schema and typed contracts for interview knowledge, retrieval, persona prompts, chat, wallet checks, usage settlement, and per-category model and safety configuration.
**Plans**: TBD
**UI hint**: yes

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
**Depends on**: Phase 1 to start; Phase 2 to complete the end-to-end acceptance gate
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, MKT-01, MKT-02, MKT-03, MKT-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-10, CHAT-11, CHAT-12, CRED-04
**Success Criteria** (what must be TRUE):
  1. An expert accepts content consent, sets a 1x–5x rate, publishes an eligible agent instantly, sees its generated listing, and can unpublish it immediately.
  2. A visitor can understand both sides of the platform, browse and search published agents, compare profiles and typical message cost, and start a conversation from a listing or example question.
  3. A hirer can stream a reply, return to the conversation later, see valid source citations and the cost of each answer, and get a clear refusal with the expert's contact link when the knowledge is weak.
  4. A hirer can supply one conversation file as untrusted context; regulated-category disclaimers persist, emergency or self-harm patterns receive a fixed resource reply, and long conversations continue with windowed history.
  5. A two-account deployed walkthrough charges the hirer by actual cost × expert multiplier and atomically records platform cost recovery, margin share, and expert wallet credit; mock funding is the only money-in path.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Trust, Insights & Launch Readiness
**Goal**: Hirers, experts, and admins can review outcomes and exercise privacy and moderation controls; the full loop holds up under outside and adversarial use.
**Depends on**: Phase 1 to start independent controls; Phase 2 and Phase 3 to complete the end-to-end acceptance gate
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

- Applied AI & Automation is the confirmed track. Art of the Break is tentative; Badgers Building for Badgers is the recommended second challenge. Prepare stress-test fixtures during Phase 1 and collect real before/after evidence as soon as the agent runs in Phases 2–3; the submission Break Card cannot wait solely for Phase 4. Challenge registration and timing remain to be confirmed.
- Phase 1 must decide and freeze the wallet and service contracts before parallel implementation. The margin share is a configurable constant (15% default); validate it and size the free grant against a complete interview build during Phase 1 planning.
- Phase 2 planning needs focused research on interview turn-taking, answer segmentation, and persona drafting. Hirer-uploaded files need a prompt-injection threat model before Phase 3 delivery.
- Health/PT and tax/finance require fixed regulated-category treatment. Confirm the category policy for career/admissions during Phase 1 planning. Safety checks and grounded refusal are part of the first published-chat release, then verified more deeply in Phase 4.
- After this roadmap is accepted, reconcile the older `docs/` scope and the existing GitHub issues with these phases; remove obsolete Stripe, trial, and document-first assumptions before implementation issues are assigned.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Accounts, Wallet & Shared Contracts | 0/TBD | Not started | - |
| 2. Interview-First Agent Building | 0/TBD | Not started | - |
| 3. Publish, Discover & Use | 0/TBD | Not started | - |
| 4. Trust, Insights & Launch Readiness | 0/TBD | Not started | - |
