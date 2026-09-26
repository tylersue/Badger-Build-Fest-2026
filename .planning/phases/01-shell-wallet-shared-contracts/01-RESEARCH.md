# Phase 1: Shell, Wallet & Shared Contracts - Research

**Researched:** 2026-09-26 (inline; gsd-phase-researcher not installed)
**Question:** What do I need to know to plan this phase well?
**Confidence:** HIGH on scaffold commands and Supabase CLI (official docs fetched today); HIGH on LangSmith measurements (live app); MEDIUM on the wallet SQL design (standard pattern, not yet exercised in this repo).

## Summary

Phase 1 is a greenfield scaffold plus real wallet mechanics plus stub contracts. Nothing here is novel; the risk is version drift (Next 16, Tailwind v4, shadcn CLI, AI SDK 7) and the two deliberate departures from the older docs: **no auth** (so every database call is server-side with the service-role key) and **placeholder content over real mechanics** (seed data is the product surface for the presentation).

## Scaffold (verified against ui.shadcn.com and nextjs.org, 2026-09-26)

- Create the app with `pnpm create next-app@latest` (TypeScript, Tailwind, ESLint, App Router, `@/*` alias, no `src/`). Next 16 defaults to Turbopack and React 19.2. **The repo root already holds `docs/`, `.planning/`, `.github/`, `README.md`, `CONTRIBUTING.md`, `.env.example`**; `create-next-app` refuses a non-empty directory, so scaffold into a temp directory and move the generated files in, keeping the repo's `README.md`, `CONTRIBUTING.md`, `.gitignore` (merged) and `.env.example` (rewritten in this phase).
- Pin the package manager: `"packageManager": "pnpm@11.<installed minor>"` (STACK.md: avoid pnpm 12).
- shadcn: `pnpm dlx shadcn@latest init` inside the app, then `pnpm dlx shadcn@latest add sidebar button input textarea badge table tabs sheet dialog dropdown-menu popover avatar scroll-area separator tooltip skeleton switch select card collapsible sonner`. Init writes `components.json`, `app/globals.css` (Tailwind v4 `@theme inline` + CSS variables) and `lib/utils.ts`. Components import from `@/components/ui/*`. `components/ui/` is add-only (CONTRIBUTING.md).
- Dark only (UI-SPEC): `<html lang="en" class="dark">`; override the shadcn variables under `.dark` in `globals.css` with the UI-SPEC hex tokens. Map: `--background #09090f`, `--card/--popover #0d0f18`, `--primary #006ddd`, `--primary-foreground #fff`, `--secondary #111521`, `--muted #1b2030`, `--muted-foreground #8790ab`, `--accent #0c336a`, `--accent-foreground #5fbef8`, `--destructive #f04438`, `--border #282e42`, `--input #393f55`, `--ring #0078f1`, `--sidebar #0d0f18`, `--sidebar-foreground #f5f8fb`, `--sidebar-primary #0078f1`, `--sidebar-accent #0c336a`, `--sidebar-accent-foreground #5fbef8`, `--sidebar-border #111521`, `--sidebar-ring #0078f1`, `--radius 4px`. Extra custom properties for the spec's surface-2/3, success, warning, text-secondary/tertiary.
- Sidebar block API: `SidebarProvider` (props `defaultOpen`, `open`, `onOpenChange`; persists open state in the `sidebar_state` cookie; `⌘B`/`Ctrl+B` toggles), `Sidebar collapsible="icon"`, `SidebarHeader`, `SidebarContent`, `SidebarGroup` + `SidebarGroupLabel`, `SidebarMenu` + `SidebarMenuButton isActive`, `SidebarFooter`, `SidebarInset`, `SidebarTrigger`, `SidebarRail`. Width via CSS variables on the provider: `style={{ "--sidebar-width": "244px", "--sidebar-width-icon": "48px" }}`.
- Font: `next/font/google` Inter, applied on `<body>`; `font-variant-numeric: tabular-nums` utility class for amounts.
- Icons: `lucide-react` (installed by shadcn init).
- Next 16 notes: `cookies()` and `headers()` are async (`await cookies()`); Server Actions use `'use server'`; `revalidatePath` after a cookie change. `proxy.ts` (the `middleware.ts` rename) is **not needed** in Phase 1 because there is no auth session to refresh.

## Supabase without Auth (verified against supabase.com/docs, 2026-09-26)

