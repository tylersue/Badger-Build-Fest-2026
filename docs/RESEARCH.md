# Research

What we looked at before scoping the MVP, and what we're taking from each. Verified against current sources on 2026-09-26. Sections 1 and 2 are being finalized and will land in a follow-up commit; section 3 is complete.

## 1. Agent builders (LangSmith and peers)

*Pending — being written from the builder-platform research report. Will cover LangSmith / LangGraph Platform primitives, LangSmith Agent Builder, OpenAI Agent Builder and GPTs, Gemini Gems, Dify, Flowise, Relevance AI, and the "minimum viable builder" fields.*

See [HOW-AGENTS-WORK.md](HOW-AGENTS-WORK.md) for the LangGraph-to-our-design concept mapping in the meantime.

## 2. Marketplaces and expert monetization

*Pending — being written from the marketplace research report. Will cover Delphi.ai, Coachvox, GPT Store creator revenue, Poe creator monetization, Character.AI, Salesforce AgentExchange, and human-expert marketplaces (Clarity.fm, MentorCruise) as pricing references, plus trust/safety must-haves and what has stalled.*

## 3. Tech stack

Bottom line: one Next.js 16 app on Vercel, Supabase for Postgres + pgvector + Auth + Storage, Vercel AI SDK 7 with the Anthropic provider, Voyage embeddings, Stripe Connect. No Python service, no Turborepo, no LangGraph in the MVP. Full decision table in [ARCHITECTURE.md §1](ARCHITECTURE.md#1-stack).

### 3.1 Current versions and prices (Sept 2026)

| Thing | State |
|---|---|
| Next.js | 16.3.x stable. App Router, Turbopack default, React 19.2. `middleware.ts` renamed to `proxy.ts`. |
| Vercel AI SDK | 7.0.x (released June 2026). `streamText`, `ToolLoopAgent`, `Output.object`, `useChat`. LLM-generated snippets often target v4/v5; use the v7 docs. |
| Anthropic models | Opus 5.5 `claude-opus-5-5` $4 / $20 per MTok (released Sept 22, 2026). Sonnet 5 `claude-sonnet-5` $2 / $10. Haiku 4.5 $1 / $5. 1M context on Sonnet 5 and Opus. Prompt-cache reads ≈ 5% of input price. |
| Anthropic hosted agents | Claude Managed Agents in public beta since April 2026 (tokens + $0.08 per active session-hour), built for long-running autonomous sessions. Not a fit for per-message chat. Claude Agent SDK is the Claude Code harness, also not a fit. |
| Embeddings | Voyage `voyage-4-lite` $0.02 / MTok, 1024-d, 32K context, 200M free tokens. `voyage-4` $0.06 / MTok. OpenAI `text-embedding-3-small` $0.02 / MTok, 1536-d. |
| Supabase | pgvector with HNSW, official hybrid-search (RRF) guide, `@supabase/ssr` with `getClaims()`. Free tier pauses after 7 idle days; Pro is $25/mo. |
| Stripe Connect | Express accounts (or controller properties) + Account Links. Destination charges with `application_fee_amount`. 2.9% + 30¢ per card charge, $2 per monthly-active Express account, 0.25% + 25¢ per payout. |
| Vercel | Fluid compute default. Hobby functions max 300 s, Pro 800 s. Python runtime still Beta. |
| Parsing | `unpdf` (serverless pdf.js), `mammoth` (DOCX), Jina Reader `r.jina.ai/<url>` (free, keyless). LlamaParse only if scanned/table-heavy PDFs show up. |
| pnpm | 11 is the safe pin; 12 (Rust rewrite) shipped Aug 2026. |

### 3.2 Why not the alternatives

- **Separate Python/FastAPI service**: second deploy, CORS, JWT forwarding, and Vercel's Python runtime is Beta. Every RAG step is a few dozen lines of TypeScript.
- **Turborepo / workspaces**: overhead for one deployable. Folder ownership gives the same isolation.
- **LangGraph JS**: stable (1.4.x) but a graph abstraction for single-agent RAG chat is overkill for four people in four weeks. Natural upgrade path later.
- **Plain Anthropic SDK tool loop**: only way today to get native `search_result` citations, but you hand-write streaming and the client hook. Keep as a targeted fallback for the answer step if exact-quote citations become P0.
- **Dedicated vector DB**: another vendor, no RLS. pgvector is fine at this scale.
- **Supabase automatic embeddings**: real and documented, but adds pgmq + pg_net + pg_cron + an Edge Function. Start with ingestion in a route handler.

### 3.3 RAG choices

- Chunk ~800 tokens, ~100 overlap, split on headings then paragraphs, keep page + heading path.
- Voyage `input_type` must be `document` at ingest and `query` at search.
- Hybrid search (vector + full-text with Reciprocal Rank Fusion) via one Postgres function copied from Supabase's guide. Rerankers (Voyage `rerank-2.5-lite`) are a drop-in later.
- Citations: cheapest path is numbered `[n]` context and inline markers parsed by the UI. Exact-quote citations via Anthropic `search_result` blocks are not yet exposed by AI SDK 7 (the PR was still open when checked).
- Zero-RAG shortcut for tiny corpora (< ~150K tokens): put the whole corpus in the cached system prompt with `citations.enabled`. Least code, but cost scales with corpus size, so it's a fallback mode, not the default.

### 3.4 Sources

- Next.js 16.3: https://nextjs.org/blog/next-16-3
- AI SDK 7: https://vercel.com/blog/ai-sdk-7 · Anthropic provider: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic · RAG guide: https://ai-sdk.dev/cookbook/guides/rag-chatbot · citations PR: https://github.com/vercel/ai/pull/16740
- Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing · search results: https://platform.claude.com/docs/en/build-with-claude/search-results · citations: https://platform.claude.com/docs/en/build-with-claude/citations · embeddings: https://platform.claude.com/docs/en/build-with-claude/embeddings
- Managed Agents: https://itbrief.news/story/anthropic-launches-claude-managed-agents-in-public-beta · Agent SDK: https://platform.claude.com/docs/en/agent-sdk/overview
- Voyage: https://docs.voyageai.com/docs/pricing · https://blog.voyageai.com/2026/01/15/voyage-4/
- Supabase: hybrid search https://supabase.com/docs/guides/ai/hybrid-search · automatic embeddings https://supabase.com/docs/guides/ai/automatic-embeddings · SSR auth https://supabase.com/docs/guides/auth/server-side/nextjs · pausing https://supabase.com/docs/guides/platform/free-project-pausing
- Stripe: destination charges https://docs.stripe.com/connect/destination-charges · Express accounts https://docs.stripe.com/connect/express-accounts · Connect pricing https://stripe.com/connect/pricing
- Vercel: function duration https://vercel.com/docs/functions/configuring-functions/duration · FastAPI https://vercel.com/docs/frameworks/backend/fastapi
- Parsing: https://github.com/unjs/unpdf · LlamaParse pricing https://developers.llamaindex.ai/llamaparse/general/pricing/
- shadcn + Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4 · LangGraph JS: https://www.npmjs.com/package/@langchain/langgraph · pnpm: https://pnpm.io/blog/releases/11.0
