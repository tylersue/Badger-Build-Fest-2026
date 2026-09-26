---
phase: 01-shell-wallet-shared-contracts
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/config.toml
  - supabase/.gitignore
  - supabase/migrations/20260926180000_core_schema.sql
  - supabase/migrations/20260926180100_wallet.sql
  - supabase/seed.sql
autonomous: true
requirements: [SHEL-02, SHEL-03, AUTH-03, CRED-01, CRED-06]

must_haves:
  truths:
    - "The agreed schema covers the whole loop: identities, profiles, agents, sources, chunks (vector 1024), interview sessions/turns, conversations, messages, ratings, flags, wallets, ledger, reservations, llm_usage, payouts"
    - "No table enables RLS or defines a policy (D-01), and the anon/authenticated roles have no privileges on any table or function, so the public anon key cannot read or write data"
    - "wallet_reserve refuses with INSUFFICIENT_CREDITS when balance minus reserved is below the estimate, and no wallet balance can go below zero (D-10)"
    - "wallet_grant adds credits and writes a ledger row every time it is called, with no subscribed state (D-11)"
    - "Seed gives two switchable identities (Maria Chen expert, Sam Okafor hirer), each with a 5,000-credit wallet whose ledger history sums to exactly 5,000 (D-02, D-09, D-12)"
    - "Seed gives six published agents across health_pt, tax_finance and career_admissions plus one draft, with ratings, sources, conversations, messages with citations, interview turns and an editable expert profile (D-03, D-19, SHEL-03)"
    - "Seed and migrations apply cleanly twice in a row on Postgres 17 + pgvector (idempotent seed)"
  artifacts:
    - path: "supabase/migrations/20260926180000_core_schema.sql"
      provides: "Core loop tables, pgvector, updated_at trigger, anon/authenticated lockdown"
      contains: "vector(1024)"
    - path: "supabase/migrations/20260926180100_wallet.sql"
      provides: "wallets, ledger, reservations, llm_usage, payouts; wallet_reserve/settle/release/grant; demo_reset"
      contains: "INSUFFICIENT_CREDITS"
    - path: "supabase/seed.sql"
      provides: "Idempotent fixed-UUID seed for identities, profiles, agents, sources, chunks, interview, conversations, messages, ratings, wallets, ledger, llm_usage"
      contains: "on conflict"
    - path: "supabase/config.toml"
      provides: "Supabase CLI config with seed enabled"
      contains: "sql_paths"
  key_links:
    - from: "supabase/config.toml"
      to: "supabase/seed.sql"
      via: "[db.seed] sql_paths"
      pattern: "seed\\.sql"
    - from: "supabase/seed.sql"
      to: "wallets / ledger"
      via: "per-identity ledger sum equals wallets.balance_cents"
      pattern: "insert into (public\\.)?ledger"
    - from: "supabase/migrations/20260926180100_wallet.sql"
      to: "public.wallets"
      via: "select ... for update inside wallet_* functions"
      pattern: "for update"
---

<objective>
Write the Phase 1 database as SQL files: the agreed schema for the whole loop, the real wallet mechanics as Postgres functions, and an idempotent seed that makes every page look lived-in. This plan only writes and locally validates SQL; plan 01-03 pushes it to the linked cloud project.

Purpose: the schema, wallet rules (D-09, D-10, D-11) and seed content (D-02, D-03, D-12, D-19) are the contracts every lane reads and writes from Phase 2 on.
Output: supabase/config.toml, two migrations, seed.sql — validated in a throwaway Postgres 17 + pgvector container.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md
@.planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md
@docs/ARCHITECTURE.md