- Cloud project only; skip `supabase start` (needs Docker) for the 4-week team. Commands: `supabase init` (creates `supabase/config.toml`), `supabase link --project-ref <ref>` (needs `SUPABASE_ACCESS_TOKEN` for non-interactive use, plus the DB password), `supabase migration new <name>` (creates `supabase/migrations/<timestamp>_<name>.sql`), `supabase db push --linked` (applies migrations; `--dry-run` to preview; `--include-seed` also runs the seed files declared in config), `supabase gen types typescript --linked > lib/db.types.ts`.
- Seed: `supabase/seed.sql` runs locally on `db reset`; remotely only with `supabase db push --include-seed`. Declare in `config.toml`: `[db.seed] enabled = true sql_paths = ['./seed.sql']`. Seed files should contain inserts only. Make every insert idempotent (`insert ... on conflict (id) do nothing`) with fixed UUIDs so re-running is safe.
- Access pattern: a single server-only client built from `SUPABASE_SERVICE_ROLE_KEY` in `lib/supabase/admin.ts`, imported only from Server Components, Server Actions and route handlers (`import 'server-only'`). No browser client in Phase 1. No RLS policies (CONTEXT D-01); tables are created without `enable row level security`. The anon key stays in `.env.example` for later phases but nothing reads it yet.
- pgvector: `create extension if not exists vector;` and `embedding vector(1024)` on `chunks` (nullable in Phase 1; Voyage `voyage-4-lite` is 1024-d and fixed). Do not create the HNSW index yet (STACK.md: create after first bulk load).
- Schema push gate (plan-phase §5.7): the phase creates `supabase/migrations/*.sql`, so a `[BLOCKING]` task must run `supabase db push --linked` before verification; types are generated from the live database afterwards.

## Wallet mechanics (D-09, D-10, D-11, D-12)

Real, atomic, and testable. Put the money logic in Postgres functions called via `supabase.rpc(...)` so a reservation and a settlement cannot interleave:

- Tables: `wallets(identity_id pk, balance_cents int not null default 0, reserved_cents int not null default 0, updated_at)`, `ledger(id, identity_id, kind, amount_cents signed, balance_after, purpose, ref_type, ref_id, note, created_at)`, `reservations(id, identity_id, purpose, estimate_cents, status held|settled|released, created_at, settled_at)`, `llm_usage(id, identity_id, agent_id, purpose, model, tokens_in, tokens_out, cache_read_tokens, cost_cents numeric(10,4), latency_ms, reservation_id, created_at)`.
- `wallet_reserve(p_identity uuid, p_purpose text, p_estimate_cents int) returns uuid`: `select ... for update` on the wallet row; if `balance_cents - reserved_cents < p_estimate_cents` raise `INSUFFICIENT_CREDITS`; insert a `held` reservation; add to `reserved_cents`. This is the hard stop at zero.
- `wallet_settle(p_reservation uuid, p_actual_cents int, p_ref_type text, p_ref_id uuid, p_note text) returns int` (new balance): lock wallet; subtract the estimate from `reserved_cents`; debit `least(p_actual_cents, balance_cents)` and record any shortfall in `note`; insert a `debit` ledger row with `balance_after`; mark the reservation `settled`.
- `wallet_release(p_reservation uuid)`: for failed calls.
- `wallet_grant(p_identity uuid, p_kind text, p_amount_cents int, p_note text) returns int`: kinds `seed | subscription | pack | earnings | cashout` (cashout negative, Phase 4); inserts the ledger row and updates the balance. Mock Subscribe/Buy pack call this and are repeatable (D-11).
- Typical-call estimates live in config (`lib/config/credits.ts`): `TYPICAL_CALL_CENTS = { interview_turn: 2, embedding: 1, sandbox_message: 3, chat_message: 3 }`, `SEED_BALANCE_CENTS = 5000`, `SUBSCRIPTION_GRANT_CENTS = 2000`, `PACK_GRANT_CENTS = 1000`, `PLATFORM_MARGIN_SHARE = 0.15` (D-13). Listing "typical cost per message" = `chat_message × multiplier`.
- Tests: pure functions (`estimateCents`, `costCentsFromUsage`, `splitUsageCharge`) get vitest unit tests; the SQL functions get an integration test that runs only when `SUPABASE_TEST_URL` is set (against the linked project, using fixed test identity ids and cleaning up), so CI without secrets stays green.

## LLM registry and pricing (from the claude-api skill, cached 2026-06-24, and STACK.md)

