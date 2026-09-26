# Product Requirements Document — Expert Agent Platform

| | |
|---|---|
| **Working name** | *Badger Experts* (placeholder — team to decide) |
| **Status** | Draft v0.1 — MVP scope for Badger Build Fest 2026 |
| **Last updated** | 2026-09-26 |
| **Owners** | tylersue, AustinHan07, jonathankwon, 22joshlee |
| **Related docs** | [MVP scope](MVP-SCOPE.md) · [How agents work](HOW-AGENTS-WORK.md) · [Demo script](DEMO.md) · [Research](RESEARCH.md) · [Architecture](ARCHITECTURE.md) · [Workstreams](WORKSTREAMS.md) · [Roadmap](ROADMAP.md) |

---

## 1. One-liner

A platform where people with real-world expertise turn their knowledge into an AI agent, publish it, and get paid when other people use it.

Two sides, one product:

- **Build side** — an expert (tax preparer, physical therapist, immigration paralegal, HVAC tech, college admissions counselor, etc.) uploads their notes, documents, FAQs, and playbooks, describes how they work, tests the agent, and publishes it. No code.
- **Hire side** — anyone can browse published agents by field, try one, and pay to keep using it. The expert earns a share of every dollar.

Think *LangSmith / LangGraph Platform* for the build-and-host part, and a *GPT Store / Delphi.ai-style creator marketplace* for the hire-and-earn part, with the whole thing narrowed to one persona: **the practicing expert who has knowledge worth paying for but no way to scale it.**

## 2. Problem

Experts have knowledge that is (a) valuable, (b) repetitive to deliver, and (c) capped by their hours. A tax preparer answers the same forty questions every February. A PT explains the same rehab protocol to every patient. Today they either give it away (blog posts, YouTube) or sell it one hour at a time.

Meanwhile general-purpose chatbots give confident, generic, sometimes wrong answers with no accountability and no specialist behind them.

Existing tools miss the middle:

| Tool class | Gap |
|---|---|
| LangSmith / LangGraph, Dify, Flowise | Built for developers. An expert cannot use them without an engineer. |
| GPT Store, Gemini Gems, Character.AI | Easy to build, but no real knowledge-base workflow, weak or no monetization, no trust signals, buried discovery. |
| Delphi.ai, Coachvox | Closest analogue ("digital clone"), but positioned at creators/influencers with audiences, priced as a SaaS subscription for the creator, not as an open marketplace where a hirer can discover an expert they've never heard of. |
| Clarity.fm, MentorCruise, Upwork | Human experts for hire — the right marketplace shape, but the expert still has to show up for every call. |

**The gap:** a place where an expert with *no audience and no engineering skills* can package what they know, and a hirer with *no idea who the expert is* can find, trust, and pay for it.

## 3. Goals and non-goals

### MVP goals (what "done" means for Build Fest)

**The MVP is one working, presentable loop: BUILD an agent → PUBLISH it → HIRE it → USE it.** Everything below serves that loop; anything that doesn't is P1 or later.

1. An expert can go from sign-up to a **published, working agent** in under 15 minutes without reading docs.
2. A hirer can go from landing page to **a paid conversation** with an agent in under 3 minutes.
3. The agent's answers are **grounded in the expert's uploaded knowledge**, with visible citations, and it says "I don't know / ask the expert directly" when the knowledge base doesn't cover the question.
4. Money moves: a hirer pays, the platform takes a cut, the expert sees their earnings and can request a payout.
5. Four collaborators can work in parallel on the codebase without stepping on each other.

### Non-goals for MVP (explicitly out)

- Visual/graph agent builders, multi-step workflows, custom tools or code execution inside agents.
- Voice, video, or avatar clones.
- Agent-to-agent calling, external API/webhook access for agents.
- Mobile apps.
- Enterprise features: teams, SSO, audit logs, SLAs.
- Fine-tuning. Everything is prompt + retrieval.
- Handling regulated advice at production standard. We ship disclaimers and a hard stop on certain categories; we do not ship compliance.
- Anything that requires more than one LLM provider.

See [MVP-SCOPE.md](MVP-SCOPE.md) for the line-by-line in/out list.

## 4. Users

### 4.1 Expert (creator)

> "I've been doing residential HVAC for 18 years. Homeowners call me with the same ten questions. I'd love to help more people, and get paid, without answering my phone at 9pm."

- Has deep, practical domain knowledge; usually has *some* written material (notes, checklists, PDFs, past emails, slide decks, a website).
- Not technical. Comfortable with a form, a file upload, and a chat window. Not comfortable with "system prompt" or "temperature."
- Motivations: extra income, reach, credibility, offloading repetitive questions.
- Fears: the agent says something wrong under their name; someone steals their material; it's a lot of work for no return.