<conventions>
- Seed IDs: every seeded row uses a fixed UUID `00000000-0000-4000-80TT-0000000000NN`, where TT is the entity type and NN the row number: 01 identities, 02 agents, 03 sources, 04 chunks, 05 conversations, 06 messages, 07 interview_sessions, 08 interview_turns, 09 ledger, 10 llm_usage, 11 ratings. Runtime rows use `gen_random_uuid()`. `demo_reset()` relies on this prefix (`00000000-0000-4000-80`) to tell seed rows from runtime rows.
- Key seeded IDs used by later plans and the e2e spec: Maria Chen `00000000-0000-4000-8001-000000000001`; Sam Okafor `00000000-0000-4000-8001-000000000002`; Maria's published agent `00000000-0000-4000-8002-000000000001` (slug `maria-chen-physical-therapy`); Maria's draft agent `00000000-0000-4000-8002-000000000007`; Sam's knee conversation `00000000-0000-4000-8005-000000000001`.
- JSON shapes shared with TypeScript contracts (plan 01-04 defines the matching types — keep keys identical):
  - `agents.persona` (PersonaForm): `name`, `category`, `headline`, `description`, `howIWork`, `always` (string array), `never` (string array), `exampleQuestions` (string array), `greeting`.
  - `messages.citations` (Citation[]): objects with `n` (1-based int), `chunkId` (uuid or null), `sourceType` ('interview' | 'document'), `sourceName`, `question` (string or null), `page` (int or null), `headingPath` (string or null).
- Category ids: `health_pt`, `tax_finance`, `career_admissions`. Metered purposes: `interview_turn`, `embedding`, `sandbox_message`, `chat_message`. 1 credit = 1 cent, all money columns are integer cents except llm_usage.cost_cents (numeric raw cost).
</conventions>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Supabase init and core loop schema migration</name>
  <files>supabase/config.toml, supabase/.gitignore, supabase/migrations/20260926180000_core_schema.sql</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Supabase without Auth", "Identity switcher", "Seed content")
    - .planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md (D-01, D-02, D-16, D-19)
    - docs/ARCHITECTURE.md §4 (data model starting point: drop stripe_account_id, purchases, free_trial_messages, price_cents, agents.model; no RLS)
    - .planning/research/PITFALLS.md (Pitfall 8 — seeded social proof) and .planning/research/ARCHITECTURE.md (Anti-Pattern 1 — agent_id filter is the isolation boundary)
  </read_first>
  <action>
