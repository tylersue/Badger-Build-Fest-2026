# Badger Build Fest 2026 — Expert Agent Platform

A platform where people with real-world expertise turn their knowledge into an AI agent, publish it, and get paid when other people use it.

**The MVP is one working loop:**

```
BUILD an agent  →  PUBLISH it  →  HIRE it  →  USE it (chat grounded in the expert's own documents)
```

## Docs

Start here, in this order:

| Doc | What it is |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements: problem, users, journeys, requirements with IDs and priorities, trust/safety, success metrics, open questions |
| [docs/MVP-SCOPE.md](docs/MVP-SCOPE.md) | The in/out list for each of the four functions, and what "presentable" means |
| [docs/HOW-AGENTS-WORK.md](docs/HOW-AGENTS-WORK.md) | Plain-language explanation of how an agent is built and run, mapped to LangSmith / LangGraph concepts |
| [docs/DEMO.md](docs/DEMO.md) | The 4-minute, two-laptop demo script we are building toward |
| [docs/RESEARCH.md](docs/RESEARCH.md) | What we learned from LangSmith, Delphi, GPT Store, Poe, and others, and what we're borrowing |
| [docs/CUSTOMER-RESEARCH.md](docs/CUSTOMER-RESEARCH.md) | Who this is for: expert and hirer ICPs, segmentation, beachhead decision, PMF evidence, unit economics, market sizing, four-week validation plan, campus go-to-market, and the pitch narrative. Raw reports in `.planning/research/customer/` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, system diagram, repo layout with ownership, data model, key flows, shared contracts |
| [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md) | Six workstreams, who owns what, dependency order, how to pick up work |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Four-week plan, exit tests per week, what we cut first |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, PRs, board, migrations, secrets, definition of done |

## Stack (short version)

Next.js 16 · Tailwind v4 + shadcn/ui · Supabase (Postgres + pgvector + Auth + Storage) · Vercel AI SDK 7 + Anthropic Claude · Voyage embeddings · Stripe Checkout + Connect · Vercel

## Team

@tylersue · @AustinHan07 · @jonathankwon · @22joshlee

## Working on it

- Issues carry one workstream label (`builder`, `knowledge`, `runtime`, `marketplace`, `billing`, `platform`) and one priority (`P0`, `P1`, `post-mvp`).
- P0 issues are on the **MVP: build → publish → hire → use** milestone.
- Branch `<workstream>/<thing>`, PR into `main`, one approval, squash-merge.
