# Expert Agent Platform (working name)

## What This Is

A platform where people with real-world expertise turn what they know into an AI agent and get paid when other people use it. An expert builds their agent mainly by being **interviewed** by the platform (an interviewer agent asks open-ended questions and every answer becomes knowledge), optionally uploads documents, tests it, and publishes it to a marketplace. Anyone can find an agent, chat with it, and upload their own file for it to work on. One **credit wallet** per account pays for building and using agents; experts earn credits when their agent is used and can spend them or cash them out.

The MVP is one working loop: **BUILD → PUBLISH → HIRE → USE.**

## Core Value

An expert with no audience and no technical skill can put their knowledge into an agent that answers in their words, grounded only in what they actually said and wrote, and earn from it. If everything else fails, an answer must still cite the expert's own material and say "I don't know" when it isn't there.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Build**
- [ ] Expert creates an agent by answering an interviewer agent's open-ended, adaptive questions (typed); every answer is stored as retrievable knowledge
- [ ] Expert can pause and resume the interview; can see and edit what has been captured
- [ ] The interview drafts the agent's persona (name, headline, how it works, always/never); expert edits a short form
- [ ] Expert can optionally upload PDF / DOCX / TXT / MD or paste text; it is chunked, embedded, and retrievable alongside interview answers
- [ ] Expert can test the agent in a sandbox and see which knowledge was retrieved for each answer
- [ ] Expert sets a rate multiplier (1x–5x on raw LLM cost) and publishes instantly; can unpublish instantly

**Publish / Marketplace**
- [ ] Published agent has a listing generated from persona + expert profile: headline, description, credentials (self-reported), example questions, rating, price signal, category disclaimer
- [ ] Hirer can browse by category, sort, and text-search published agents
- [ ] Hirer can rate an agent after using it
- [ ] Anyone can flag an agent; admin can unpublish it

**Use**
- [ ] Hirer chats with an agent; answers stream, are grounded in that agent's knowledge only, and cite the source (interview answer or document + page)
- [ ] Agent says it doesn't have the answer and points to the expert's contact link when retrieval is weak
- [ ] Hirer can upload one file in a conversation (resume, essay, tax form); its text is used in that conversation's prompt
- [ ] Regulated categories (legal, medical, financial, mental health) show a fixed disclaimer; emergency / self-harm patterns get a resource reply instead of an agent answer
- [ ] Hirer can opt in, per conversation, to share the transcript with the expert; otherwise the expert sees aggregates only (top questions, thumbs-down)
- [ ] Hirer can thumbs up / down any answer

**Credits (purchases mocked, metering real)**
- [ ] One wallet per account; 1 credit = 1 cent
- [ ] Every metered LLM call (interview turn, embedding, chat message) deducts its real cost from the caller's wallet after it completes
- [ ] A chat message charges the hirer raw cost × the expert's rate multiplier; the platform keeps raw cost plus a configurable share of the margin; the expert's wallet receives the rest
- [ ] Wallet is funded by a mock monthly platform subscription (grants N credits), mock credit packs, and a configurable free grant for new accounts
- [ ] Before any metered call the platform checks the wallet covers a typical call; otherwise it shows a top-up prompt
- [ ] Every charge and credit is a ledger row; the expert's earnings page shows per-conversation gross / platform share / net
- [ ] Expert can request a mock cash-out: credits deducted, payout row recorded at 1 cent per credit

**Platform**
- [ ] Email + Google sign-in; one account can both build and hire
- [ ] Expert profile: name, photo, field, credentials, years, contact link; consent checkbox (content ownership, service license) at first publish
- [ ] Row-level security on every table; retrieval always filtered by agent server-side with a cross-tenant test
- [ ] Every LLM call logged (tokens, model, cost, latency); daily spend cap

### Out of Scope

- **Real payment rails (Stripe, payouts, KYC)** — purchases and cash-out are mock buttons that write rows; the metering and ledger are real so rails can be attached later
- **Voice interview** — typed first; voice (speech-to-text) is the first post-MVP addition and the interview is designed so either input feeds the same pipeline
- **Voice / video / avatar clones** — Delphi's most expensive feature; not the value here
- **Visual workflow / graph builder, tools, web access for agents** — the visual-builder tier collapsed in 2026 (OpenAI Agent Builder, Flowise, Vellum); our agent is persona + knowledge + fixed pipeline
- **Admin approval before publish** — publishing is instant so the loop has no human gate; add a review queue when strangers start publishing
- **Credential / identity verification, "Licensed" badge** — self-reported with a label in MVP; verification is the first trust feature after
- **Teams, SSO, audit logs, mobile apps, fine-tuning, second LLM provider** — not needed for the loop
- **Per-agent subscriptions or allowances, per-agent free trials** — replaced by the single wallet and a free grant
- **Exact pricing numbers (grant size, subscription tiers, take rate)** — configurable constants; decided after the loop works

## Context