1. At the repo root run `supabase init` (answer N to any editor-settings prompt). In supabase/config.toml set `project_id = "badger-experts"` and in `[db.seed]` set `enabled = true` and `sql_paths = ["./seed.sql"]`. Keep all other defaults.
2. Create `supabase/migrations/20260926180000_core_schema.sql` containing, in this order:
   - `create extension if not exists vector with schema extensions;`
   - Function `public.set_updated_at()` returns trigger, sets `new.updated_at = now()`; attach a `before update` trigger to every table below that has `updated_at`.
   - `identities`: `id uuid primary key default gen_random_uuid()`, `kind text not null check (kind in ('expert','hirer'))`, `display_name text not null`, `avatar_initial text not null`, `avatar_color text not null default '#5a4636'`, `avatar_url text`, `is_switchable boolean not null default false`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
   - `profiles`: `identity_id uuid primary key references identities(id) on delete cascade`, `field text`, `credentials text`, `years_experience int check (years_experience between 0 and 70)`, `contact_url text`, `bio text`, `location text`, `created_at`, `updated_at`.
   - `agents`: `id uuid pk default gen_random_uuid()`, `owner_id uuid not null references identities(id)`, `slug text not null unique`, `name text not null`, `category text not null check (category in ('health_pt','tax_finance','career_admissions'))`, `icon text not null default 'bot'`, `headline text`, `description text`, `persona jsonb not null default '{}'::jsonb`, `system_prompt text`, `greeting text`, `example_questions text[] not null default '{}'`, `status text not null default 'draft' check (status in ('draft','published','unpublished'))`, `rate_multiplier numeric(3,2) not null default 1 check (rate_multiplier between 1 and 5)`, `consent_accepted_at timestamptz`, `rating_avg numeric(2,1) not null default 0`, `rating_count int not null default 0`, `usage_count int not null default 0`, `published_at timestamptz`, `created_at`, `updated_at`. No model column: the model is set per category in config (PERS-03).
   - `sources`: `id`, `agent_id uuid not null references agents(id) on delete cascade`, `kind text not null check (kind in ('interview','pdf','docx','txt','md','text'))`, `name text not null`, `storage_path text`, `status text not null default 'queued' check (status in ('queued','processing','ready','failed'))`, `error text`, `chunk_count int not null default 0`, `page_count int`, `bytes bigint not null default 0`, `created_at`, `updated_at`.
   - `chunks`: `id`, `agent_id uuid not null references agents(id) on delete cascade`, `source_id uuid not null references sources(id) on delete cascade`, `position int not null default 0`, `page int`, `heading_path text`, `question text` (interview answers carry the question they answered), `content text not null`, `embedding extensions.vector(1024)` (nullable; Voyage voyage-4-lite is 1024-d), `fts tsvector generated always as (to_tsvector('english', content)) stored`, `pinned boolean not null default false`, `created_at`, `updated_at`. No HNSW index yet (STACK.md: create after first bulk load).
   - `interview_sessions`: `id`, `agent_id uuid not null references agents(id) on delete cascade`, `status text not null default 'active' check (status in ('active','paused','completed'))`, `turn_count int not null default 0`, `created_at`, `updated_at`.
   - `interview_turns`: `id`, `session_id uuid not null references interview_sessions(id) on delete cascade`, `agent_id uuid not null references agents(id) on delete cascade`, `position int not null`, `question text not null`, `answer text`, `chunk_id uuid references chunks(id) on delete set null`, `created_at`, `updated_at`, `unique (session_id, position)`.
   - `conversations`: `id`, `agent_id uuid not null references agents(id) on delete cascade`, `hirer_id uuid not null references identities(id)`, `is_sandbox boolean not null default false`, `title text not null default 'New conversation'`, `share_transcript boolean not null default false` (CHAT-09 default off), `message_count int not null default 0`, `spent_cents int not null default 0`, `last_message_at timestamptz`, `created_at`, `updated_at`.
   - `messages`: `id`, `conversation_id uuid not null references conversations(id) on delete cascade`, `role text not null check (role in ('user','assistant'))`, `content text not null`, `citations jsonb not null default '[]'::jsonb`, `feedback text check (feedback in ('up','down'))`, `cost_cents int`, `tokens_in int`, `tokens_out int`, `model text`, `latency_ms int`, `created_at timestamptz not null default now()`.
   - `ratings`: `id`, `agent_id uuid not null references agents(id) on delete cascade`, `hirer_id uuid not null references identities(id)`, `stars int not null check (stars between 1 and 5)`, `created_at`, `unique (agent_id, hirer_id)`.
   - `flags`: `id`, `target_type text not null check (target_type in ('agent','conversation'))`, `agent_id uuid references agents(id) on delete cascade`, `conversation_id uuid references conversations(id) on delete cascade`, `reporter_id uuid references identities(id)`, `reason text not null`, `status text not null default 'open' check (status in ('open','resolved'))`, `resolution_note text`, `created_at timestamptz not null default now()`, `resolved_at timestamptz`.
   - Indexes: `agents(owner_id)`, `agents(status)`, `sources(agent_id)`, `chunks(agent_id)`, GIN on `chunks(fts)`, `interview_turns(agent_id)`, `conversations(hirer_id)`, `conversations(agent_id)`, `messages(conversation_id, created_at)`, `flags(status)`.
   - Do NOT write `enable row level security` or any `create policy` (D-01).
   - Lockdown (end of file): `revoke all on all tables in schema public from anon, authenticated;`, `revoke all on all sequences in schema public from anon, authenticated;`, `revoke execute on all functions in schema public from public, anon, authenticated;`, `alter default privileges in schema public revoke all on tables from anon, authenticated;`, `alter default privileges in schema public revoke all on sequences from anon, authenticated;`, `alter default privileges in schema public revoke execute on functions from public, anon, authenticated;`. Add a SQL comment above explaining: no RLS in the presentation MVP (D-01), so the Data API is closed to the anon key and all access goes through the server-only service-role client.
  </action>
  <verify>
    <automated>test -f supabase/config.toml && grep -c 'sql_paths' supabase/config.toml && grep -v '^\s*--' supabase/migrations/20260926180000_core_schema.sql | grep -ciE 'enable row level security|create policy'</automated>
  </verify>
  <acceptance_criteria>
    - supabase/config.toml contains `project_id = "badger-experts"`, `enabled = true` under `[db.seed]` and `sql_paths = ["./seed.sql"]`
    - core migration contains `create extension if not exists vector with schema extensions`, `extensions.vector(1024)`, `create table` for each of identities, profiles, agents, sources, chunks, interview_sessions, interview_turns, conversations, messages, ratings, flags
    - core migration contains `check (category in ('health_pt','tax_finance','career_admissions'))` and `share_transcript boolean not null default false`
    - `grep -v '^\s*--' supabase/migrations/20260926180000_core_schema.sql | grep -ciE 'enable row level security|create policy'` prints 0
    - core migration contains `revoke all on all tables in schema public from anon, authenticated` and `revoke execute on all functions in schema public from public, anon, authenticated`
    - core migration contains no `hnsw`
  </acceptance_criteria>
  <done>Supabase CLI config with seeding enabled and the full core schema, closed to anon/authenticated, exist as files.</done>