### 4.2 Hirer (consumer)

> "I'm trying to figure out if I can deduct my home office. I don't want to pay $300 for a CPA hour to ask one question, and I don't trust ChatGPT on taxes."

- Has a specific problem in a domain they don't know.
- Wants a fast, trustworthy, specific answer. Willing to pay a small amount for specialist-grade answers.
- Trust drivers: who the expert is (credentials, years of experience), what other hirers said, whether answers cite sources, and whether the agent is honest about its limits.

### 4.3 Platform admin (us)

- Approves/rejects agents before they go live (manual in MVP).
- Sees usage, revenue, flagged conversations.

## 5. Core user journeys

### 5.1 Expert: create and publish an agent

```
Sign up → Create agent → Fill in persona form → Upload knowledge → Test in sandbox → Set price → Publish → Live on marketplace
```

| Step | What the expert does | What the system does |
|---|---|---|
| Sign up | Email/OAuth. Picks "I'm an expert." | Creates `profile` with role `expert`. |
| Create agent | Clicks "New agent." | Creates a draft `agent` row. |
| Persona form | Name, field/category, headline, bio/credentials, "how I work" (tone, what you always ask first, what you never do), example questions. | Compiles these into a system prompt. Expert never sees the raw prompt unless they open "Advanced." |
| Upload knowledge | Drag-drops PDFs, DOCX, MD, TXT; pastes text; adds URLs. | Parses, chunks, embeds, stores with `agent_id`. Shows ingestion status per file. |
| Test | Chats with the agent in a sandbox. Sees which chunks were retrieved for each answer. Can thumbs-down an answer and add a "correction" note that becomes a high-priority knowledge chunk. | Same runtime as production, flagged `sandbox=true` so it's not billed. |
| Set price | Chooses free-trial message count and price per conversation or per month. | Validates against platform min/max. |
| Publish | Clicks "Publish." | Status → `published` immediately. Listing appears in the marketplace. (A pre-publish admin review queue is P1, added once strangers join.) |

### 5.2 Hirer: find, try, pay, chat

```
Land → Browse/search → Agent listing page → Try (free messages) → Paywall → Pay → Continue chatting → Rate
```

| Step | What the hirer does | What the system does |
|---|---|---|
| Browse | Filters by category, sorts by rating/popularity, or searches. | Lists `published` agents. |
| Listing | Reads expert bio, credentials, sample Q&A, rating, price, "what this agent can and can't help with." | — |
| Try | Sends up to N free messages (expert-configured, default 3). | Creates `conversation`, runs agent, decrements trial counter. |
| Paywall | Hits the limit. Sees price. | Stripe Checkout. |
| Pay | Pays. | Webhook creates `purchase`, unlocks conversation. Ledger entry credits expert's share. |
| Chat | Continues. Sees citations. Can click "Contact the expert directly" (mailto / link expert set). | — |
| Rate | 1–5 stars + short review after ≥ 5 messages. | Updates agent's aggregate rating. |

### 5.3 Expert: get paid

```
Dashboard → See earnings and conversations → Connect Stripe → Request payout
```

- Dashboard shows: conversations, messages, revenue (gross, platform fee, net), top questions asked, thumbs-down answers to review.
- Stripe Connect Express onboarding. Payouts are manual-trigger in MVP (admin clicks "pay out"); automatic scheduling is post-MVP.

## 6. Functional requirements

Priority key: **P0** = must ship for demo. **P1** = ship if time. **P2** = post-Build-Fest.

### 6.1 Accounts and profiles (`platform`)

| ID | Requirement | Pri |
|---|---|---|
| ACC-1 | Email + Google OAuth sign-up/sign-in. | P0 |
| ACC-2 | A user can be an expert, a hirer, or both. Role is a flag, not a separate account. | P0 |
| ACC-3 | Expert profile: display name, photo, field, credentials text, years of experience, links, "contact me" URL/email. | P0 |
| ACC-4 | Admin role, gated by allowlist of emails in env. | P0 |

### 6.2 Agent builder (`builder`)

