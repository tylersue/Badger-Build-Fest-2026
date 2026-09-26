# Project Research Summary

**Project:** Badger Experts — expert-agent marketplace (BUILD → PUBLISH → HIRE → USE)
**Domain:** RAG-grounded AI persona agents, built by domain experts, sold through a two-sided marketplace
**Researched:** 2026-09-26
**Confidence:** MEDIUM-HIGH (see Confidence Assessment — two scope decisions made *after* research require re-validation at plan time)

> **Note on scope drift:** STACK.md, FEATURES.md, ARCHITECTURE.md, and PITFALLS.md were researched against an earlier scope assumption (Stripe-powered per-conversation pricing, document-upload-first knowledge intake). The user has since fixed several scope decisions that override anything in those four files where they conflict. This summary reflects the **current, authoritative** scope. Divergences are called out explicitly below rather than silently merged.

**Current scope, for reference:**
1. Payments are fully **mocked** (no Stripe integration at all). Metering is **real**.
2. Billing model: **one platform-wide credit wallet per account** (not per-agent, no per-agent trials or allowances). 1 credit = 1 cent. Credits are funded by (a) a mock monthly platform subscription that grants N credits, (b) mock credit packs, (c) earnings when other people use an expert's agent. Credits are spent on **everything metered** — both **building** an agent (interview turns, document embedding, charged at raw LLM cost) and **using** an agent (raw LLM cost × the expert's rate multiplier). The platform keeps the raw cost plus a take on the margin; the rest of the margin credits the expert's wallet. Experts can spend earned credits on further building, or request a mock cash-out (deducts credits, records a payout row). Entitlement is a single check: wallet balance ≥ typical call cost — a free monthly credit grant replaces the free trial.
3. The primary knowledge-intake path is a **guided interview**: an interviewer agent asks the expert open-ended questions (GSD-style — follow threads, challenge vagueness, make the abstract concrete), and each answer becomes a knowledge chunk. The interview also **drafts the agent's persona** (name/tone/category/"how I work"); the expert then edits it via a short form rather than filling one in from scratch. Document upload is secondary/optional. Interview is **typed** in the MVP; voice is a later addition, and the design should leave room for both eventually. Interview UX is deliberately left open for research at plan time.
4. Hirers can upload a file inside chat (resume, essay, tax form) — P0, minimum functional: extract text, inject into that conversation's prompt, no embedding.
5. Hirers opt in **per conversation** to share the transcript with the expert; otherwise the expert sees aggregates only.
6. Seed categories: health/fitness/PT, tax/personal finance, career/college admissions coaching.
7. Publishing is instant (no admin pre-approval gate); admin can unpublish.
8. Timeline: 4 weeks, 4 people. Framed around a working MVP — not a demo day or judges.

## Executive Summary

This is a RAG-grounded expert-persona marketplace: an expert builds an AI agent from their own knowledge, publishes it, and hirers pay to chat with it. The comparables (Delphi.ai, Coachvox, GPT Store, Poe) confirm this is a proven, working category — the differentiators that matter are visible grounding (citations tied to real chunks), a builder-facing retrieval inspector, and reaching experts who don't already have an audience. The architecture research validates a lean shape for this: one Next.js 16 monolith over one Supabase Postgres (pgvector + Auth + Storage), a fixed non-branching RAG pipeline per chat turn, and tenant isolation by an `agent_id` filter inside service-role queries rather than by RLS (RLS only protects owner/hirer reads, not the retrieval path itself — this needs a dedicated cross-tenant test, not just a functional one).

The most consequential change since that research is the shift from Stripe-backed per-conversation pricing to a **single platform-wide credit wallet per account, fully mocked on the money-in side, with real usage metering on every metered action**. This removes a large slice of external-integration risk (Stripe Connect onboarding, destination charges, refund/dispute policy, webhook idempotency) from the 4-week build entirely — none of that needs to exist for MVP. In its place, the real work moves to `lib/llm` as the single choke point that must log every metered action's actual token cost — both **building** (interview turns, embedding) and **using** (chat) — apply the expert's rate multiplier where relevant, and debit or credit the correct wallet by the correct amount; entitlement collapses to one check (wallet balance ≥ typical call cost) instead of a per-agent trial or allowance. The second consequential change is that knowledge intake is now **interview-first**, not upload-first, and the same interview also drafts the persona: an interviewer agent is a new, unresearched component (its UX, turn-taking, and answer-to-chunk segmentation strategy are explicitly open questions; typed-only for MVP, voice deferred), sitting architecturally as a *write* path into `sources`/`chunks` and the persona fields that parallels the existing ingestion pipeline rather than replacing it — document upload remains a secondary path using the already-researched parsers.