</task>

<task type="auto">
  <name>Task 2: Wallet migration — tables and atomic reserve/settle/release/grant functions, demo_reset</name>
  <files>supabase/migrations/20260926180100_wallet.sql</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Wallet mechanics (D-09, D-10, D-11, D-12)")
    - .planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md (D-09, D-10, D-11, D-12, D-13)
    - supabase/migrations/20260926180000_core_schema.sql (identities/agents/conversations names, set_updated_at trigger, lockdown pattern)
  </read_first>
  <action>
Create `supabase/migrations/20260926180100_wallet.sql`:
1. Tables:
   - `wallets`: `identity_id uuid primary key references identities(id) on delete cascade`, `balance_cents int not null default 0 check (balance_cents >= 0)`, `reserved_cents int not null default 0 check (reserved_cents >= 0)`, `updated_at timestamptz not null default now()` (+ set_updated_at trigger).
   - `ledger`: `id uuid pk default gen_random_uuid()`, `identity_id uuid references identities(id) on delete cascade`, `kind text not null check (kind in ('seed','subscription','pack','debit','earnings','cashout','platform_cost','platform_margin'))`, `amount_cents int not null` (signed: credits positive, debits negative), `balance_after int`, `purpose text check (purpose in ('interview_turn','embedding','sandbox_message','chat_message'))`, `ref_type text`, `ref_id uuid`, `note text`, `created_at timestamptz not null default now()`; table check `((kind in ('platform_cost','platform_margin')) = (identity_id is null))` so platform rows have no identity and every other row has one; index `(identity_id, created_at desc)` and `(ref_type, ref_id)`.
   - `reservations`: `id`, `identity_id uuid not null references identities(id) on delete cascade`, `purpose text not null check (purpose in (the 4 purposes))`, `estimate_cents int not null check (estimate_cents > 0)`, `status text not null default 'held' check (status in ('held','settled','released'))`, `created_at timestamptz not null default now()`, `settled_at timestamptz`.
   - `llm_usage`: `id`, `identity_id uuid references identities(id) on delete cascade`, `agent_id uuid references agents(id) on delete set null`, `conversation_id uuid references conversations(id) on delete set null`, `purpose text not null`, `model text not null`, `tokens_in int not null default 0`, `tokens_out int not null default 0`, `cache_read_tokens int not null default 0`, `cost_cents numeric(10,4) not null default 0` (raw, fractional), `latency_ms int`, `reservation_id uuid references reservations(id) on delete set null`, `created_at timestamptz not null default now()`; index on `created_at` (daily spend cap in Phase 2).
   - `payouts`: `id`, `identity_id uuid not null references identities(id) on delete cascade`, `amount_cents int not null check (amount_cents > 0)`, `status text not null default 'requested' check (status in ('requested','paid','rejected'))`, `ledger_id uuid references ledger(id)`, `created_at timestamptz not null default now()`.