| ID | Requirement | Pri |
|---|---|---|
| BLD-1 | Create/edit/delete a draft agent. | P0 |
| BLD-2 | Persona form with fields: name, category (from fixed list), one-line headline, description, "how I work" free text, "always do" list, "never do" list, 3–5 example questions, greeting message. | P0 |
| BLD-3 | System prompt is generated from the form via a template. "Advanced" toggle reveals and allows editing the raw prompt. | P0 |
| BLD-4 | Knowledge upload: PDF, DOCX, TXT, MD, pasted text. Per-file status (queued / processing / ready / failed). Delete a file re-indexes. | P0 |
| BLD-5 | URL ingestion (single page fetch and parse). | P1 |
| BLD-6 | Sandbox chat with retrieval inspector (shows top-k chunks and scores per answer). | P0 |
| BLD-7 | "Correct this answer" → creates a pinned knowledge chunk that outranks retrieval. | P1 |
| BLD-8 | Pricing config: free trial messages (0–10), price per conversation (USD), optional monthly price. | P0 |
| BLD-9 | Publish → `published` immediately; unpublish → `unpublished`. Publish is blocked until the persona is complete and at least one source is ready. | P0 |
| BLD-10 | Duplicate an agent. | P2 |
| BLD-11 | Version history of the persona/prompt. | P2 |

### 6.3 Knowledge and retrieval (`knowledge`)

| ID | Requirement | Pri |
|---|---|---|
| KNW-1 | Parse PDF/DOCX/TXT/MD into text with page/section metadata. | P0 |
| KNW-2 | Chunk (target ~500 tokens, overlap), embed, store in `pgvector` with `agent_id`, `document_id`, `chunk_index`, `metadata`. | P0 |
| KNW-3 | Retrieval: cosine similarity top-k (k=6) filtered by `agent_id`. | P0 |
| KNW-4 | Hybrid search (vector + full-text) with reciprocal-rank fusion. | P1 |
| KNW-5 | Each retrieved chunk carries a citation (`document name`, page or section) returned to the UI. | P0 |
| KNW-6 | Per-agent limits: 50 files / 100 MB / 5,000 chunks in MVP. Show usage. | P0 |
| KNW-7 | Ingestion is async (queued) so the UI doesn't block on a 40-page PDF. | P1 |
| KNW-8 | Re-embed on demand (model change). | P2 |

### 6.4 Chat runtime (`runtime`)

| ID | Requirement | Pri |
|---|---|---|
| RUN-1 | `POST /api/chat` streams a response for a `conversation_id` + user message. | P0 |
| RUN-2 | Pipeline: load agent config → retrieve chunks → build prompt (system + persona + retrieved context + history window) → call LLM → stream → persist assistant message with citations. | P0 |
| RUN-3 | Grounding rule in prompt: answer only from provided context and general knowledge clearly labeled as such; if the context doesn't cover it, say so and suggest contacting the expert. | P0 |
| RUN-4 | Conversation history windowing (last N turns, or summarize after N). | P1 |
| RUN-5 | Safety layer: category-specific disclaimer injected into first assistant message (legal/medical/financial); hard refusal list (emergency medical, self-harm → route to resources). | P0 |
| RUN-6 | Per-message usage logging (tokens in/out, latency, model) for cost tracking. | P0 |
| RUN-7 | Enforce entitlement before each message: free-trial remaining or active purchase. | P0 |
| RUN-8 | Rate limiting per user. | P1 |
| RUN-9 | Thumbs up/down on assistant messages, stored. | P1 |

### 6.5 Marketplace (`marketplace`)

| ID | Requirement | Pri |
|---|---|---|
| MKT-1 | Landing page explaining both sides with CTAs. | P0 |
| MKT-2 | Browse page: grid of published agents, category filter, sort by rating / newest / most used, text search on name+headline+category. | P0 |
| MKT-3 | Agent listing page: expert card (photo, credentials, years), headline, description, example questions (clickable → starts chat), rating + count, price, free-trial note, disclaimer, "Start chatting" CTA. | P0 |
| MKT-4 | Ratings and reviews (1–5, text), one per hirer per agent. | P1 |
| MKT-5 | Featured/curated row on landing (admin-picked). | P1 |
| MKT-6 | Expert public profile page listing their agents. | P1 |
| MKT-7 | Semantic search over listings. | P2 |

### 6.6 Billing and payouts (`billing`)

| ID | Requirement | Pri |
|---|---|---|
| BIL-1 | Stripe Checkout (test mode) for a one-time "unlock this conversation" purchase. `PAYMENTS_MODE=mock` creates the purchase without Stripe so the demo never depends on a webhook. | P0 |
| BIL-2 | Webhook → `purchases` row → entitlement. Idempotent. | P0 |
| BIL-3 | Ledger table: every purchase creates a platform-fee entry and an expert-earnings entry. Platform fee = 20% (configurable). | P0 |
| BIL-4 | Expert earnings dashboard (gross / fee / net / pending payout). | P0 |
| BIL-5 | Stripe Connect Express onboarding for experts. | P1 |
| BIL-6 | Admin "pay out" button → Stripe transfer. | P2 |
| BIL-7 | Monthly subscription to an agent. | P2 |
| BIL-8 | Credits wallet spanning multiple agents. | P2 |