Key risks, largely unchanged in kind: the agent must visibly decline to answer when retrieval is weak (Pitfall 1) rather than bluff; citations must actually be checked against the cited chunk's text, not just rendered (Pitfall 2); regulated-category disclaimers (now concretely health/fitness/PT and tax/personal finance) must survive jailbreak attempts across a full conversation, not just the first turn (Pitfall 4); and the ledger transparency that used to prevent GPT Store-style creator distrust (Pitfall 7) now applies to the wallet's earnings breakdown just as much as it did to a Stripe fee breakdown — arguably more, since the wallet now also funds building, and that side of the metering math is entirely new and unverified end-to-end. Three small table-stakes UI items (ToS/content-ownership consent, an in-chat "contact the expert" CTA, and a "flag this agent" button) are named in the PRD's prose but missing from MVP-SCOPE's explicit "In" columns and should be pulled forward.

## Key Findings

### Recommended Stack

Stack research is HIGH confidence and **mostly still valid**: Next.js 16 (App Router, note the `middleware.ts`→`proxy.ts` rename), TypeScript strict mode, Supabase (Postgres + pgvector + Auth + Storage) for one vendor/one bill/shared RLS, Vercel AI SDK 7 (`streamText`, `Output.object` — not the v4/v5 `generateObject` pattern most training data assumes) with `@ai-sdk/anthropic`, Claude Sonnet 5 as the default chat model with Opus 5.5 as a quality tier and Haiku 4.5 for cheap utility calls, and Voyage `voyage-4-lite` embeddings (1024-d, fixed once chosen). **Stripe is now out of scope entirely** — `PAYMENTS_MODE=mock` is not a fallback demo mode anymore, it is the only mode. This simplifies the stack (no Stripe CLI, no webhook testing, no Connect Express) but raises the bar on `lib/llm`'s usage-logging accuracy, since every metered action — not just chat — now debits or credits the same wallet, and a logging bug anywhere is a real-money-shaped bug even though no real money moves.

**Core technologies:**
- Next.js 16 + Supabase (Postgres/pgvector/Auth/Storage) — one deploy, one datastore, shared RLS/JWT across all four workstreams
- Vercel AI SDK 7 + Anthropic Claude (Sonnet 5 default) — streaming chat, structured output, native tool calling
- Voyage `voyage-4-lite` embeddings — RAG retrieval, free allowance covers MVP volume, dimension fixed once and never changed
- ~~Stripe (Checkout + Connect Express)~~ — **removed from scope**; replaced by mock subscription/credit-pack buttons feeding one platform-wide credit wallet per account, driven by a real `llm_usage` ledger

### Expected Features

Feature research (MEDIUM-HIGH confidence) confirms this category is proven and identifies where the current MVP scope has real gaps versus its own PRD narrative.

**Must have (table stakes):**
- Persona drafted from the interview transcript, expert edits via a short guided form (name/category/tone); knowledge intake with per-item status; sandbox test before publish; publish/unpublish toggle
- Grounded answers with visible citations tied to real retrieved chunks (the product's core differentiator)
- Graceful "I don't know, ask the expert" fallback; streaming responses; conversation persistence
- Category browse/filter, expert credibility card (bio/credentials/experience — carries more weight here than in Delphi's model since these experts don't already have an audience), star rating
- Single wallet/earnings view (spend and earnings combined), with the platform's margin-take visibly disclosed

**Should have (competitive):**
- Builder-facing retrieval inspector (near-free once citations exist — same data, different audience) — no comparable exposes this to the creator
- In-chat "contact the expert directly" escape hatch — differentiates from Delphi/Coachvox, which structurally keep the user inside the AI conversation
- Discovery for experts *without* a pre-existing audience — the PRD's own stated, unclaimed wedge versus every comparable checked

**Defer (v2+):** voice/video cloning, voice-based interview, cross-agent semantic routing, written reviews (star-only is fine at launch), embeddable widget.

**Three items are missing from MVP-SCOPE's explicit "In" columns** even though they're implied by the PRD's own prose — low complexity, should be added as line items, not treated as scope creep:
1. **ToS / content-ownership consent checkbox** in the BUILD/publish flow (expert owns uploads, platform gets a limited license) — directly addresses the #1 expert fear ("someone steals my material").
2. **"Contact the expert" CTA inside chat** — data (contact link) is already collected on the expert profile; just needs to render.
3. **"Flag this agent" button** in the hirer chat UI — nothing currently populates the admin flagged-conversations queue other than thumbs-down; this is the missing upstream source.

**Take-rate flag:** MVP-SCOPE sets the platform cut at 20%. Every comparable checked disclosed a lower cut — Delphi 15%, Coachvox 10%, Clarity.fm 15%. **15% is the market anchor; 20% is above every comparable found.** There's a legitimate argument for it (no live-human-time cost, unlike Clarity.fm's per-minute calls), but it should be a deliberate, stated decision, not a default. Under the wallet model the mechanism for where this cut lands is now specified — the platform keeps the raw LLM cost plus a share of the margin (multiplier price minus raw cost), and the rest of the margin credits the expert's wallet — but the exact percentage of margin the platform keeps is still unconfirmed (see Gaps below).