2. Functions — all `language plpgsql`, `set search_path = public`, raising `raise exception '<CODE>'` with the code as the exact message text (the app matches on it):
   - `wallet_reserve(p_identity uuid, p_purpose text, p_estimate_cents int) returns uuid`: INVALID_AMOUNT if estimate null or ≤ 0; INVALID_PURPOSE if not one of the 4 purposes; `select ... from wallets where identity_id = p_identity for update` (WALLET_NOT_FOUND if missing); if `balance_cents - reserved_cents < p_estimate_cents` raise `INSUFFICIENT_CREDITS` with `detail` `available=<n> needed=<m>` (D-10 hard stop); insert a `held` reservation; `reserved_cents += p_estimate_cents`; return the reservation id.
   - `wallet_settle(p_reservation uuid, p_actual_cents int, p_ref_type text default null, p_ref_id uuid default null, p_note text default null) returns jsonb`: INVALID_AMOUNT if actual < 0; lock the reservation (RESERVATION_NOT_HELD unless status = 'held'); lock the wallet; `reserved_cents = greatest(reserved_cents - estimate_cents, 0)`; `debit = least(p_actual_cents, balance_cents)`; `shortfall = p_actual_cents - debit`; `balance_cents -= debit`; when debit > 0 insert a ledger row (kind `debit`, amount `-debit`, `balance_after` = new balance, purpose from the reservation, ref_type/ref_id/note, note gets ` · shortfall <n> credits` appended when shortfall > 0); mark the reservation `settled` with `settled_at = now()`; return `jsonb_build_object('balance_cents', …, 'debited_cents', debit, 'shortfall_cents', shortfall)`. The balance never goes negative (D-10: reservation adjusted to the real cost after the call).
   - `wallet_release(p_reservation uuid) returns void`: lock the reservation; if `held`, subtract its estimate from `reserved_cents` (floor 0), set status `released` and `settled_at = now()`; otherwise no-op.
   - `wallet_grant(p_identity uuid, p_kind text, p_amount_cents int, p_note text default null, p_ref_type text default null, p_ref_id uuid default null) returns int`: INVALID_KIND unless kind in ('seed','subscription','pack','earnings'); INVALID_AMOUNT unless amount > 0; `insert into wallets(identity_id) values (p_identity) on conflict do nothing`; lock the wallet; `balance_cents += amount`; insert a ledger row with `balance_after`; return the new balance. No subscribed-state check: every call grants again (D-11).
   - `demo_reset() returns jsonb`: deletes rows whose `id::text not like '00000000-0000-4000-80%'` from reservations, llm_usage, payouts and ledger (runtime activity only; seed rows keep their fixed-prefix ids); then `update wallets set balance_cents = coalesce((select sum(amount_cents) from ledger l where l.identity_id = wallets.identity_id), 0), reserved_cents = 0`; returns counts of deleted rows. Used by `pnpm db:reset-demo` (plan 01-10) to return the presentation to its seeded state.
