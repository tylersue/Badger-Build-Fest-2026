# Stack Research

**Domain:** Expert-agent marketplace (RAG-grounded AI chat agents, built by experts from their own documents, published, and hired/chatted by paying users)
**Researched:** 2026-09-26 (decision already made and verified against current sources same day; this file documents and formalizes it for roadmap use — see `docs/ARCHITECTURE.md` §1 and `docs/RESEARCH.md` §3 for the original decision record)
**Confidence:** HIGH overall (verified against official docs/pricing pages same day); a few new-library specifics called out below are MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.3.x (App Router, Turbopack default, React 19.2) | Full-stack app: UI + API route handlers + Server Actions in one deploy | One deploy for a 4-person/4-week team beats a separate frontend+backend. Turbopack is default and stable at this version. **Note:** `middleware.ts` is renamed `proxy.ts` in Next 16 — using the old filename silently breaks Supabase session refresh. HIGH confidence. |
| TypeScript | strict mode | Type safety across app, Server Actions, and shared `lib/` contracts | Shared types (`RetrievedChunk`, `AgentConfig`, `Entitlement`) are the day-one contract between the four workstreams; strict mode catches drift early. HIGH confidence. |
| pnpm | 11.x, pinned via `packageManager` field | Package manager | pnpm 12 (Rust rewrite) shipped Aug 2026 and is only weeks old — pin 11 to avoid being an early adopter mid-hackathon. HIGH confidence. |
| Supabase (Postgres + pgvector + Auth + Storage) | Postgres w/ pgvector (HNSW index), `@supabase/ssr` for Auth | Database, vector store, auth, and file storage in one bill | One vendor, one bill, Row-Level Security (RLS) shared across all four (agents, chunks, purchases, ledger) instead of stitching together a separate vector DB + separate auth. RLS uses the same JWT everywhere. HIGH confidence. |
| Vercel AI SDK | 7.0.x (`ai@7`, released June 2026) | Agent runtime: `streamText`, `ToolLoopAgent`, `Output.object`, `useChat` | Gives streaming chat UI, native Claude tool calling, and structured output for free instead of hand-rolling a stream parser. HIGH confidence on capability; MEDIUM on specifics — it's ~3 months old at research time, so LLM-generated code snippets (including this agent's own training data) default to v4/v5 APIs (`generateObject` instead of `Output.object`). Always check the v7 docs, not memory. |
| Anthropic Claude (via `@ai-sdk/anthropic`) | Default: `claude-sonnet-5` ($2/$10 per MTok, 1M context). Quality tier: `claude-opus-5-5` ($4/$20, released Sept 22 2026). Utility calls: `claude-haiku-4-5-20251001` ($1/$5) | LLM for agent chat responses and cheap utility tasks (titles, tagging) | Sonnet 5 is the cost/quality default for per-message chat; Opus 5.5 is an optional per-agent upgrade; Haiku 4.5 handles high-volume low-stakes calls cheaply. Prompt caching (reads ≈5% of input price) makes a byte-stable system prompt worth the discipline. HIGH confidence — pricing verified same day. |
| Voyage AI embeddings | `voyage-4-lite`, 1024-d, 32K context, $0.02/MTok, 200M free tokens | Document and query embeddings for RAG retrieval | Anthropic's recommended embeddings partner; the free allowance covers the whole MVP's ingestion + query volume. Fixed at 1024-d — this dimension must be set once in the `chunks.embedding` column and never changed mid-project. HIGH confidence. |
| Stripe (Checkout + Connect Express) | Current API, destination charges w/ `application_fee_amount` | Payments: hirer checkout + expert payouts | Stripe owns KYC and payout compliance so the team doesn't build it. Destination charges let the platform take a cut (`application_fee_amount`, 20% in MVP) in one transaction. Pricing: 2.9%+30¢/charge, $2/mo per active Express account, 0.25%+25¢/payout. HIGH confidence. |
| Vercel (hosting) | Fluid compute default; Hobby functions cap at 300s, Pro at 800s | Deployment + preview environments | Preview-per-PR deploy is the de facto CI build check. The 300s Hobby cap is a hard architectural constraint on ingestion (must chunk large PDFs across multiple invocations). HIGH confidence. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | v4 | Styling | Always — paired with shadcn/ui, avoids CSS architecture debates across 4 workstream owners. |
| shadcn/ui | current (copy-in, not an npm dependency in the traditional sense) | Forms, dialogs, tables, UI primitives | Always for shared UI. `components/ui/` is add-only — never hand-edit a shadcn component inside a feature PR, only add new ones. |
| `unpdf` | current | PDF text extraction, per-page | Ingestion of uploaded PDF sources. Pure JS/pdf.js, no native deps, so it runs on Vercel's serverless runtime without a custom build step. |
| `mammoth` | current | DOCX text extraction | Ingestion of uploaded DOCX sources. |
| Jina Reader (`r.jina.ai/<url>`) | hosted, free, keyless | URL-to-markdown conversion | Only if/when single-URL ingestion is in scope (MVP scope currently marks URL crawl as P1 — confirm against `docs/MVP-SCOPE.md` before building). |
| `@supabase/ssr` | current | Cookie-based Supabase sessions in Server Components and route handlers | Always — required for `getClaims()`/`getUser()` server-side auth pattern (see Pitfalls). |
| `@ai-sdk/anthropic` | matches `ai@7` | Anthropic provider for Vercel AI SDK | Always — the only path all chat/completions traffic should go through (`lib/llm/index.ts` wraps it for usage logging + spend cap). |
| zod | current | Env var validation (`lib/env.ts`) | Always — validates `PAYMENTS_MODE`, `LLM_DAILY_SPEND_CAP_USD`, and secrets at boot rather than failing at runtime. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| GitHub Actions | CI: lint + typecheck on PR | Vercel preview deploy is the de facto build/integration check; GitHub Actions only needs to run fast checks (lint, `tsc --noEmit`). |
| Supabase CLI | Local dev, migrations, `pnpm db:types` | Timestamped SQL migration per PR; regenerate `lib/db.types.ts` once per migration PR to avoid merge conflicts across 4 people. |
| `stripe listen` (Stripe CLI) | Local webhook testing | Required to test `checkout.session.completed` locally before relying on a deployed webhook endpoint. |

