# Workstreams

Six workstreams, four people. Each workstream owns specific folders (see the tree in [ARCHITECTURE.md §3](ARCHITECTURE.md#3-repo-layout-and-ownership)) and a GitHub label. Every issue and PR carries exactly one workstream label.

## Assignment

Fill in on kickoff day. Suggested pairing so each person owns one "front" and one "back" piece and nobody is blocked on a single person for the AI core:

| Person | Primary | Secondary | GitHub |
|---|---|---|---|
| — | `platform` (week 0) → `builder` (weeks 1–4) | — | @tylersue / @AustinHan07 / @jonathankwon / @22joshlee |
| — | `knowledge` | `runtime` safety + logging | |
| — | `runtime` | `billing` entitlements | |
| — | `marketplace` | `billing` Stripe + ledger + earnings | |

Rule: **the AI core (knowledge + runtime) must never be one person.** It is the riskiest part and the demo lives or dies on it.

Once assigned, update `.github/CODEOWNERS` (uncomment the lines and put the usernames in).

## Workstream definitions

### `platform` — the ground everyone stands on

**Owns:** `.github/`, `docs/`, `proxy.ts`, `app/(auth)/`, `app/(app)/layout.tsx`, `app/admin/`, `lib/`, `components/ui/`, `supabase/`, `scripts/`.

**Delivers first** (week 0, blocks everyone): repo scaffold, CI, Supabase project, first migration with all tables + RLS, auth pages, app shell, `.env.example`, `lib/llm` wrapper with usage logging + spend cap, the day-one shared contracts as stubs.

**Delivers later:** seed script with 3 real demo agents (week 3), admin review queue and metrics (P1), error and empty states across the app, mobile-width pass.

**Interfaces it exposes:** `lib/supabase/*`, `lib/llm/*`, `lib/db.types.ts`, `lib/env.ts`.

### `builder` — the expert's side

**Owns:** `app/(app)/build/**`, `features/builder/`.

**P0:** agents list; persona form (name, category, headline, description, how-I-work, always/never lists, example questions, greeting) saving to `agents.persona`; `personaToSystemPrompt()` template; "Advanced" toggle to view/edit the raw prompt; knowledge page (upload UI, per-source status list, delete); sandbox page (chat + retrieved-sources panel); publish page (free-trial count, price, publish/unpublish).

**P1:** drag-and-drop upload, single-URL ingestion trigger, "correct this answer" pinned chunks, onboarding hints.

**Depends on:** `knowledge` for `ingestSource()` and source status; `runtime` for the chat route in sandbox mode; `platform` for schema and shell.

### `knowledge` — ingestion and retrieval

**Owns:** `app/api/ingest/`, `features/knowledge/`, the `sources` and `chunks` tables and the `hybrid_search` function (via migrations reviewed by `platform`).

**P0:** parsers for PDF (`unpdf`, per page), DOCX (`mammoth`), TXT/MD; recursive chunker (~800 tokens, ~100 overlap, keeps page + heading path); Voyage embedding with batching; `ingestSource()` that moves a source `queued → processing → ready | failed`; `searchKnowledge()` vector top-k filtered by `agent_id`; per-agent limits (50 files / 100 MB / 5,000 chunks).

**P1:** hybrid search with RRF; async ingestion with self-re-invocation for big PDFs; URL via Jina Reader; pinned chunks.

**Depends on:** `platform` for schema, storage bucket, `lib/llm/embed`.

**Exposes:** `searchKnowledge()`, `ingestSource()`, `RetrievedChunk`.

### `runtime` — the chat engine

**Owns:** `app/api/chat/`, `app/(app)/chat/**`, `features/runtime/`.

**P0:** `POST /api/chat` with AI SDK 7 `streamText`; `buildPrompt()` with grounding rules and numbered context; citation markers `[n]` parsed into hover cards in the chat UI; entitlement check via `canChat()` before every message with a `402` paywall response the UI turns into the hire prompt; history windowing (last 10 turns); category disclaimer on first turn; safety pre-check with canned resource reply; persist messages with citations, tokens, latency; sandbox mode that also streams the retrieved chunks for the builder's sources panel.

**P1:** thumbs up/down; conversation summary after N turns; latency tuning (prompt caching verification, model per agent).

**Depends on:** `knowledge` for `searchKnowledge()`; `billing` for `canChat()`; `platform` for `lib/llm`.

**Exposes:** the chat route contract (`{conversationId, message}` in, UI message stream out, `402 {reason:"paywall", price_cents}` on block) and the `<ChatPanel>` component used by both sandbox and hirer chat.

### `marketplace` — the hirer's side (discovery)

**Owns:** `app/(marketing)/`, `app/(app)/marketplace/`, `app/(app)/agents/[slug]/`, `features/marketplace/`.

**P0:** landing page with the two-sided pitch and CTAs; browse grid of `published` agents with category filter, sort (rating / newest / most used), text search; listing page with expert card (photo, credentials, years), headline, description, clickable example questions, price + free-trial note, required disclaimer for regulated categories, "Start chatting" → creates conversation → routes to chat.

**P1:** ratings and reviews (after 5 messages), expert public profile page, featured row, agent cards showing usage count.

**Depends on:** `platform` for schema + shell; `runtime` for the conversation creation action.

### `billing` — money

**Owns:** `app/api/stripe/**`, `app/(app)/earnings/`, `features/billing/`, the `purchases` and `ledger` tables.

**P0:** `canChat()` entitlement logic (sandbox / trial counter / paid); `PAYMENTS_MODE=mock` hire action that writes `purchases` + ledger rows; Stripe Checkout session creation (test mode); webhook handler with signature verification and idempotency; ledger split (platform fee 20% / expert earnings); earnings page (gross / fee / net / pending).

**P1:** Stripe Connect Express onboarding + `account.updated` webhook; destination charges once an expert is connected.

**P2:** admin "pay out" transfer; subscriptions; credits.

**Depends on:** `platform` for schema; `runtime` calls `canChat()`.

**Exposes:** `canChat()`, `recordPurchase()`, `<HireButton>`.

## Dependency order

```
week 0:  platform ──────────────────────────────────────────────┐
                                                                 ▼
week 1:  knowledge(ingest, search)   runtime(chat route)   billing(canChat + mock)   marketplace(browse, listing)
              │                           │                      │                         │
              └──────────► builder(sandbox uses both) ◄──────────┘                         │
                                                                                            │
week 2:  builder(publish) ────────────────────────────────────────────────────────────► marketplace(listing live)
         billing(Stripe checkout) ◄──────────────── runtime(402 paywall) ◄───────────── marketplace(hire CTA)
```

If a dependency isn't ready, integrate against the stub. Stubs live in the same file as the eventual implementation and are marked `// STUB` so a grep finds them all.

## How to pick up work

1. Open the project board, filter by your workstream label.
2. Take the top `P0` card in **This week** that has no assignee. Assign yourself. Move to **In progress**.
3. Branch `<workstream>/<short-thing>`. Open a draft PR early so the Vercel preview exists.
4. When it's green and clicked through on the preview, mark ready for review and request the owner of any other folder you touched.
5. Squash-merge, delete the branch, move the card to **Done**, take the next one.