3. Privileges at end of file: `revoke all on wallets, ledger, reservations, llm_usage, payouts from anon, authenticated;`, `revoke execute on function wallet_reserve(uuid,text,int), wallet_settle(uuid,int,text,uuid,text), wallet_release(uuid), wallet_grant(uuid,text,int,text,text,uuid), demo_reset() from public, anon, authenticated;`, then `grant execute on` the same five functions `to service_role;`.
  </action>
  <verify>
    <automated>grep -cE 'create (or replace )?function (public\.)?(wallet_reserve|wallet_settle|wallet_release|wallet_grant|demo_reset)' supabase/migrations/20260926180100_wallet.sql</automated>
  </verify>
  <acceptance_criteria>
    - The verify command prints 5
    - wallet migration contains `check (balance_cents >= 0)`, `check (reserved_cents >= 0)`, `for update`, `INSUFFICIENT_CREDITS`, `RESERVATION_NOT_HELD`, `jsonb_build_object('balance_cents'`
    - wallet migration contains `kind in ('seed','subscription','pack','debit','earnings','cashout','platform_cost','platform_margin')` and `status in ('held','settled','released')`
    - wallet migration contains `00000000-0000-4000-80%` inside demo_reset
    - wallet migration contains `grant execute on function` … `to service_role` and `from public, anon, authenticated`
    - `grep -v '^\s*--' supabase/migrations/20260926180100_wallet.sql | grep -ciE 'enable row level security|create policy'` prints 0
  </acceptance_criteria>
  <done>Wallet tables and the four money functions exist with row locks, non-negative checks, a hard stop at zero, repeatable grants and a seed-preserving demo reset.</done>
</task>

<task type="auto">
  <name>Task 3: Idempotent seed and local validation in a throwaway Postgres + pgvector container</name>
  <files>supabase/seed.sql</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Seed content", "Identity switcher", pitfall 5)
    - .planning/phases/01-shell-wallet-shared-contracts/refs/mockup.html (agent names, descriptions, ratings, conversations, ledger and earnings rows to echo)
    - .planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md (Copywriting Contract — money and credit formats)
    - supabase/migrations/20260926180000_core_schema.sql and supabase/migrations/20260926180100_wallet.sql (column names and checks)
  </read_first>
  <action>
