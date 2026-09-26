# MVP Scope

**The MVP is one working, presentable loop:**

```
BUILD an agent  →  PUBLISH it to the marketplace  →  HIRE it  →  USE it (chat, grounded in the expert's knowledge)
```

If a feature is not on the shortest path through that loop, it is not in the MVP. This file is the line-by-line in/out list. The [PRD](PRD.md) has the full requirements with IDs; the [Roadmap](ROADMAP.md) has the order we build in.

## The four working functions

### 1. BUILD — an expert creates an agent

| In | Out |
|---|---|
| Sign up / sign in (email + Google) | Teams, org accounts |
| "New agent" → persona form (name, category, headline, bio/credentials, how I work, always/never, example questions, greeting) | Visual flow builder, multi-agent graphs |
| System prompt auto-generated from the form; "Advanced" reveals it | Prompt versioning, A/B testing |
| Upload PDF / DOCX / TXT / MD / pasted text; see per-file status | URL crawl (single-URL fetch is P1), audio/video, Notion/Drive connectors |
| Sandbox chat with "show retrieved sources" panel | Eval suites, automated quality scoring |
| Set free-trial message count + price | Tiered plans, coupons |
| Save as draft, come back later | Collaborators on one agent |

### 2. PUBLISH — the agent goes live on the marketplace

| In | Out |
|---|---|
| "Publish" button → agent is live immediately | Admin approval queue before go-live (P1 — we add it once there are strangers on the platform) |
| Listing page auto-generated from the persona form + expert profile | Custom listing layouts, cover images |
| Unpublish / edit / republish | Scheduled publishing, versioned listings |
| Fixed category list (~12 categories) | User-defined tags |
| Required disclaimer for legal / medical / financial / mental-health categories | Credential verification, "Verified" badge |

### 3. HIRE — a hirer finds and pays for an agent

| In | Out |
|---|---|
| Landing page with clear two-sided pitch | Marketing site, blog |
| Browse grid with category filter, sort, text search | Semantic search, recommendations |
| Listing page with expert card, example questions, price, rating | Reviews with photos, Q&A threads |
| Free trial: N messages (expert sets N, default 3) | Time-boxed trials |
| Paywall → Stripe Checkout (test mode) → conversation unlocked | Subscriptions, credit wallets, promo codes |
| `PAYMENTS_MODE=mock` env flag: "Hire" button creates the purchase row without Stripe, so the demo never depends on a webhook | — |
| Ledger row per purchase: gross, platform fee (20%), expert net | Tax handling, invoices, refunds |
| Expert earnings page (sum of ledger) | Automated payouts. Stripe Connect onboarding is P1; the "pay out" button is P2 |
| 1–5 star rating after 5+ messages | Written reviews (P1) |

### 4. USE — the hirer chats with the agent

| In | Out |
|---|---|
| Streaming chat UI | Voice, file upload by hirer, image input |
| Retrieval over the agent's knowledge base, top-k, filtered by agent | Cross-agent retrieval, web search tool |
| Citations shown per answer (document name + page/section), expandable | Inline highlight of source text |
| "I don't have that in my knowledge base — contact the expert" behavior when retrieval is weak | Handoff to live human chat |
| Conversation persists; hirer can return to it | Export, share |
| Thumbs up/down per message | Expert sees verbatim transcripts (privacy question open — see PRD §10) |
| Disclaimer in first message for regulated categories | Full compliance program |
| Hard stop for emergency / self-harm patterns → resource message | Content moderation pipeline |

## Cross-cutting

| In | Out |
|---|---|
| One LLM provider (Anthropic Claude), one embedding provider | Model picker, BYO API key |
| Supabase: Postgres + pgvector + Auth + Storage, RLS on every table | Self-hosted infra, Redis, queues (ingestion runs in a route handler with a background-task pattern; a proper queue is P1) |
| Vercel deploy from `main`; preview deploys per PR | Staging env, blue/green |
| Structured logging of every LLM call with token counts | Dashboards, alerting |
| Daily LLM spend cap via env var | Per-user quotas (P1) |
| Seed script that creates 3 demo experts with real documents | — |

## What "presentable" means

Demo day judges will see the loop once, live, in about 4 minutes. So:

1. **No dead ends.** Every button on the happy path works. Buttons for P1+ features are not rendered at all rather than rendered disabled.
2. **Real content.** The seed agents use real documents from real team members (or public-domain professional material), not lorem ipsum. Answers must be visibly better than a vanilla chatbot on the same question, because they cite the expert's material.
3. **Fast.** First token under ~2.5 s. Ingestion of a 20-page PDF under 30 s with a visible progress state.
4. **Consistent UI.** One component library (shadcn/ui), one layout shell, one color system. Empty states and loading states designed, not left default.
5. **A second laptop.** The hire-and-use half of the demo runs on a different machine and account from the build half, so the audience sees two real users.

See [DEMO.md](DEMO.md) for the minute-by-minute script.

## Guardrails on scope creep

- If it needs a new table, a new external service, or a new page that is not in the loop above, it goes into a GitHub issue labeled `post-mvp` and we move on.
- Anyone can propose promoting a `post-mvp` item. It gets promoted only if the four core functions are already green end-to-end.