### 6.7 Admin (`platform`)

| ID | Requirement | Pri |
|---|---|---|
| ADM-1 | Review queue: list published agents, open their sandbox, unpublish with a note. Pre-publish approval gate. | P1 |
| ADM-2 | Metrics page: agents, conversations, messages, revenue, LLM cost. | P1 |
| ADM-3 | Flagged conversations list (thumbs-down, safety triggers). | P1 |

## 7. Non-functional requirements

| Area | MVP bar |
|---|---|
| Latency | First streamed token < 2.5 s p50 on a warm agent. |
| Availability | Best-effort. Vercel + Supabase free/pro tiers. |
| Cost control | Hard cap on LLM spend per day via env var; log every call. Use the cheapest capable model for retrieval-grounded chat, a stronger one only if quality demands it. |
| Data isolation | Row-level security: an expert can only read/write their own agents and documents; a hirer can only read their own conversations; retrieval is always filtered by `agent_id` server-side. |
| Privacy | Uploaded knowledge is never used to train anything. Documents are stored in private buckets. Conversations are visible to the expert in aggregate (top questions) but not verbatim in MVP unless the hirer opts in. |
| Accessibility | Keyboard-navigable chat and forms; semantic HTML via shadcn/ui defaults. |
| Observability | Structured logs on every LLM call and ingestion job. |

## 8. Trust, safety, and legal (MVP minimum)

1. **Disclaimers**: every agent in the categories *legal, medical, financial/tax, mental health* shows a fixed disclaimer on the listing and in the first message. The expert cannot remove it.
2. **Identity**: experts must fill in credentials text and a contact link. We do not verify credentials in MVP; the listing says "Self-reported." A "Verified" badge is a post-MVP feature.
3. **Hard stops**: the runtime detects emergency/self-harm patterns and responds with a resource message instead of the agent's answer.
4. **Content ownership**: Terms state the expert owns their uploaded content and grants the platform a license to serve it through their agent only. We never cross-share knowledge between agents.
5. **Manual review**: in the MVP, publishing is instant so the demo loop has no human gate. Admins can unpublish any agent instantly. A pre-publish review queue (P1) goes in once people outside the team start publishing.
6. **Takedown**: any user can flag an agent; admin can unpublish instantly.

## 9. Success metrics for Build Fest

| Metric | Target for demo day |
|---|---|
| Experts onboarded (real people, real docs) | ≥ 5 (one per team member + one outsider) |
| Published agents | ≥ 5 across ≥ 3 categories |
| Median time to publish (measured with a stopwatch on a fresh user) | < 15 min |
| Grounded-answer rate on a 20-question eval set per agent | ≥ 80% answers cite ≥ 1 chunk; 0 hallucinated citations |
| Full paid loop demonstrated live | Yes, with Stripe test mode |
| Hirer NPS from ≥ 10 test users | ≥ 7/10 average "would use again" |

## 10. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| 1 | Product name and domain. | tylersue | Week 1 |
| 2 | Per-conversation pricing vs. per-month vs. credits for MVP? (PRD assumes per-conversation unlock; simplest to reason about.) | team | Week 1 |
| 3 | Do we let hirers see the expert's contact info, or gate it behind a purchase? | team | Week 2 |
| 4 | Which LLM model tier is the default? Decide after cost test on 100 sample messages. | runtime owner | Week 2 |
| 5 | Do experts see verbatim hirer conversations? (Privacy vs. quality-improvement tradeoff.) | team | Week 2 |
| 6 | Do we need a waitlist/invite for experts to control quality, or open sign-up? | team | Week 3 |
| 7 | When do we turn on the pre-publish review queue? (Suggested: the day the first non-team expert signs up.) | team | Week 3 |

## 11. Appendix: glossary

| Term | Meaning |
|---|---|
| **Agent** | A published persona + knowledge base + pricing config, owned by one expert. |
| **Knowledge base** | The set of documents/chunks attached to one agent. |
| **Sandbox** | The expert's private test chat against their own agent. Not billed. |
| **Conversation** | One hirer's chat thread with one agent. Entitlement is tracked per conversation. |
| **Entitlement** | Whether a hirer may send the next message: free-trial remaining, or purchase on file. |
| **Ledger** | Append-only table of money movements: purchases, platform fees, expert earnings, payouts. |
