# Research

What we looked at before scoping the MVP, and what we're taking from each. Verified against current sources on 2026-09-26.

## 1. Agent builders (LangSmith and peers)

### 1.1 The landscape moved under us in 2026

| Event | Date | Why it matters to us |
|---|---|---|
| LangChain's no-code Agent Builder renamed **LangSmith Fleet** | March 2026 | The reference product for "describe it in chat, get a config, test it, publish" is prompt-first, not canvas-first. |
| OpenAI deprecated **Agent Builder** (shutdown Nov 30, 2026) | June 2026 | The visual-canvas tier is collapsing. Don't build a node editor. |
| OpenAI retiring **custom GPTs** (stop running Dec 11, 2026); GPT Store revenue share never launched beyond a US test | Sept 2026 | The largest consumer "build an agent" surface is going away and never paid creators. Own the corpus, retrieval, and billing; don't be a thin layer on someone's builder. |
| **Flowise** archived; **Vellum** dropped its workflow builder | Aug 2026 | Same lesson. Survivors in the open builder tier: Dify, Botpress. |

### 1.2 How the survivors let non-technical people build

| Platform | Agent is defined by | Knowledge | Test | Notes |
|---|---|---|---|---|
| **LangSmith Fleet** | Chat "Build with AI" drafts the system prompt, proposes tools/triggers, asks follow-ups; reviewable plan diagram before create | No simple "upload a PDF" knowledge base; files go into chat, durable knowledge lives in Skills (SKILL.md) and memory files, docs via Drive/SharePoint connectors | Test chat beside config; every run traced | Export to MIT-licensed code. Metered in LCU ($1.50), opaque for non-technical buyers |
| **LangSmith Deployment + Studio** (ex LangGraph Platform) | Code. Studio has a Chat mode for business testers | Bring your own | Graph mode (step through nodes, edit state, fork), Chat mode | Primitives: Assistant, Thread, Run, Store, checkpointer. See [HOW-AGENTS-WORK.md](HOW-AGENTS-WORK.md) for the mapping to our design |
| **Gemini Gems** | 3 fields: name, instructions, optional files; a wand drafts instructions | Up to 10 files from device, Drive, or NotebookLM | Preview pane, then Save | The simplest successful builder |
| **Claude Projects / Skills** | Name, description, instructions, files | Project files; RAG engages automatically near the context limit | Chat in project | Skills = progressive disclosure (name + description in prompt, body on demand) |
| **Dify** | Prompt + tools + knowledge, or visual workflow | Widest ingestion: PDF/DOCX/PPTX/XLSX/CSV/MD/HTML/EPUB, Notion, web crawl; parent-child chunking; hybrid retrieval + rerank; citations toggle | Debug panel, logs | Open source, $30M raised March 2026 |
| **Relevance AI** | Name + description + prose instructions; tools with approval mode; 4 autonomy levels | "Add all to prompt" vs "allow agent to search": the clearest non-technical framing of stuffing vs RAG | Chat before deploy | Marketplace of templates, no creator payouts |
| **Character.AI** | Name + avatar required; greeting, description, 32K-char "definition" with example dialogs optional | None | Chat | Guides warn an empty definition "feels generic" |

### 1.3 What converges (table stakes for a builder)

Plain-language instructions, file or URL knowledge with automatic chunking/embedding/citation, a live test chat on the same screen as the config, run history, sharing with permissions, and approval gates for risky actions. Visual canvases, subagents, triggers, and self-editing memory are nice-to-have and being abandoned by three vendors.

### 1.4 What we borrow from LangSmith

- **Chat-to-config.** Fleet's "describe it, we draft the prompt, then ask 2–3 follow-ups" is the pattern. Ours goes further: the interview is the primary knowledge source, not just a config helper.
- **Assistant / Thread / Run / Store** separation. Our `agents`, `conversations`, `/api/chat`, and `chunks` map one-to-one.
- **Test beside config.** Studio's Chat mode and Fleet's test panel become our sandbox with the retrieved-sources inspector, which no consumer builder exposes to the creator.
- **Every run traced.** Our `llm_usage` and per-message token logging.
- **Skills as progressive disclosure.** Post-MVP idea: a per-agent SKILL-style "how I work" block loaded fully only when relevant.

What we don't copy: Fleet's fragmented knowledge story (chat uploads vs skills vs memory vs connectors) and LCU metering. Our metering is cost-based and shown in cents.

### 1.5 Why most creators abandon builders

Over 3M GPTs were created, ~159K public, most "built once and abandoned." Maintenance is harder than the first build, there's no test coverage or review process, and revenue never arrived. Our answer: a sandbox with visible retrieval, thumbs-down-to-correction, an earnings page with per-purchase detail, and instant unpublish.