## Installation

```bash
# Core
pnpm add next@16 react@19 react-dom@19 ai@7 @ai-sdk/anthropic @supabase/supabase-js @supabase/ssr stripe

# Supporting
pnpm add unpdf mammoth zod tailwindcss@4

# Dev dependencies
pnpm add -D typescript @types/react @types/node supabase
```

Note: shadcn/ui components are added individually via its CLI (`pnpm dlx shadcn@latest add <component>`), not as one bulk dependency — this is intentional (copy-in, not vendored).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Next.js route handlers + Server Actions (one deploy) | Separate Python/FastAPI service | Only if a teammate needs a Python-only library with no JS equivalent. Vercel's Python runtime is still Beta and adds CORS + JWT-forwarding overhead — not worth it for RAG steps that are a few dozen lines of TypeScript. |
| Folder-owned monorepo (no tooling) | Turborepo / pnpm workspaces | Once a second deployable app appears (mobile client, background worker) — config overhead isn't justified for one deployable. |
| Vercel AI SDK 7 `streamText` (single-agent RAG loop) | LangGraph JS (1.4.x, stable) | Once agents need multi-step workflows or tools calling other tools — natural upgrade path, but a graph abstraction is overkill for single-agent RAG chat today. |
| Numbered `[n]` citations parsed by the UI | Anthropic `search_result` blocks (exact-quote citations) | If exact-quote citations become a P0 requirement. Today this requires calling the Anthropic SDK directly for the answer step (bypassing AI SDK 7), since AI SDK 7 doesn't yet expose it — the citations PR was still open when checked (github.com/vercel/ai/pull/16740). MEDIUM confidence this stays true; check the PR status before committing to the workaround. |
| Supabase Postgres + pgvector | Dedicated vector DB (e.g., Pinecone) | Only past millions of chunks — pgvector with HNSW is fine at MVP/early-scale and keeps RLS working against the same auth. |
| Route-handler ingestion (synchronous, then fire-and-forget with polling) | Supabase automatic embeddings (pgmq + pg_net + pg_cron + Edge Function) | Once ingestion volume/latency outgrows Vercel's 300s function limit — it's real and documented, but four extra moving parts aren't worth it for MVP scale. |
| `unpdf` / `mammoth` | LlamaParse | Only if a demo expert's PDFs are scanned or table-heavy enough that plain text extraction produces garbage chunks. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `middleware.ts` | Renamed to `proxy.ts` in Next.js 16 — the old filename means Supabase sessions silently never refresh, with no error. | `proxy.ts` |
| `getSession()` server-side | Reads an unverified cookie value; not safe for authorization decisions server-side. | `getClaims()` / `getUser()` |
| pnpm 12 | Rust rewrite shipped only weeks before this research date — too new to trust mid-hackathon. | pnpm 11, pinned via `packageManager` |
| Claude Agent SDK | This is the Claude Code harness (filesystem, bash, subprocess access) — not built for a serverless per-message chat persona. | `@ai-sdk/anthropic` via Vercel AI SDK 7 |
| Claude Managed Agents | Built for long-running autonomous sessions with sandboxes ($0.08/active session-hour); wrong billing/lifecycle model for stateless per-message chat. | Same as above — revisit only if "hire an agent for a multi-hour task" becomes an actual feature. |
| A second deployable / custom auth | Both are explicit anti-goals for this MVP (per `docs/ARCHITECTURE.md` pitfall #10) — they add operational surface a 4-person team can't afford in 4 weeks. | One Next.js deploy; Supabase Auth |
| `generateObject` (AI SDK v4/v5 pattern) | AI SDK 7 replaces this with `Output.object`; most LLM-generated snippets (including this agent's training data) still target the old API and will silently misuse the runtime. | `Output.object` per the v7 docs |
| Storing uploads in git | No enforced size limit, bloats repo history, no signed-URL access control. | Supabase Storage private bucket with signed uploads (50 MB/file cap in MVP) |

## Stack Patterns by Variant

**If demo/dev environment (no live payments needed):**
- Use `PAYMENTS_MODE=mock` — a server action inserts a `paid` purchase row + two ledger rows directly, skipping Stripe entirely.
- Because the demo must never depend on a live webhook firing correctly during a 4-minute live run.

**If production-like / real payments:**
- Use `PAYMENTS_MODE=stripe` — real Checkout session, destination charge, webhook-driven unlock, idempotent by `stripe_checkout_id`.
- Because entitlements must never be computed client-side, and this is the only path that actually pays experts.

**If ingesting a large PDF (near or over Vercel's 300s cap):**
- Use the self-reinvoking pattern: process N pages per request, update `sources.status`, re-invoke `/api/ingest` for the remainder.
- Because Vercel Hobby functions hard-stop at 300s and there's no queue in MVP scope.

**If a corpus is tiny (< ~150K tokens):**
- Consider the zero-RAG shortcut: put the whole corpus in the cached system prompt instead of chunking/embedding.
- Because it's less code, but cost scales with corpus size — treat as a fallback mode for small demo agents, not the default path.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.3.x` | `react@19.2`, Turbopack (default) | Turbopack is the default bundler at this version, not opt-in. |
| `ai@7.0.x` | `@ai-sdk/anthropic` (matching major) | Use v7 docs specifically — the API surface (`Output.object`, `ToolLoopAgent`) differs from v4/v5, which is what most training data and generated snippets assume. |
| `claude-sonnet-5` / `claude-opus-5-5` | Prompt caching | Requires a byte-stable system prompt (no timestamps, no per-request variance) to get cache hits — put the variable user question last, not the system prompt. |
| Voyage `voyage-4-lite` (1024-d) | `chunks.embedding vector(1024)` column | Dimension must be fixed once; changing embedding models later means re-embedding the entire corpus. Create the HNSW index only after the first bulk load, not before. |
| `pnpm@11` | `packageManager` field in `package.json` | Pin explicitly — don't let CI or a teammate's local install silently upgrade to pnpm 12. |
| Supabase free tier | 500 MB DB / 1 GB storage, pauses after 7 idle days | Upgrade to Pro ($25/mo) for the demo month, or keep the project warm with periodic activity. |

## Sources

- Next.js 16.3 release notes: https://nextjs.org/blog/next-16-3 — confirmed `proxy.ts` rename, Turbopack default, React 19.2
- Vercel AI SDK 7 announcement: https://vercel.com/blog/ai-sdk-7 — confirmed `Output.object`, `ToolLoopAgent`, `useChat`
- AI SDK Anthropic provider docs: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- AI SDK RAG chatbot cookbook: https://ai-sdk.dev/cookbook/guides/rag-chatbot
- AI SDK citations PR (open at time of check): https://github.com/vercel/ai/pull/16740 — MEDIUM confidence, re-check status before relying on it being unresolved
- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing — confirmed Sonnet 5 / Opus 5.5 / Haiku 4.5 rates and 1M context
- Anthropic search_result / citations docs: https://platform.claude.com/docs/en/build-with-claude/search-results, https://platform.claude.com/docs/en/build-with-claude/citations
- Anthropic Managed Agents coverage: https://itbrief.news/story/anthropic-launches-claude-managed-agents-in-public-beta — public beta since April 2026, $0.08/active session-hour
- Claude Agent SDK overview: https://platform.claude.com/docs/en/agent-sdk/overview
- Voyage AI pricing: https://docs.voyageai.com/docs/pricing; voyage-4 announcement: https://blog.voyageai.com/2026/01/15/voyage-4/
- Supabase hybrid search guide: https://supabase.com/docs/guides/ai/hybrid-search
- Supabase automatic embeddings: https://supabase.com/docs/guides/ai/automatic-embeddings
- Supabase SSR auth guide: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase free-tier pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Stripe destination charges: https://docs.stripe.com/connect/destination-charges
- Stripe Express accounts: https://docs.stripe.com/connect/express-accounts
- Stripe Connect pricing: https://stripe.com/connect/pricing
- Vercel function duration limits: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel Python/FastAPI runtime status (Beta): https://vercel.com/docs/frameworks/backend/fastapi
- `unpdf`: https://github.com/unjs/unpdf
- LlamaParse pricing: https://developers.llamaindex.ai/llamaparse/general/pricing/
- shadcn/ui + Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- LangGraph JS package: https://www.npmjs.com/package/@langchain/langgraph
- pnpm 11 release: https://pnpm.io/blog/releases/11.0
- Internal decision record: `docs/ARCHITECTURE.md` §1 (stack table + rejected alternatives), `docs/RESEARCH.md` §3 (versions/pricing/sources), `docs/MVP-SCOPE.md` (feature scope the stack must support)

---
*Stack research for: expert-agent marketplace (RAG chat agents, build → publish → hire → use)*
*Researched: 2026-09-26*