- **Competition:** Applied AI & Automation is the confirmed track. Open Venture and The Art of the Break are the team's current, tentative challenge choices. See `docs/TRACKS-AND-AWARDS.md` for the supplied event information and `docs/BUILDFEST-STRATEGY.md` for the entry plan, proposed stress test, and two-minute video.
- **Submission timing needs clarification:** the supplied event brief says Sunday at 11 AM, live finalist demos 1–3 PM, and asynchronous challenge results September 30, 2026. This conflicts with the four-week build assumption below; confirm the weekend prototype milestone before using that schedule for the competition.
- **Team and timeline:** four collaborators (tylersue, AustinHan07, jonathankwon, 22joshlee) at Badger Build Fest 2026, four weeks part-time, kickoff 2026-09-26.
- **Existing artifacts in the repo:** `docs/PRD.md`, `docs/MVP-SCOPE.md`, `docs/HOW-AGENTS-WORK.md`, `docs/ARCHITECTURE.md`, `docs/WORKSTREAMS.md`, `docs/ROADMAP.md`, `docs/RESEARCH.md`, `docs/DEMO.md`, `CONTRIBUTING.md`, GitHub labels/milestone/36 issues. These predate the interview-first and unified-credit decisions and need a reconciliation pass (tracked in Key Decisions).
- **Research (`.planning/research/`):** LangSmith Fleet is the reference for "describe it in chat, get a config, test, publish" and for metering build and run from one allowance; its unit (LCU) is criticized as opaque, so ours is cents. Delphi is the closest marketplace analogue (subscriptions to one expert, 15% take, ID verification, citations) but assumes the creator brings an audience. GPT Store, Poe, Character.AI show that opaque or per-message-only monetization fails creators. No comparable product uses an interview as the primary knowledge source; that is our differentiator and needs its own research at plan time.
- **Known design gaps from research:** service-role retrieval bypasses RLS so the agent filter needs a dedicated cross-tenant test; the model is set by the platform per category, not by the expert; ToS consent, contact-the-expert CTA, and flag button must be explicit requirements (done above).

## Constraints

- **Timeline**: 4 weeks to a working MVP — the loop must walk end-to-end (ugly) by week 2
- **Team**: 4 people in parallel — one owner per folder, day-one stubbed contracts, the AI core never on one person
- **Tech stack**: Next.js 16 single app, Supabase (Postgres + pgvector + Auth + Storage, RLS everywhere), Vercel AI SDK 7 + Anthropic Claude, Voyage embeddings, Vercel — decided and verified 2026-09-26; no Python service, no monorepo tooling, no LangGraph
- **Budget**: LLM spend capped per day via env; cheapest capable model by default (Sonnet 5), set per category by the platform
- **Money**: no real payment rails in the MVP; all purchases and cash-outs are mocked, all metering is real
- **Safety**: regulated-category disclaimers and hard stops are non-negotiable and cannot be removed by the expert

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Enter Applied AI & Automation | Interview-driven expert agents and automated grounded assistance fit the selected track | Confirmed by team 2026-09-26 |
| Consider Art of the Break plus Open Venture | Stress-test the core grounding promise and show the marketplace's venture potential | Current team preference; entry pending |
| MVP = the loop BUILD → PUBLISH → HIRE → USE; nothing off that path ships | Four people, four weeks | — Pending |
| Interview is the primary knowledge source; documents optional | Experts have tacit knowledge that isn't in any document; no competitor does this; GSD-style questioning is the model | — Pending |
| Interview drafts the persona; expert edits a short form | Fewer forms, same answers reused | — Pending |
| Typed interview first, voice later | Functionality first; both must feed the same pipeline | — Pending |
| One platform-wide credit wallet, 1 credit = 1 cent, spent on building and using, earned by experts | LangSmith meters build + run from one allowance; Poe's cost-plus points; transparency fixes LCU's opacity | — Pending |
| Building deducts raw LLM cost, no markup | One meter for everything; experts learn run cost; platform has a lever against huge uploads | — Pending |
| Usage charge = raw cost × expert multiplier; platform keeps raw cost + configurable margin share (default 15%) | 15% is the market anchor (Delphi, Clarity, Salesforce); exact number deferred | — Pending |
| Purchases and cash-out mocked; metering and ledger real | No real money in MVP, but the loop must prove earnings | — Pending |
| Free grant for new accounts replaces per-agent trials | One entitlement check; grant size is a constant to tune later | — Pending |
| Hirer file upload in chat is P0, minimum functional (extract text → prompt) | Career, tax, and PT agents need the hirer's document; no embedding needed | — Pending |
| Transcript sharing is hirer opt-in per conversation | Privacy default; expert still gets aggregates | — Pending |
| Instant publish, no admin gate; admin can unpublish | No human in the loop; review queue when strangers arrive | — Pending |
| Seed categories: health/PT, tax/finance, career/admissions | Team has real material in these | — Pending |
| Model set by platform per category, not by expert | Resolves "no model picker" vs `agents.model` ambiguity | — Pending |
| Reconcile `docs/` and the 36 GitHub issues to these decisions after the roadmap exists | Issues should map to phases | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-26 after recording the BuildFest track, tentative challenge pair, awards, and deadline conflict*