### Architecture Approach

Architecture research (HIGH confidence as a sanity-check of an already-designed system) confirms a single Next.js monolith over a single Supabase instance, with a fixed, non-branching RAG pipeline per chat turn (entitlement → safety → retrieve → assemble → stream → persist) and no orchestration graph needed at this scope. The build-order analysis is the most load-bearing finding for phasing: platform work is a hard, non-parallelizable Phase 0 gate; knowledge/runtime/billing/marketplace can build in genuine parallel *only* if day-one contracts (`searchKnowledge`, wallet/entitlement shape, `buildPrompt`, `personaToSystemPrompt`) are frozen before Phase 1 starts; the builder sandbox is a forced convergence point (needs real knowledge + real runtime, not stubs); and billing⟷runtime⟷marketplace is a three-party contract that must be nailed down before all three build against it.

**Major components:**
1. **Knowledge** — now interview-first: an interviewer agent (new, unresearched; typed-only for MVP) turns Q&A into chunks and drafts the persona form; document upload (parse/chunk/embed, already researched) is the secondary path for chunks; both feed the same `chunks` table and `hybrid_search()`.
2. **Runtime** — the single `/api/chat` route, shared by mode-flag (not URL) between sandbox and hirer chat; now also owns the in-chat hirer file upload (extract-and-inject, no embedding) and the per-conversation transcript-share flag.
3. **Billing** — no longer Stripe integration; now a single platform-wide credit-wallet ledger (`lib/llm` logs actual token cost per metered action, both building and using; applies the expert's rate multiplier on usage; splits the margin between the platform's take and the expert's wallet credit) plus mock subscription/credit-pack buttons that grant credits, and a mock cash-out flow that debits the wallet and records a payout row.
4. **Marketplace** — discovery, listing, hire/subscribe CTA; unchanged in shape, but now surfaces the three new seed categories (health/fitness/PT, tax/personal finance, career/college admissions).

**Three architecture gaps to resolve explicitly, not silently inherit:**
1. **Service-role retrieval bypasses RLS.** `/api/chat` and `/api/ingest` use the service-role key, so tenant isolation for the retrieval path is enforced *only* by the `agent_id` argument inside `hybrid_search()`'s SQL — not by any Postgres policy. This needs a dedicated cross-tenant test (query agent A, assert zero chunks from agent B), not just a functional test, since RLS is not a safety net here.
2. **The old per-agent free-trial-counter bug is moot, but its underlying gaming vector isn't.** The originally-reviewed design's specific flaw (a `free_messages_used` counter on the `conversations` row, reset by starting a new conversation) no longer applies — there's no per-agent trial or allowance left to scope. But the same abuse pattern survives in a new form: the monthly free credit grant that replaces the free trial is still an account-level entitlement, and a single global wallet does nothing to stop a hirer from creating throwaway accounts to re-claim that grant repeatedly (this is exactly Pitfall 6, now attached to the wallet's free grant instead of a per-agent counter). The entitlement check itself is simpler now (one wallet-balance comparison, no per-agent scoping), but the free-grant-abuse risk should be named as a known, accepted MVP gap — not assumed solved because the schema got simpler.
3. **Model selection is per-category, set by the platform — not a per-agent expert-facing picker.** STACK.md's "quality tier" language (Opus 5.5 as an "optional per-agent upgrade") reads as expert-choosable; that reading is now explicitly rejected. The model (and therefore the raw cost the multiplier is applied to) is fixed by the platform per category, likely with safety-relevant categories (health, tax/finance) pinned to a specific model tier. This should be a Phase 0 config table, not a builder-form field.