Write `supabase/seed.sql` — inserts only, no DDL; every insert ends `on conflict (id) do nothing` (wallets and profiles: `on conflict (identity_id) do nothing`) so `supabase db push --include-seed` can re-run safely (pitfall 5). Use the fixed-UUID convention from <conventions>. Content is placeholder by design (D-03); numbers only need to be internally consistent. Required content:
1. identities (9): 01 Maria Chen (expert, switchable, initial M, color #5a4636), 02 Sam Okafor (hirer, switchable, S, #2f5a4b), 03 Dev Patel, 04 Priya Nair, 05 Luis Ortega, 06 Hannah Kim, 07 Tom Reyes (experts, not switchable), 08 Jordan Lee, 09 Alex Rivera (hirers, not switchable).
2. profiles: Maria — field `Physical therapy`, credentials `DPT, OCS`, years 15, contact_url `https://cal.com/maria-chen`, location `Madison, WI`, 1–2 sentence bio (D-19); each other expert gets field, specific credentials, years, https contact_url, bio (Pitfall 8: concrete credentials); Sam gets a one-line bio.
3. agents (7): 01 `Maria Chen · Physical therapy` (slug maria-chen-physical-therapy, health_pt, icon activity, published, rating 4.8 / 23), 02 `Dev Patel · Tax for freelancers` (tax_finance, calculator, 4.6 / 41), 03 `Priya Nair · College admissions` (career_admissions, graduation-cap, 4.9 / 12), 04 `Luis Ortega · Strength coaching` (health_pt, heart-pulse, 4.7 / 18), 05 `Hannah Kim · First-job finances` (tax_finance, piggy-bank, 4.5 / 9), 06 `Tom Reyes · Resume & interviews` (career_admissions, briefcase, 4.8 / 33), 07 `Maria Chen · Running form clinic` (maria-chen-running-form-clinic, health_pt, footprints, draft, multiplier 1, rating 0 / 0). Every published agent: headline, description (mockup copy), full persona jsonb with all PersonaForm keys, a system_prompt paragraph, greeting, 3 example_questions, rate_multiplier between 1 and 3, consent_accepted_at and published_at set.
4. sources: each agent has one `interview` source named `Interview answers` (ready; chunk_count 38 for agent 01, 6 for the draft, 10–30 for others). Agent 01 also has `ACL-rehab-protocol.pdf` (pdf, ready, 42 chunks, page_count 14) and `Return-to-run checklist.md` (md, processing, 0 chunks).
5. chunks: at least 4 for agent 01 (2 interview chunks with `question` set, 2 pdf chunks with `page` set), embedding null. Citations in messages reference these chunk ids.
6. interview: session 01 for agent 01 (completed, turn_count 38) with at least 3 turns; session 02 for agent 07 (paused, turn_count 6) with at least 2 turns; answered turns link `chunk_id` to an interview chunk when one exists.
7. conversations (5): 01 Sam × agent 01 `Knee swelling after ACL repair` (share off); 02 Sam × agent 02 `Quarterly estimate for Q3` (share on); 03 Sam × agent 03 `Essay draft feedback` (share off); 04 Jordan × agent 01 `Shoulder rehab week plan`; 05 Alex × agent 01 `Return to running after shin splints`. last_message_at within the 3 days before 2026-09-26; message_count and spent_cents set.
8. messages: at least 4 per Sam conversation and 2 per other conversation, alternating user/assistant; assistant messages carry `citations` arrays matching the Citation shape with `[n]` markers in the content, `cost_cents`, tokens, `model` `claude-sonnet-5`; at least one assistant message on agent 01 has feedback `down`.
9. ratings: Sam rates agent 01 (5) and agent 02 (4).
10. wallets and ledger (created_at spread over 2026-09-01 … 2026-09-26): every identity has a wallet whose `balance_cents` equals the sum of its ledger `amount_cents`, `reserved_cents` = 0, and each ledger row's `balance_after` is the running balance in created_at order. Maria and Sam end at exactly 5000 (D-09). Sam's history includes `seed`, `subscription`, `pack` and `debit` rows (purpose chat_message, ref_type `conversation`); Maria's includes `seed`, `subscription` or `pack`, `debit` rows with purposes interview_turn, embedding and sandbox_message, and `earnings` rows (D-12). Other identities: a `seed` row plus, for Jordan and Alex, their chat debits.
11. Earnings consistency: for each conversation 01, 04, 05 (agent 01), write hirer `debit` rows (ref_type `conversation`, ref_id = the conversation), one `platform_cost` and one `platform_margin` row (identity_id null, same ref), and one Maria `earnings` row (same ref), such that −sum(hirer debits) = platform_cost + platform_margin + earnings and platform_margin ≈ 15% of (gross − platform_cost) (D-13).
12. llm_usage: one row per Maria build-side debit and per chat debit group, `cost_cents` ≤ the matching debit, purposes matching.

Validate locally (Docker is available on this machine; skip with a note in the SUMMARY only if `docker info` fails, in which case plan 01-03's push is the first validation): start `docker run -d --name bx-sqlcheck -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17`, wait until `pg_isready` succeeds, create Supabase's roles and schema first (`create role anon nologin; create role authenticated nologin; create role service_role nologin; create schema extensions;`), apply the two migrations then seed.sql with `psql -v ON_ERROR_STOP=1`, apply seed.sql a second time (idempotency), run the invariant queries in acceptance_criteria, then `docker rm -f bx-sqlcheck`.
  </action>
  <verify>
    <automated>docker exec -i bx-sqlcheck psql -U postgres -tA -v ON_ERROR_STOP=1 -c "select count(*) from wallets w where balance_cents <> (select coalesce(sum(amount_cents),0) from ledger l where l.identity_id = w.identity_id)"</automated>
  </verify>
  <acceptance_criteria>
    - seed.sql contains no `create table`, `alter table` or `drop` statements; `grep -ciE 'insert into' supabase/seed.sql` ≥ 12 and every insert statement has an `on conflict` clause
    - Migrations + seed apply with `ON_ERROR_STOP=1`, and applying seed.sql a second time also succeeds
    - `select count(*) from identities where is_switchable` = 2; `select count(*) from agents where status = 'published'` = 6; `select count(*) from agents where status = 'draft'` = 1; `select count(distinct category) from agents where status = 'published'` = 3
    - `select balance_cents from wallets where identity_id in ('00000000-0000-4000-8001-000000000001','00000000-0000-4000-8001-000000000002')` returns 5000 and 5000
    - The verify query (wallets whose balance differs from their ledger sum) returns 0
    - For conversations 01, 04, 05: `-sum(debit rows) - (platform_cost + platform_margin + earnings)` = 0 for each ref_id
    - `select count(*) from messages where role = 'assistant' and jsonb_array_length(citations) > 0` ≥ 3; `select count(*) from conversations where hirer_id = '00000000-0000-4000-8001-000000000002'` = 3
    - Inside a transaction: `select wallet_reserve('00000000-0000-4000-8001-000000000002','chat_message',999999)` fails with INSUFFICIENT_CREDITS; `select wallet_grant('00000000-0000-4000-8001-000000000002','pack',1000,'check')` returns 6000; a reserve of 3 followed by `wallet_settle(<id>, 2)` returns balance_cents 4998 and debited_cents 2 on a fresh 5000 wallet
  </acceptance_criteria>
  <done>A consistent, idempotent seed exists; migrations and seed are proven to apply twice on Postgres 17 + pgvector and every wallet/earnings invariant holds.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Public internet → Supabase Data API (PostgREST) | Anyone who learns the project URL and the public anon key can call the REST API |
| App server (service role) → Postgres | Trusted server code with full privileges calls wallet functions |
| Concurrent requests → wallet row | Two metered calls for one identity can interleave |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-05 | Information Disclosure / Tampering | all public tables and functions without RLS | mitigate | Revoke all table/sequence privileges and function EXECUTE from anon, authenticated (and PUBLIC for functions) plus matching `alter default privileges`; only service_role keeps EXECUTE on wallet functions. RLS itself stays off per D-01 |
| T-01-06 | Tampering | wallet_reserve / wallet_settle / wallet_grant | mitigate | `select ... for update` on the wallet and reservation rows; `check (balance_cents >= 0)` and `check (reserved_cents >= 0)`; settle debits `least(actual, balance)`; reservations are single-use (RESERVATION_NOT_HELD) |
| T-01-07 | Repudiation | ledger | mitigate | Every balance change happens inside a wallet_* function that writes a ledger row with balance_after; seed invariant (balance = ledger sum) checked in Task 3 |
| T-01-08 | Information Disclosure | fixed seed UUIDs | accept | Predictable ids expose nothing: all seed content is public placeholder data (D-03) and the Data API is closed to anon (T-01-05) |
| T-01-18 | Tampering | demo_reset() | mitigate | EXECUTE granted to service_role only; it deletes only rows whose id lacks the seed prefix and recomputes balances from the remaining ledger |
</threat_model>

<verification>
- Throwaway container run in Task 3 passes every acceptance query, including the second seed application
- `grep -rv '^\s*--' supabase/migrations | grep -ciE 'enable row level security|create policy'` prints 0
</verification>

<success_criteria>
- Schema for the full loop, wallet functions with a hard stop at zero, and an idempotent lived-in seed exist as SQL files
- Maria and Sam each hold 5,000 credits backed by ledger history; earnings rows reconcile per conversation
</success_criteria>

<output>
Create `.planning/phases/01-shell-wallet-shared-contracts/01-02-SUMMARY.md` when done
</output>