Sources: LangChain Fleet docs and changelog (https://docs.langchain.com/langsmith/fleet/essentials, https://docs.langchain.com/langsmith/fleet/changelog), assistants/threads/runs (https://docs.langchain.com/langsmith/assistants, https://docs.langchain.com/langsmith/agent-server), Studio (https://docs.langchain.com/langsmith/studio), pricing (https://www.langchain.com/pricing), OpenAI Agent Builder deprecation (https://pickaxe.co/post/openai-agent-builder-deprecation), GPT retirement (https://mixed-news.com/en/openai-retiring-custom-gpts-what-carries-over-to-plugins/), Gems (https://support.google.com/gemini/answer/15146780), Claude Projects RAG (https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects), Dify chunking (https://docs.dify.ai/en/guides/knowledge-base/create-knowledge-and-upload-documents/chunking-and-cleaning-text), Relevance knowledge (https://relevanceai.com/docs/knowledge), Character.AI definition (https://book.character.ai/character-guide/character-attributes/definition), Flowise EOL (https://github.com/FlowiseAI/Flowise/discussions/6727), GPT Store stats (https://seo.ai/blog/gpt-store-statistics-facts). Unverified: GPT file cap (10 vs 20), Fleet's lack of a document knowledge base is inferred from its docs rather than stated.

## 2. Marketplaces and expert monetization

### 2.1 The closest analogue: Delphi

Delphi (delphi.ai) lets a creator build a "digital mind" from links, docs, YouTube, podcasts, books, calibration Q&A, and a voice sample. Raised a $16M Series A led by Sequoia in June 2025; 2,000+ experts by mid-2025. Matthew Hussey's clone has answered 2.5M+ questions and earns "seven figures" at $39/month.

| Aspect | What Delphi does | What we take |
|---|---|---|
| Creator pricing | SaaS tiers: Free / $79 / $299 / custom, gated by corpus size ("training words") | No SaaS fee. Experts without an audience won't pay $79/mo before earning anything |
| Take rate | 15% of membership revenue (one source says 20%; docs page 404'd) | 15% as the working number. Every comparable is 10–15%; our earlier 20% was above all of them |
| Consumer pricing | Creator-set memberships, monthly/annual, optional usage caps (interactions) | Per-agent subscription with an included usage allowance, plus cost-based credits for overage. Same shape, but our allowance is metered in real cost, not message count |
| Discovery (observed live) | Search box, ~30 topic tabs, "Featured minds," ranked list with a sample question per row that deep-links into chat; profile has headline, About, "Ask me about" prompts, chat box, Call button. **No ratings, usage counts, or prices on listings** | Copy the structure. Add what Delphi lacks: rating + count, conversations answered, "knowledge last updated," price on the card |
| Trust | ID verification required; only the real person may create their mind; responses cite source content | Self-reported credentials in MVP, verification badge post-MVP. Citations from day one |
| Payments | Delphi-managed Stripe Express, USD only, creators can't bring their own Stripe | Mocked in MVP. When real: Stripe Connect Express with bring-your-own account (a recurring complaint about Delphi and Coachvox) |
| Criticism | Backlash when the clone is positioned as "you" (Karamo Brown, April 2026); MIT Tech Review found a clone acting like a newsletter funnel; hallucination outside the corpus "in your voice" | Position as "the expert's knowledge, in their words," not "the expert." Refuse outside the corpus |

### 2.2 Everyone else

| Platform | Model | Lesson |
|---|---|---|
| **Coachvox**, **BuddyPro**, **Personify**, **Twinly** | Creator pays $79–$197/mo SaaS; 0–10% take; consumer pays $19–$99/mo or $1–2K/yr per expert | Subscription-to-one-expert is the only model with documented seven-figure creator outcomes. BuddyPro discloses LLM cost of $15–30 per subscriber per month, so usage caps or cost-based metering are mandatory |
| **Poe** | Creator sets price per message; user pays in "compute points" = creator price + Poe's model cost | Cost-plus metering is exactly our credits model. But most Poe creators earn under $100/mo: per-message alone doesn't make a business. Combine with subscriptions |
| **GPT Store** | Opaque engagement pool; revenue share never launched; 3M unreviewed listings, spam, prompt leaks | Show experts per-purchase gross/fee/net. Curate supply. Disclose ranking criteria |
| **Character.AI** | No creator payouts; virtual currency | Anti-model. Entertainment, not expertise |
| **Salesforce AgentExchange** | 15% rev share, $999 security review, 4–5 week review | The trust bar enterprises expect. Manual review before publish is cheap for us post-MVP |
| **Intro.co**, **MentorCruise**, **Clarity.fm** (human experts) | 30% marketplace / 10% direct-link (Intro); ~17% (MentorCruise); ~15% (Clarity) | Intro's split by traffic source is the best incentive mechanic seen: lower take when the expert brings the hirer. Post-MVP |
| **agent.ai**, Kajabi Creator Studio, OpenAI Agent Builder | Shut down or redirected in 2026 | Platform risk is real. Own the corpus, retrieval, and billing |

### 2.3 Model we're building (as decided 2026-09-26)

- **Hire = chat.** A conversation with the agent, with an in-chat file upload for the hirer's own document.
- **Entitlement:** per-agent monthly subscription with an included credit allowance, plus a platform-wide wallet for overage. Both purchase flows are **mocked** in the MVP (buttons write rows), but **metering is real**: 1 credit = 1 cent of charge = raw LLM token cost × the expert's rate multiplier.
- **Free trial:** a few free messages per hirer per agent after sign-in, scoped to the (hirer, agent) pair so new conversations don't reset it.
- **Take rate:** 15% of margin as the working number.
- **Listings:** Delphi's anatomy plus rating, usage count, freshness date, and price.
- **Supply:** the team and friends as the first experts in three categories (health/PT, tax/finance, career/admissions). Curated invites after that.

### 2.4 Trust and safety must-haves

1. **Identity, then licenses.** MVP: self-reported credentials with a "self-reported" label. Post-MVP: ID verification (Delphi does it; the FTC impersonation rule and the NO FAKES Act of 2026, which cleared Senate Judiciary in June 2026, point liability at platforms) and a separate "Licensed" badge for lawyers, physicians, CPAs, licensed trades.
2. **Regulated advice is designed, not disclaimed.** Category disclaimers on the listing and at the top of every chat; "no attorney-client / doctor-patient relationship"; one-click "contact the expert" escalation; hard stops for emergencies. Note that OpenAI's Oct 2025 usage policy prohibits tailored licensed advice without a professional involved. Anthropic's policy should be checked at plan time for the same.
3. **Grounding, citations, refusal, freshness.** Answer from the corpus with citations, refuse outside it, show "knowledge last updated."
4. **Expert kill switch.** Instant unpublish, transcript review (opt-in), topic blocklists. CarynAI collapsed when the persona drifted into content the creator never authorized.
5. **Only you can clone you.** No third-party or celebrity clones, ever.
6. **Ownership.** Expert keeps IP; platform gets a limited service license; no training on expert data; export and delete on exit. Consent checkbox at publish.
7. **Reporting.** "Flag this agent" on every listing.

Sources: Delphi pricing (https://www.delphi.ai/pricing), Series A (https://www.delphi.ai/blog/delphi-raises-16m-series-a-from-sequoia), Hussey case study (https://www.delphi.ai/blog/how-matthew-hussey-scaled-his-expertise), creator terms (https://www.delphi.ai/terms-creator), Discover page rendered live 2026-09-26 (https://www.delphi.ai/discover), fee review (https://davidriha.com/blog/delphi-ai-review-2026-is-it-worth-it/), MIT Tech Review on clones (https://www.technologyreview.com/2025/09/02/1122856/can-an-ai-doppelganger-help-me-do-my-job/), Coachvox (https://coachvox.ai/charge-for-ai/), BuddyPro (https://buddypro.ai/), Personify (https://natlawreview.com/press-releases/personify-launches-platform-lets-professionals-clone-themselves-ai), Intro (https://intro.co/experts), MentorCruise fees (https://help.mentorcruise.com/article/61-what-fees-does-mentorcruise-take), Clarity (https://clarity.fm/help/articles/23/how-are-rates-for-experts-determined-on-clarity), Poe creator FAQ (https://help.poe.com/hc/en-us/articles/21921312368020-Poe-Creator-Monetization-FAQs), Poe earnings analysis (https://rumjahn.com/how-much-money-can-you-really-make-creating-poe-bots-in-2025/), GPT Store spam (https://arxiv.org/html/2402.15105v3), revenue program status (https://community.openai.com/t/is-there-any-news-on-the-revenue-sharing-of-gpts/692047), AgentExchange (https://salesforcedevops.net/index.php/2026/04/14/agentexchange-salesforces-bet-that-trust-can-scale-with-agentic-speed/), OpenAI usage policy (https://openai.com/policies/usage-policies/), NO FAKES Act (https://www.congress.gov/bill/119th-congress/senate-bill/4591), FTC impersonation rule (https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-announces-impersonation-rule-goes-effect-today), CarynAI (https://theconversation.com/an-influencers-ai-clone-started-offering-fans-mind-blowing-sexual-experiences-without-her-knowledge-232478), lawyer-clone analysis (https://www.forbes.com/councils/forbesbusinesscouncil/2026/08/21/when-ai-clones-a-lawyer-the-legal-ethical-and-ownership-questions/). Unverified: Delphi's exact fee (15% vs 20%), all BuddyPro/Personify/Twinly revenue figures (self-reported), Poe total payouts.

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
