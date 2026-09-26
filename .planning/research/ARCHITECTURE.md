# Architecture Research

**Domain:** Expert-agent RAG marketplace (experts publish retrieval-grounded AI chat personas; hirers pay to chat)
**Researched:** 2026-09-26
**Confidence:** HIGH — this is a sanity-check of an already-designed architecture (`docs/ARCHITECTURE.md`, `docs/HOW-AGENTS-WORK.md`, `docs/WORKSTREAMS.md`, `docs/MVP-SCOPE.md`), cross-checked against standard multi-tenant RAG + Postgres RLS patterns and current Stripe Connect docs. No stack re-decisions were made; findings below either confirm the existing design or flag a specific gap.

## Standard Architecture

### System Overview

The existing design is a single Next.js 16 monolith (UI + route handlers + Server Actions) against a single Supabase Postgres instance (pgvector + Auth + Storage), fronting Anthropic Claude, Voyage embeddings, and Stripe. This matches the standard shape for a small-scale, multi-tenant RAG SaaS: one deployable, one datastore, tenant isolation by a foreign key (`agent_id`) rather than infra-level sharding.

```
┌───────────────────────────────────────────────────────────────────────┐
│                              Browser                                   │
│  ┌───────────┐   ┌──────────────┐   ┌───────────┐                     │
│  │ Builder UI│   │Marketplace UI│   │  Chat UI  │                     │
│  └─────┬─────┘   └──────┬───────┘   └─────┬─────┘                     │
├────────┼────────────────┼─────────────────┼────────────────────────────┤
│        │        Vercel (Next.js 16 — one deploy)                       │
│  ┌─────▼─────┐   ┌──────▼───────┐   ┌─────▼─────┐   ┌───────────────┐ │
│  │/api/ingest│   │Server Actions │   │/api/chat  │   │/api/stripe/*  │ │
│  └─────┬─────┘   └──────┬───────┘   └─────┬─────┘   └───────┬───────┘ │
├────────┼────────────────┼─────────────────┼─────────────────┼──────────┤
│        │                │                 │                 │         │
│  ┌─────▼────────────────▼─────────────────▼───┐   ┌─────────▼──────┐ │
│  │        Supabase Postgres + pgvector          │   │ Supabase       │ │
│  │  agents · sources · chunks · conversations   │   │ Storage        │ │
│  │  messages · purchases · ledger · ratings     │   │ (private,      │ │
│  │  RLS on every table; service role for        │   │  signed URLs)  │ │
│  │  ingest + chat retrieval + webhooks          │   │                │ │
│  └───────────────────────────────────────────────┘   └────────────────┘│
│                    Supabase Auth (cookie/JWT, same claims drive RLS)    │
└───────┬───────────────────────┬───────────────────────┬────────────────┘
        │                       │                       │
   ┌────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐
   │ Voyage    │           │ Anthropic │           │  Stripe   │
   │ embeddings│           │  Claude   │           │ Checkout +│
   │           │           │           │           │  Connect  │
   └───────────┘           └───────────┘           └───────────┘
```