- Model ids: default `claude-sonnet-5` ($2 in / $10 out per MTok), utility `claude-haiku-4-5` ($1 / $5), quality tier `claude-opus-5-5` ($4 / $20). Embeddings `voyage-4-lite` $0.02 per MTok. Cache reads ≈ 5% of input price (Opus 5.5: $0.20). Put these in `lib/llm/pricing.ts` as cents per million tokens; `costCentsFromUsage()` computes `(in × in_price + out × out_price + cache_read × cache_price) / 1e6`.
- Per-category model config (PERS-03, a Phase 1 contract): `MODEL_BY_CATEGORY` in `lib/llm/registry.ts`, all `claude-sonnet-5` for now; safety-relevant categories may pin a different tier later.
- **No real LLM call ships in Phase 1.** `lib/llm/index.ts` exposes `chatModel(id)` and `embed(texts, inputType)` signatures plus `withUsageLogging(purpose, identityId, fn)` that wraps reserve → call → settle. In Phase 1 the wrapped call is a stub returning canned text and fake token counts so the wallet path is exercised end to end. When Phase 2 wires the real SDK, the executor must load the `claude-api` skill first (API drift: adaptive thinking, `output_config`, no prefill, `Output.object` in AI SDK 7).

## Identity switcher (D-02)

- `identities(id, kind expert|hirer, display_name, avatar_initial, is_switchable bool)` with two switchable rows (Maria Chen, expert; Sam Okafor, hirer) and one row per seeded non-switchable expert. `profiles(identity_id pk, field, credentials, years_experience, contact_url, bio, avatar_url)` for experts.
- Current identity = cookie `bx_identity` (identity id), read in `lib/identity.ts#getCurrentIdentity()` (falls back to Maria when missing); `switchIdentity(id)` is a Server Action that sets the cookie (httpOnly, sameSite lax, 1 year) and calls `revalidatePath('/', 'layout')`. The layout passes the identity to the sidebar (name, avatar, role line, balance) and hides the expert-only groups for the hirer.

## Seed content (D-03, D-19, SHEL-03)

Fixed UUIDs (`00000000-0000-4000-8000-0000000000NN`). Six published agents across the three seed categories (the mockup's: Maria Chen · Physical therapy; Dev Patel · Tax for freelancers; Priya Nair · College admissions; Luis Ortega · Strength coaching; Hannah Kim · First-job finances; Tom Reyes · Resume & interviews) plus one draft for Maria (Running form clinic). Ratings, multipliers, example questions, greeting and headline per agent. `sources` rows with `chunk_count` (no chunk rows needed yet). Three conversations for Sam with a handful of messages carrying placeholder `citations` JSON. Ledger history for Maria and Sam that nets to exactly 5,000 credits each (D-09); `llm_usage` rows matching the debits. Both wallets `reserved_cents = 0`.

## Verification tooling

- `vitest` for units (`pnpm test`), `tsc --noEmit` and `next lint` in CI (`.github/workflows/ci.yml`, pnpm cache).
- Playwright smoke spec (`tests/e2e/shell.spec.ts`) visits every route in D-07, asserts the page heading and that the sidebar shows the active identity, switches identity through the footer popover and asserts the footer line changes. Run locally with `pnpm test:e2e`; CI installs chromium with `pnpm exec playwright install --with-deps chromium`.
- Vercel: `vercel link`, `vercel env add`, `vercel --prod` with a `VERCEL_TOKEN`; Supabase link with `SUPABASE_ACCESS_TOKEN`. Both tokens are the only human-required setup.

## Pitfalls specific to this phase

1. `create-next-app` in a non-empty directory: scaffold in a temp dir and move.
2. shadcn init on Tailwind v4 writes oklch tokens; replacing them wholesale with hex is fine, but keep the variable **names** shadcn components expect.
3. `cookies()` is async in Next 16; a sync call compiles under some configs and returns an empty jar.
4. Service-role key: `import 'server-only'` in `lib/supabase/admin.ts` so a client component import fails the build instead of leaking the key.
5. `supabase db push --include-seed` re-runs seeds; every seed statement must be `on conflict do nothing`.
6. Vercel needs `SUPABASE_SERVICE_ROLE_KEY` as an encrypted env var; never `NEXT_PUBLIC_`.
7. Scope language: no "placeholder for now" in code comments where the mechanic is supposed to be real (wallet, ledger, switcher). Placeholder is only the seed content.

## Sources

- shadcn installation (Next): https://ui.shadcn.com/docs/installation/next — fetched 2026-09-26
- shadcn Sidebar: https://ui.shadcn.com/docs/components/sidebar — fetched 2026-09-26
- Supabase seeding: https://supabase.com/docs/guides/local-development/seeding-your-database — fetched 2026-09-26
- Supabase `db push`: https://supabase.com/docs/reference/cli/supabase-db-push — fetched 2026-09-26
- LangSmith / Fleet live app measurements: `.planning/phases/01-shell-wallet-shared-contracts/refs/` and `01-UI-SPEC.md`
- `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `docs/ARCHITECTURE.md` §3–§6
- claude-api skill model table (cached 2026-06-24)

---
*Phase: 01-shell-wallet-shared-contracts*
*Researched: 2026-09-26*
