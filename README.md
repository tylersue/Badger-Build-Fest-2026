# Badger Build Fest 2026 — Expert Agent Platform

A platform where people with real-world expertise turn their knowledge into an AI agent, publish it, and get paid when other people use it.

**The MVP is one working loop:**

```
BUILD an agent  →  PUBLISH it  →  HIRE it  →  USE it (chat grounded in the expert's own documents)
```

## Run the MVP

```bash
pnpm install
pnpm dev          # http://localhost:3000 opens straight into the marketplace
pnpm test         # offline unit and integration checks
```

The active builder, marketplace, chat, wallet and usage flows use Supabase and OpenAI for answers, web search, and embeddings. Copy `.env.example` to `.env.local` and configure the server-only values before running the live loop. Use the "Viewing as" card to switch between Maria (expert) and Sam (hirer). Browser storage keeps unsent drafts and the selected demo identity; the database owns published status, conversations and money.

See [Phase 2 service setup](docs/PHASE2-SETUP.md) for migrations, local Supabase, and paid acceptance. [Phase 3 integration](docs/PHASE3-INTEGRATION.md) records the additional SQL, route, wallet and browser gates. The PR remains a draft until those live gates pass.

## Docs

Start here, in this order:

Current product scope and execution phases live in [`.planning/PROJECT.md`](.planning/PROJECT.md), [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md), and [`.planning/ROADMAP.md`](.planning/ROADMAP.md). Older product docs below still need reconciliation with the interview-first and unified-wallet decisions.

| Doc | What it is |
|---|---|
| [docs/TRACKS-AND-AWARDS.md](docs/TRACKS-AND-AWARDS.md) | All three tracks, six optional challenges, award amounts, and judging rules from the supplied event brief |
| [docs/BUILDFEST-STRATEGY.md](docs/BUILDFEST-STRATEGY.md) | Applied AI track, current challenge pair, stress-test experiment, two-minute submission video, and deadline clarification |
| [docs/PRD.md](docs/PRD.md) | Product requirements: problem, users, journeys, requirements with IDs and priorities, trust/safety, success metrics, open questions |
| [docs/MVP-SCOPE.md](docs/MVP-SCOPE.md) | The in/out list for each of the four functions, and what "presentable" means |
| [docs/HOW-AGENTS-WORK.md](docs/HOW-AGENTS-WORK.md) | Plain-language explanation of how an agent is built and run, mapped to LangSmith / LangGraph concepts |
| [docs/DEMO.md](docs/DEMO.md) | Historical four-minute live-demo script; use the BuildFest strategy for the current submission video |
| [docs/RESEARCH.md](docs/RESEARCH.md) | What we learned from LangSmith, Delphi, GPT Store, Poe, and others, and what we're borrowing |
| [docs/CUSTOMER-BRIEF.md](docs/CUSTOMER-BRIEF.md) ([HTML](docs/CUSTOMER-BRIEF.html)) | Two-page version of the customer research: who it's for, beachhead, evidence, competitors, money, what to prove, the pitch |
| [docs/CUSTOMER-RESEARCH.md](docs/CUSTOMER-RESEARCH.md) | Who this is for: expert and hirer ICPs, segmentation, beachhead decision, PMF evidence, unit economics, market sizing, four-week validation plan, campus go-to-market, and the pitch narrative. Raw reports in `.planning/research/customer/` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, system diagram, repo layout with ownership, data model, key flows, shared contracts |
| [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md) | Six workstreams, who owns what, dependency order, how to pick up work |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Four-week plan, exit tests per week, what we cut first |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, PRs, board, migrations, secrets, definition of done |

## Stack (short version)

Current app: Next.js 16 · Tailwind v4 + shadcn/ui · Supabase · Vercel AI SDK + OpenAI · OpenAI embeddings. The hackathon presentation runs locally; mock credits do not use Stripe.

## Team

@tylersue · @AustinHan07 · @jonathankwon · @22joshlee

## Working on it

- Issues carry one workstream label (`builder`, `knowledge`, `runtime`, `marketplace`, `billing`, `platform`) and one priority (`P0`, `P1`, `post-mvp`).
- P0 issues are on the **MVP: build → publish → hire → use** milestone.
- Branch `<workstream>/<thing>`, PR into `main`, one approval, squash-merge.
