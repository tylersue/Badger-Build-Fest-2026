# Roadmap

Four weeks, four people, one loop. Dates below are relative to kickoff; the team fills in the demo date in the table at the bottom.

The order is deliberate: **the loop is walkable end-to-end (ugly) by the end of week 2**, then weeks 3–4 make it good and presentable. If week 2 slips, cut from week 3, never from week 2.

## Week 0 — Kickoff (2–3 days)

Goal: everyone can run the app locally and deploy a PR preview.

| Task | Owner | Done when |
|---|---|---|
| Read PRD + MVP scope, agree on open questions 1–2 in PRD §10 | all | Decisions written into the PRD |
| Scaffold repo per [ARCHITECTURE.md](ARCHITECTURE.md) (Next.js, Supabase, shadcn, CI) | platform | `pnpm dev` works on all four machines; preview deploy on a test PR |
| Supabase project + first migration (profiles, agents, documents, chunks, conversations, messages, purchases, ledger) with RLS | platform | `pnpm db:types` generates types; RLS smoke test passes |
| Auth (email + Google) and the app shell (nav, layout, empty states) | platform | Can sign up, sign in, see an empty dashboard |
| Populate the project board with P0 issues from [WORKSTREAMS.md](WORKSTREAMS.md) | all | Every P0 has an owner |

## Week 1 — Walk the loop with stubs

Goal: build → publish → hire → use works end-to-end with the simplest possible version of each step. No polish.

| Workstream | Deliverable |
|---|---|
| builder | Persona form saves to `agents`; system prompt generated from a template; publish toggles status |
| knowledge | Upload → Storage → parse (PDF/TXT/MD) → chunk → embed → `chunks` table. Synchronous is fine this week |
| runtime | `POST /api/chat` streams a Claude response with top-k retrieved chunks in the prompt; messages persisted |
| marketplace | Browse grid reads `published` agents; listing page; "Start chatting" creates a conversation |
| billing | `PAYMENTS_MODE=mock` hire button → `purchases` row → entitlement check in the chat endpoint |

**Week 1 exit test:** one teammate creates an agent from a real PDF, another hires it from a second account and gets a cited answer. Recorded on video.

## Week 2 — Make each step real

| Workstream | Deliverable |
|---|---|
| builder | Sandbox chat with retrieved-sources panel; per-file ingestion status; pricing config; DOCX support |
| knowledge | Citations (doc name + page) returned with every chunk; per-agent limits; async ingestion so the UI doesn't block |
| runtime | Grounding prompt ("say when you don't know"); category disclaimers; hard-stop patterns; usage logging + daily spend cap |
| marketplace | Category filter, sort, search; expert card on listing; free-trial counter and paywall state in the chat UI |
| billing | Stripe Checkout (test mode) + webhook → purchase; ledger entries with 20% fee; earnings page |

**Week 2 exit test:** the full [DEMO.md](DEMO.md) script runs on the deployed URL, unrehearsed, without touching code. Time it.

## Week 3 — Presentable

| Workstream | Deliverable |
|---|---|
| builder | Onboarding copy and hints on the form; drag-drop upload; "Advanced: edit prompt" |
| knowledge | Hybrid search (vector + full-text); "correct this answer" pinned chunks |
| runtime | History windowing; thumbs up/down stored; latency tuning (prompt caching, smaller model for retrieval-heavy turns) |
| marketplace | Landing page; ratings after 5 messages; expert public profile; featured row |
| billing | Stripe Connect Express onboarding for experts (P1) |
| platform | Seed script with 3 real agents; error states; mobile-width pass on the chat and listing pages |

**Week 3 exit test:** five outside people (not the team) each build one agent from their own material with no help. Median time to publish < 15 min. Collect what confused them.

## Week 4 — Harden and rehearse

- Fix everything the outside testers hit.
- Eval: 20 questions per seed agent, check grounded-answer rate ≥ 80%, zero hallucinated citations.
- Admin page (review queue, flagged conversations) if time.
- Run the demo script twice a day. Freeze `main` 48 hours before demo; only bug fixes merge.
- Write the 90-second pitch and the slide with the loop diagram.

## Key dates

| Milestone | Date | Notes |
|---|---|---|
| Kickoff | 2026-09-26 | Docs pushed to `main` |
| Week 1 exit (loop walks) | — | fill in |
| Week 2 exit (demo script runs) | — | fill in |
| Outside-tester session | — | fill in |
| Code freeze | — | demo minus 48h |
| Demo day | — | fill in |

## What we cut first if behind

In this order:

1. Stripe Connect payouts (earnings page is enough for the demo).
2. Hybrid search (plain vector search is fine).
3. Ratings/reviews.
4. Landing page polish (a good browse page can be the landing).
5. DOCX support (PDF + text covers the demo).
6. Async ingestion (synchronous with a spinner is acceptable for a 20-page PDF).

Never cut: citations, the "I don't know" behavior, the paywall, the earnings number. Those four are the pitch.