Confirmed against current practice: a single shared Postgres table with tenant-scoping (here, `agent_id`) rather than a database-per-tenant is the standard, economical default for this scale — see [TigerData's multi-tenant RAG writeup](https://www.tigerdata.com/blog/building-multi-tenant-rag-applications-with-postgresql-choosing-the-right-approach) and [The Nile's multi-tenant RAG post](https://www.thenile.dev/blog/multi-tenant-rag). Database-per-tenant is reserved for compliance-bound enterprise tenants, which this MVP does not have.

### Component Responsibilities

| Component | Responsibility | Notes vs. standard pattern |
|-----------|----------------|------------------------------|
| Builder UI (`app/(app)/build/**`) | Persona authoring, upload, sandbox test, publish | Standard "no-code agent builder" shape (comparable to custom GPTs / Gemini Gems) |
| Marketplace UI | Discovery, listing, hire CTA | Standard storefront over a `published`-status filter |
| Chat UI | Streaming conversation, citation rendering, paywall UI | Shared component between sandbox and hirer chat — good reuse, see Pattern 1 below |
| `/api/ingest` | Parse → chunk → embed → store, one source at a time | Standard ingestion pipeline; synchronous-then-async is a reasonable MVP-to-P1 path |
| `/api/chat` | Auth → entitlement → safety → retrieve → assemble prompt → stream → persist | This *is* the "graph" — a fixed, non-branching RAG pipeline, which is appropriate for single-agent retrieval chat (no LangGraph needed at this scope) |
| `/api/stripe/*` | Checkout session creation, webhook, Connect onboarding | Standard Stripe Connect marketplace flow (see Pattern 3) |
| Postgres + pgvector | System of record, vector + full-text hybrid search, entitlement state, ledger | RLS is the tenant boundary for owner/hirer reads; retrieval and ingestion use the service-role key and bypass RLS (see Gap 1) |
| Supabase Storage | Raw uploaded files, private bucket | Standard — never served directly to hirers |
| `lib/llm` | Single choke point for every LLM/embedding call: model selection, usage logging, spend cap | Correct centralization — this is what makes the spend cap and prompt-cache discipline enforceable |

## Recommended Project Structure

The existing repo layout (`docs/ARCHITECTURE.md` §3) is sound and matches feature-folder conventions for a team-owned monolith:

```
app/
├── (marketing)/            # public landing                    → marketplace
├── (auth)/                 # login/signup                      → platform
├── (app)/
│   ├── build/**            # expert-side pages                 → builder
│   ├── marketplace/, agents/[slug]/   # discovery + listing    → marketplace
│   ├── chat/[conversationId]/         # hirer chat              → runtime
│   ├── earnings/                      # expert payouts view    → billing
│   └── admin/                         # review queue (P1)      → platform
└── api/
    ├── ingest/route.ts     # knowledge pipeline entry point     → knowledge
    ├── chat/route.ts       # fixed RAG pipeline entry point     → runtime
    └── stripe/**           # checkout/webhook/connect           → billing
features/
├── builder/     # persona form, prompt template, publish action
├── knowledge/   # parsers, chunker, embedder, hybrid search
├── runtime/     # agent.ts, prompt.ts, safety.ts
├── marketplace/ # cards, filters, listing queries
└── billing/     # stripe.ts, entitlements.ts, ledger.ts
lib/
├── supabase/{client,server,admin}.ts
├── llm/         # model registry + usage logging + spend cap — ALL LLM calls route here
├── env.ts
└── db.types.ts  # generated, one owner regenerates per migration
```

### Structure Rationale

- **`features/` as the isolation unit, not a monorepo:** correct call for a single deployable. Turborepo/pnpm-workspaces would add config overhead with no isolation benefit a folder-ownership convention doesn't already give at this team size.
- **`app/api/*` is a thin adapter over `features/*`:** each route handler should stay a few lines — auth, parse input, call the feature function, stream/return. This keeps the "day-one shared contracts" (§6 of the source doc) as the real API surface between workstreams, not the HTTP layer, which matters for parallel development (see Build Order below).
- **`lib/llm` as a single choke point:** this is the one place the spend cap and prompt-cache byte-stability can be enforced. Any workstream calling Claude or Voyage directly instead of through this module breaks both guarantees — worth a lint rule or code-review checklist item, not just a convention.

## Architectural Patterns

### Pattern 1: Fixed single-agent RAG pipeline (no orchestration graph)

**What:** Every chat turn runs the identical, non-branching sequence: entitlement → safety check → retrieve → assemble → stream → persist. There is no per-agent custom logic and no LLM-driven routing between steps.
**When to use:** Correct for this MVP — one agent, one knowledge base, one tool (`searchKnowledge`, always called, never model-chosen). A graph abstraction (LangGraph JS) would add indirection with no capability gained until agents need multi-step tool use or branching (explicitly deferred to P1+ in `HOW-AGENTS-WORK.md` §6).
**Trade-offs:** Simple to build and reason about; the ceiling is that adding a second tool or conditional branch later means retrofitting branching logic into what is currently a straight-line function, not extending a graph. Acceptable trade for a 4-week build.

### Pattern 2: Shared route, mode-flagged by data, not by URL

**What:** Sandbox chat (`build/[agentId]/test`) and hirer chat (`chat/[conversationId]`) hit the same `/api/chat` route; behavior forks on `conversations.is_sandbox` and on whether the retrieved chunks are also streamed back for the sources panel.
**When to use:** Good pattern whenever two user-facing flows share 95% of logic and differ only in access control and a bit of extra output — avoids duplicating the retrieval/prompt/streaming logic in two places.
**Trade-offs:** Requires the entitlement check (`canChat`) to correctly special-case `is_sandbox` first, before touching trial/paid logic, or a bug there is a security bug (free access) rather than a UX bug. Worth an explicit test case per entitlement branch.

### Pattern 3: Stripe Connect destination charges for a "platform owns the customer" marketplace

**What:** The platform charges the hirer directly (destination charge with `application_fee_amount`), transfers the expert's share to their Connect Express account, and holds the customer relationship, receipt, and tax ID.
**When to use:** This is the documented, correct pattern for platforms where the platform is the merchant of record and the connected account is just a payee — as opposed to **direct charges**, used when each seller has their own customer relationship and brand (Etsy/Airbnb-style). This marketplace fits the destination-charge case: hirers transact with "the platform," not directly with the expert. Confirmed against [Stripe's marketplace docs](https://docs.stripe.com/connect/end-to-end-marketplace) and [destination charges docs](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/destination-charges).
**Trade-offs:** Requires every expert to complete Connect Express onboarding before they can receive a destination-charge transfer. The MVP correctly handles the interim case (uncommitted expert) by charging to the platform account and recording a ledger liability instead of blocking the hire — that's the right fallback, not a workaround to unwind later.

## Data Flow

### Ingestion flow

```
Upload (Builder UI) → Supabase Storage (signed URL) → insert sources(queued)
      → POST /api/ingest {sourceId}  [service-role]
            → parse (unpdf/mammoth/raw/Jina) → chunk (~800 tok, ~100 overlap)
            → embed in batches of 64 (Voyage, input_type="document")
            → insert chunks → sources.status = ready
```
One-directional, one source at a time. Failure at any step sets `sources.status = failed` with an error string — the builder UI is the only consumer of that state.

### Chat flow

```
Hirer/Builder message → POST /api/chat
      → load conversation + agent (RLS-scoped read)
      → canChat() [billing] → 402 paywall if not entitled
      → safety pre-check → canned reply short-circuit if triggered
      → embed query (Voyage, input_type="query") [service-role]
      → hybrid_search(agent_id, embedding, k=8) [service-role, filtered by agent_id in SQL]
      → assemble prompt (byte-stable system prompt + numbered chunks + history + question)
      → streamText (Anthropic) → tokens to UI
      → onFinish: persist message + citations + tokens + latency; log llm_usage
```
The only branch point that changes user-visible behavior is the entitlement check — everything downstream of it is identical for sandbox and paid chat.

### Hire flow

```
Paywall hit → "Hire for $X"
  mock mode:   Server Action inserts purchases(paid) + 2 ledger rows → unlock
  stripe mode: POST /api/stripe/checkout → Stripe Checkout (destination charge,
               application_fee_amount = 20%) → redirect
               → webhook checkout.session.completed (signature-verified, idempotent
               by stripe_checkout_id) → upsert purchases → 2 ledger rows → unlock
```
Both modes converge on the same `purchases` + `ledger` write shape, which is why `PAYMENTS_MODE` can be a pure env-var switch rather than two code paths in the entitlement logic.

## Build Order (Dependency-Driven) — the critical output for roadmap phasing

This is the single most load-bearing section for phase planning. The dependency graph is not a straight line; it has one hard blocker (platform), one three-way parallel fan-out, one convergence point (sandbox), and one two-way integration (billing ⟷ runtime/marketplace) that needs the contract nailed down *before* both sides build against it.

```
Phase 0 — BLOCKS EVERYONE (must land before any other work starts)
  platform:  repo scaffold, CI, Supabase project + first migration (all tables + RLS),
             auth pages, app shell, lib/llm wrapper (usage log + spend cap),
             day-one shared contracts stubbed (searchKnowledge, canChat, buildPrompt,
             personaToSystemPrompt, chatModel/embed)

Phase 1 — PARALLEL (4 workstreams build independently against Phase 0 stubs)
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │ knowledge    │  │ runtime      │  │ billing      │  │ marketplace  │
  │ ingest+search│  │ chat route   │  │ canChat+mock │  │ browse+listing│
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │                 │
         └────────┬────────┘                 │                 │
                   ▼                          │                 │
Phase 1 convergence: builder (sandbox) — needs REAL knowledge.searchKnowledge()
                     AND real runtime chat route (not stubs) to be meaningful.
                     This is the first point where two workstreams' output must
                     both be genuinely functional, not just stubbed.
                                              │                 │
Phase 2 — TWO-WAY INTEGRATION (build the contract first, then both sides in parallel)
  billing (Stripe checkout) ⟷ runtime (402 paywall) ⟷ marketplace (hire CTA)
  builder (publish) ──────────────────────────────────────► marketplace (listing live)
```

**What this means for phase structure:**
- **Phase 0 cannot be parallelized across people.** It is one person's (or a shared first-day) critical path and every other phase depends on it existing, even in stub form. Treat it as a hard gate, not a workstream.
- **Phase 1's four workstreams are genuinely independent IF the day-one contracts are respected.** `knowledge`, `runtime`, `billing`, and `marketplace` do not call each other's real code in Phase 1 — they call the stubbed function signatures platform lands in Phase 0. This is what makes 4-person parallelism possible; if any workstream reaches past its stub into another's in-progress internals, the parallelism breaks.
- **The builder sandbox is the forced convergence point, not an independent workstream.** It cannot be "done" until knowledge and runtime are both real. Roadmap phases should place "sandbox works end-to-end" as its own milestone/checkpoint after knowledge + runtime, not bundle it into either workstream's phase.
- **Billing ⟷ runtime ⟷ marketplace is a three-party contract, highest integration risk after the AI core.** The entitlement shape (`Entitlement` type, `402 {reason:"paywall", price_cents}`) has to be fixed before billing builds Checkout and marketplace builds the hire button, or the three land three different shapes. This argues for the entitlement contract being part of Phase 0's day-one contracts (it already is, per `docs/ARCHITECTURE.md` §6) — the roadmap should treat "contract frozen" as a Phase 0 exit criterion, not a Phase 2 task.
- **Publish → marketplace-listing-live is one-directional and late.** It cannot start until persona + publish (builder) exists, so "marketplace goes live with real agents" is necessarily a Phase 2+ milestone, not Phase 1.

## Scaling Considerations

Not a near-term concern for this MVP, but worth stating so nobody over-engineers:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Demo / 0–100 hirers | Current design as-is. Single Vercel deploy, synchronous ingestion, Supabase free/Pro tier. |
| 1k–100k users | First bottlenecks: (1) Vercel's 300s function cap on ingestion of large PDFs — already flagged, mitigated by self-re-invocation; (2) synchronous ingestion blocking the builder UI — move to the already-planned fire-and-forget + polling/Realtime; (3) `chunks` table growth — HNSW index tuning and per-agent chunk caps (already planned: 50 files/5,000 chunks). |
| 100k+ users | Would justify a real queue (the explicitly-rejected pgmq/Edge Functions path, or an external queue) for ingestion, and possibly splitting ingestion into a separate worker deploy. Not a Phase 1–4 concern. |

## Anti-Patterns

### Anti-Pattern 1: Trusting RLS to protect the retrieval path

**What people do:** Point to "RLS on every table" as the tenant-isolation story for the whole system, including chat retrieval.
**Why it's wrong:** `/api/chat` and `/api/ingest` use the **service-role key**, which bypasses RLS entirely by design. For those paths, tenant isolation is enforced *only* by the `agent_id` parameter inside the `hybrid_search()` SQL function and the application code that supplies it — not by Postgres policy. This is fine and standard (service-role access for trusted server code is the normal pattern — see [multi-tenant RLS writeups](https://kawshik.dev/blog/multi-tenant-rag-pgvector-postgres-rls.html) on defense-in-depth), but it means RLS is not a safety net here; a bug in `hybrid_search`'s `agent_id` filter is a cross-tenant data leak with no second layer catching it.
**Do this instead:** Treat `hybrid_search(agent_id, ...)` as security-critical code requiring a specific test (query agent A, assert zero chunks from agent B), not just a functional test. Flag this explicitly to whoever owns `knowledge`.

### Anti-Pattern 2: Per-conversation free-trial counters without a per-hirer-per-agent ceiling

**What people do (and this design currently does):** Track `free_messages_used` on the `conversations` row. Each new conversation starts at zero.
**Why it's wrong:** Nothing in the current data model stops a hirer from starting a fresh conversation with the same agent to get another N free messages, repeatedly. This is a real revenue-leak gap in the current design, not a hypothetical — it's a direct consequence of scoping the counter to `conversations` instead of to `(hirer_id, agent_id)`.
**Do this instead:** Either scope the free-trial counter to `(hirer_id, agent_id)` (sum across conversations) or accept it as a known MVP gap and say so explicitly rather than silently. Flag this to the `billing` owner — it's a one-line entitlement-query change now, versus a data-migration later.

### Anti-Pattern 3: Treating "graph" abstractions as required for RAG chat

**What people do:** Reach for LangGraph, CrewAI, or similar orchestration frameworks by default for any "AI agent" product.
**Why it's wrong:** For a single fixed retrieval-then-generate pipeline with no model-chosen branching, a graph library adds a learning curve and a runtime dependency with no capability this design needs yet.
**Do this instead:** What this project already does — write the pipeline as a straight-line async function, and revisit LangGraph JS only when a real requirement (model-chosen tools, multi-step workflows) shows up. Explicitly deferred in `HOW-AGENTS-WORK.md` §6, correctly.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Postgres | Direct SQL via `@supabase/ssr` (browser/RLS-scoped) and service-role client (server, bypasses RLS) | Two distinct trust levels — never let service-role client code run in anything reachable from client input without validation |
| Supabase Storage | Signed upload URLs from builder; server-side reads only during ingestion | Never serve raw files to hirers |
| Supabase Auth | Cookie/JWT session; same claims drive RLS policies | Must use `getClaims()`/`getUser()` server-side, never `getSession()` (already flagged in source doc) |
| Voyage AI | Batched embedding calls (documents at ingest, single query at chat time), routed through `lib/llm` | `input_type` must be set correctly per call ("document" vs "query") or retrieval quality silently degrades |
| Anthropic Claude | `streamText` via AI SDK 7, routed through `lib/llm` | System prompt must stay byte-stable for prompt-cache hits — any per-request variation (e.g., a timestamp) defeats caching |
| Stripe | Checkout (destination charge) + Connect Express + webhook | Destination-charge pattern is correct for this platform-as-merchant-of-record model (confirmed above); webhook must verify signature on raw body and be idempotent by `stripe_checkout_id` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `builder` ↔ `knowledge` | `ingestSource()`, source status polling/read | Builder never touches chunking/embedding internals directly |
| `builder`/`marketplace`/hirer-chat ↔ `runtime` | Shared `/api/chat` route + `<ChatPanel>` component | Single integration surface for both flows (Pattern 2) |
| `runtime` ↔ `knowledge` | `searchKnowledge(agentId, query, k)` | Runtime never runs SQL directly against `chunks` |
| `runtime` ↔ `billing` | `canChat(userId, conversationId)` called before every generation | This call must be synchronous and fast (it's on the hot path of every message) |
| `marketplace` ↔ `billing` | `recordPurchase()`, `<HireButton>` | Marketplace never writes `purchases`/`ledger` rows directly |
| All workstreams ↔ `platform` | `lib/supabase/*`, `lib/llm/*`, `lib/db.types.ts` | Single regeneration owner for `db.types.ts` per migration PR to avoid merge conflicts (already flagged in source doc) |

## Sources

- [Building Multi-Tenant RAG Applications With PostgreSQL — TigerData](https://www.tigerdata.com/blog/building-multi-tenant-rag-applications-with-postgresql-choosing-the-right-approach) — confirms shared-table-with-tenant-key over database-per-tenant as the standard default at this scale.
- [Building successful multi-tenant RAG applications — The Nile](https://www.thenile.dev/blog/multi-tenant-rag) — corroborates the same pattern.
- [The Multi-Tenant RAG Nightmare: Securing pgvector with PostgreSQL RLS](https://kawshik.dev/blog/multi-tenant-rag-pgvector-postgres-rls.html) — source for the RLS-vs-service-role distinction cited in Anti-Pattern 1.
- [Stripe — Build a marketplace](https://docs.stripe.com/connect/end-to-end-marketplace) and [Destination charges](https://docs.stripe.com/connect/marketplace/tasks/accept-payment/destination-charges) — confirms destination-charge + `application_fee_amount` is the correct, documented pattern for a platform-as-merchant-of-record marketplace, matching this design's Stripe choice.
- Internal: `docs/ARCHITECTURE.md`, `docs/HOW-AGENTS-WORK.md`, `docs/WORKSTREAMS.md`, `docs/MVP-SCOPE.md` (source design documents, already authored — this file sanity-checks and restructures them).

---
*Architecture research for: Expert-agent RAG marketplace*
*Researched: 2026-09-26*