### Critical Pitfalls

Full list is nine; the following are the highest-severity and most novel given the scope changes:

1. **Confident answers when the agent shouldn't know** — pass retrieval scores into the prompt with an explicit abstention rule; test with an adversarial *out-of-scope* question set per agent, not just in-scope ones.
2. **Citations point at a real chunk that doesn't actually support the claim** — spot-check, don't just verify a citation renders; a mis-cited claim under a named expert's persona reads as their professional judgment, not an anonymous bot error.
3. **Jailbreaks strip the safety disclaimer mid-conversation** — the disclaimer/hard-stop must be re-affirmed every message, not injected once on turn one; this is now concretely relevant to the health/fitness/PT and tax/personal finance seed categories.
4. **Revenue-share opacity erodes expert trust** — this now applies to the single wallet's earnings breakdown, not a Stripe fee line or a per-agent ledger: the wallet/earnings view must show, per conversation where the expert's agent was used, gross (raw cost × multiplier) → platform's margin take → amount credited to the expert's wallet, using real ledger rows, or it reproduces the GPT Store failure mode at MVP scale.
5. **A new, unreviewed risk given the scope change:** the hirer's in-chat file upload (resume/tax form) is a new untrusted-input path the original document-injection framing (Pitfall 5, "delimit retrieved content, treat it as data not instructions") was written for expert-authored knowledge-base content only. It should extend explicitly to this new path before it ships.

## Implications for Roadmap

### Phase 0: Platform Foundation & Frozen Contracts
**Rationale:** Architecture research is explicit that this cannot be parallelized and blocks every other phase, even in stub form.
**Delivers:** Repo/CI, Supabase schema + RLS + first migration, auth pages, app shell, `lib/llm` wrapper (now must support **real** token-cost logging for both building and using actions from day one, not added later), and every day-one contract stubbed: `searchKnowledge`, wallet/entitlement shape (a single balance check, not a per-agent `canChat`), `buildPrompt`, `personaToSystemPrompt`, plus the new per-category model-assignment config.
**Avoids:** Contract drift across the three-party billing⟷runtime⟷marketplace integration in Phase 2 (per ARCHITECTURE.md, freezing this contract is a Phase 0 exit criterion, not a Phase 2 task).

### Phase 1: Parallel Core (Interview, Runtime, Wallet, Marketplace)
**Rationale:** Four workstreams build genuinely in parallel against Phase 0's stubs, per the build-order dependency graph.
**Delivers:**
- **Knowledge:** the interview engine (interviewer agent, answer→chunk pipeline, persona draft) as the primary intake path; document upload/parse/chunk/embed as the secondary path; hybrid search.
- **Runtime:** the fixed `/api/chat` pipeline (entitlement → safety → retrieve → assemble → stream → persist), the in-chat hirer file-upload-and-inject feature, and the per-conversation transcript-share opt-in flag.
- **Billing:** a single platform-wide credit wallet per account; real per-metered-action usage logging (interview turns and document embedding at raw LLM cost when building; chat messages at raw LLM cost × expert rate multiplier when in use); mock monthly-subscription and credit-pack buttons that grant credits; wallet credit on the expert side when their agent is used; mock cash-out request flow; entitlement is a single wallet-balance check.
- **Marketplace:** browse/filter by the three seed categories, credibility card, listing pages.
**Addresses:** table-stakes builder/runtime/marketplace features from FEATURES.md; avoids Pitfalls 1, 2, 3, 5, and reframes the free-trial-abuse gaming vector (Pitfall 6) around the monthly free credit grant instead of a per-agent counter.
**Convergence checkpoint (not a separate phase):** the builder sandbox cannot be "done" until knowledge (real interview output) and runtime (real chat) both exist — treat "sandbox works end-to-end" as an explicit milestone inside this phase, not bundled into either workstream's definition of done.

### Phase 2: Integration — Publish, Fund Wallet (Mock), Hire, Earn
**Rationale:** This is the three-party contract (billing ⟷ runtime ⟷ marketplace) plus the one-directional publish → listing-live path; both require Phase 1's real components, not stubs.
**Delivers:** publish flow (with the ToS/content-ownership consent checkbox added), marketplace listing goes live, mock subscription/credit-pack purchase buttons wired to the wallet, paywall/build-gate enforcement at the wallet-balance boundary (for both building and chatting), expert wallet/earnings view showing gross → platform margin take → wallet credit per conversation, mock cash-out flow, expert transcript view respecting the per-conversation share opt-in (full transcript vs. aggregate-only).
**Uses:** the frozen wallet/entitlement contract from Phase 0; the `ledger`/`llm_usage` tables from Phase 1's billing work.
**Implements:** mocked-payment equivalent of Pattern 3 (server action inserts subscription/credit-pack rows directly — no webhook), Pattern 2 (shared chat route mode-flagged by data).

### Phase 3: Trust, Safety & Launch Hardening
**Rationale:** PITFALLS.md is explicit that these are cheap to prevent and catastrophic to skip, and none of them are exercised by happy-path building.
**Delivers:** adversarial out-of-scope + jailbreak eval passes per seed category (weighted toward health/fitness/PT and tax/personal finance as the regulated ones), citation spot-checks, streaming error handling (`onError` + retry, not silent failure), seed data with realistic ratings/credentials for all three seed categories (not zero-review listings), the "contact the expert" CTA and "flag this agent" button added to the chat UI, admin unpublish tooling wired to the flag queue, and an explicit end-to-end verification of the wallet's metering math on *both* sides — build-time (interview turns, embedding at raw cost) and use-time (raw cost × multiplier, margin split) — since this is new and otherwise untested outside unit tests.
**Addresses:** Pitfalls 1, 2, 3, 4, 8, 9 verification; the three missing table-stakes UI items from FEATURES.md.

### Phase Ordering Rationale

- Phase 0 must be a hard gate because every stubbed contract (especially the wallet/entitlement shape, which now covers both building and using rather than a boolean `canChat`) has to be agreed before four people build against it in parallel.
- Interview-first knowledge intake doesn't change the phase *order* versus the original architecture research — it changes what's inside the "knowledge" workstream's Phase 1 box, since it's a new write path alongside (not instead of) the existing ingest pipeline, and it now also produces the persona draft.
- Removing Stripe removes an entire external-integration-risk category (Connect onboarding, refunds, webhook idempotency) from Phase 2, but replaces it with a metering-correctness risk that's larger than before — the wallet now funds building as well as using, so a metering bug could let an expert build for free or misprice a hire, and there's no equivalent "well-documented pattern" to lean on. This is why Phase 3 explicitly re-verifies both sides of the metering math rather than assuming Phase 1's billing work is correct once merged.
- Trust/safety hardening is sequenced last because it depends on every other phase's real output (real agents, real conversations, real ledger rows) to test against meaningfully — but it is not optional polish; PITFALLS.md frames several of these as "never skip," not "nice to have."

### Research Flags

Needs research during planning:
- **Phase 1, knowledge/interview engine** — interview UX, turn-taking strategy, and answer-to-chunk segmentation are explicitly unresearched (typed-only for MVP); this is the single biggest open design question in the whole roadmap and should get a dedicated research pass before implementation starts.
- **Phase 1/2, billing/wallet model** — the mechanism is now specified (single wallet, credits fund both building and using, platform takes a share of the usage margin) but the exact take percentage on the margin is unconfirmed, and it's untested whether the monthly free credit grant is large enough for a brand-new expert with a $0 balance to complete a full interview-based build. Confirm both with the user before freezing the Phase 0 wallet contract.
- **Phase 1, hirer in-chat file upload** — needs a threat-model pass extending Pitfall 5's "content is data, not instructions" framing to hirer-supplied files, since this wasn't anticipated by the original pitfalls research.

Standard patterns (skip research-phase):
- **Phase 0** — platform scaffolding, RLS, auth: well-documented Supabase/Next.js patterns.
- **Phase 1/3, chat runtime** — fixed RAG pipeline and its pitfalls are thoroughly documented; execute the known mitigations rather than re-researching.
- **Phase 1/2, marketplace/discovery** — category browse + credibility card is a standard, well-precedented pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH, with a carve-out | Verified against official docs/pricing same day; the Stripe-related rows are now moot given mocked payments, but everything else (Next.js/Supabase/AI SDK/Claude/Voyage) stands. |
| Features | MEDIUM-HIGH, with a carve-out | Cross-checked 2+ sources per comparable; the pricing-model findings assumed per-conversation Stripe unlocks and are now superseded by a single-wallet credit model in which credits fund building as well as using — no comparable reviewed (Delphi, Coachvox, Poe) charges the creator's own balance for building their own agent, so this piece of the model has no external validation and should be treated as a genuine unknown, not a reframed known pattern. |
| Architecture | HIGH for reviewed components, LOW for new ones | Sanity-checked an already-designed system for the document-upload/Stripe scope; the interview engine, persona-drafting, and in-chat hirer upload are new components this review never saw, so treat those as unreviewed until Phase 1 planning. |
| Pitfalls | MEDIUM | Self-rated MEDIUM by its own research; the Stripe-specific technical-debt item is now moot, and two new risks (untrusted hirer-uploaded files; end-to-end wallet-metering correctness on both the build side and the use side) aren't covered and should be added at plan time. |

**Overall confidence:** MEDIUM-HIGH — the core stack/architecture/feature findings are solid, but the two biggest scope decisions made after research (mocked-payments-with-a-real-wallet, interview-first intake that also drafts the persona) each introduce a component none of the four files evaluated in detail.

### Gaps to Address

- **Interview UX is undesigned.** No comparable reviewed (Delphi, Coachvox, Gemini Gems) uses an interview model — all are document/media-upload-first. This needs its own research pass at plan time, not a pattern lift from FEATURES.md.
- **Take percentage on the margin is unconfirmed.** The wallet mechanism is now specified (platform keeps raw cost plus a share of the multiplier margin; the rest credits the expert's wallet), but the exact percentage isn't set. The take-rate flag above (20% vs. the 15% market anchor) likely applies here — confirm the number before freezing the Phase 0 wallet contract, since billing/runtime/marketplace all build against it in parallel in Phase 1.
- **Free monthly credit-grant size vs. build cost is unverified.** Since credits now fund building (interview turns + embedding) as well as using, a brand-new expert's starting wallet (from the monthly free grant) needs to comfortably cover a full interview-based build. This should be sized and tested in Phase 0/1, not assumed — if it's too small, either the grant needs raising or experts need a way to build before they have a positive balance.
- **Transcript-share default aggregate view is undesigned.** The architecture reviewed didn't include a concept of "aggregate-only expert view" (topics/counts without transcript text) — this needs a data-model decision in Phase 1, not just a UI toggle.
- **Hirer-uploaded-file threat model is unreviewed.** Extend Pitfall 5's untrusted-content framing explicitly to this new path before it ships, since the original pitfalls research assumed only expert-authored content entered the system.
- **Seed-category-specific disclaimer scoping.** Confirm which of the three seed categories (health/fitness/PT, tax/personal finance, career/college admissions) require the hard-stop/disclaimer treatment researched for "legal/medical/financial" categories — health and tax clearly qualify; career/college coaching likely needs a lighter touch, but this should be an explicit Phase 0 config decision, not an assumption.

## Sources

### Primary (HIGH confidence)
- Next.js 16.3 release notes, Vercel AI SDK 7 announcement/docs, Anthropic pricing docs, Voyage AI pricing, Supabase SSR/RLS/hybrid-search docs — full URLs in STACK.md and ARCHITECTURE.md
- Stripe destination-charges and Connect docs — retained for architectural pattern reference only; **not applicable to MVP scope**, since payments are fully mocked
- GitHub vercel/ai#4726 (streaming errors fail silently) — primary-source bug report against the exact library in this stack

### Secondary (MEDIUM confidence)
- Delphi.ai, Coachvox, GPT Store, Poe, Gemini Gems, Character.AI, Clarity.fm, MentorCruise comparable-product analysis — full citations in FEATURES.md
- RAG hallucination/citation-accuracy research (arXiv:2601.05866, GrowwStacks, Red Gate) and GPT Store revenue-share failure analysis — full citations in PITFALLS.md
- Multi-tenant RAG + pgvector RLS pattern writeups (TigerData, The Nile, kawshik.dev) — full citations in ARCHITECTURE.md

### Tertiary (LOW confidence)
- Individual review-site sources (creatoreconomytools.com on Delphi paywall UX, tooldirectory.ai) — directionally useful, single-source, not independently verified

---
*Research completed: 2026-09-26*
*Ready for roadmap: yes — with the research flags above resolved during Phase 1 planning, not before roadmap creation*
