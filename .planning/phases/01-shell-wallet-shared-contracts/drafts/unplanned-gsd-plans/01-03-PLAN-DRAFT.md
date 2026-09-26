---
phase: 01-shell-wallet-shared-contracts
plan: 03
type: execute
wave: 2
depends_on: ["01-01", "01-02"]
files_modified:
  - lib/db.types.ts
  - lib/supabase/admin.ts
autonomous: false
requirements: [SHEL-01, SHEL-03, CRED-01]
user_setup:
  - service: supabase
    why: "Shared cloud Postgres that holds the schema, wallet functions and seed (no local Docker stack for the team)"
    env_vars:
      - name: SUPABASE_PROJECT_REF
        source: "Supabase Dashboard -> Project Settings -> General -> Reference ID (the team project from the password vault, or a new project in the team org)"
      - name: SUPABASE_ACCESS_TOKEN
        source: "supabase.com/dashboard/account/tokens -> Generate new token"
      - name: SUPABASE_DB_PASSWORD
        source: "Database password set when the project was created (team password vault)"
      - name: NEXT_PUBLIC_SUPABASE_URL
        source: "Project Settings -> API -> Project URL"
      - name: SUPABASE_SERVICE_ROLE_KEY
        source: "Project Settings -> API Keys -> service_role / secret key"
      - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
        source: "Project Settings -> API Keys -> anon / publishable key (only used to prove anon access is denied)"
  - service: vercel
    why: "Public deployed URL for the shell (success criterion 1)"
    env_vars:
      - name: VERCEL_TOKEN
        source: "vercel.com/account/tokens -> Create Token"
      - name: VERCEL_SCOPE
        source: "Vercel team slug if the project should live under a team (optional; leave empty for the personal account)"

must_haves:
  truths:
    - "The linked cloud database has both migrations applied and the seed loaded: Maria and Sam wallets read 5000 through the service-role API"
    - "The public anon key cannot read wallets through the Data API (401/403)"
    - "lib/db.types.ts is generated from the live database AFTER the push and contains the wallet functions"
    - "The only database client is server-only and built from the service-role key"
    - "A production Vercel deployment exists and returns HTTP 200, with the service-role key stored as an encrypted, non-NEXT_PUBLIC env var"
  artifacts:
    - path: "lib/db.types.ts"
      provides: "Database type generated from the linked project"
      contains: "wallet_reserve"
    - path: "lib/supabase/admin.ts"
      provides: "server-only service-role Supabase client"
      exports: ["supabaseAdmin"]
  key_links:
    - from: "lib/supabase/admin.ts"
      to: "lib/env.ts"
      via: "serverEnv() supplies URL and service-role key"
      pattern: "serverEnv\\("
    - from: "lib/supabase/admin.ts"
      to: "lib/db.types.ts"
      via: "createClient<Database>"
      pattern: "createClient<Database>"
---

<objective>
Get credentials from the human, push the Phase 1 schema and seed to the linked Supabase project, generate TypeScript types from the live database, create the server-only database client, and link and deploy the Vercel project.

Purpose: satisfies the [BLOCKING] schema-push gate (types must come from the live DB, not from config) and proves the deploy path early. Every DB-backed plan (01-05 onward) depends on this.
Output: live schema + seed, lib/db.types.ts, lib/supabase/admin.ts, linked Vercel project with env vars, first production URL.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
@~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md
@.planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md
@.planning/phases/01-shell-wallet-shared-contracts/01-01-SUMMARY.md
@.planning/phases/01-shell-wallet-shared-contracts/01-02-SUMMARY.md

Environment facts at planning time (2026-09-26): no SUPABASE_* or VERCEL_* variables are set in the shell; no Badger Experts project is visible to the Supabase MCP (it lists only unrelated inactive projects); supabase CLI 2.98.2 is on PATH; the Vercel CLI is not installed (use `pnpm dlx vercel@latest`).
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Human provides Supabase project and Vercel credentials</name>
  <action>Claude cannot create the team's shared Supabase project or retrieve dashboard secrets. Ask the user to create `.env.local` from `.env.example` (it is gitignored) and fill: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, VERCEL_TOKEN and optionally VERCEL_SCOPE; PLATFORM_FEE_PERCENT=15 and LLM_DAILY_SPEND_CAP_USD=20 stay as in the example. The Supabase project should be the team's shared project (CONTRIBUTING.md: credentials live in the team password vault) on Postgres 15+ with the pgvector extension available (default on Supabase).</action>
  <verify>
    <automated>set -a; . ./.env.local; set +a; for v in SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_ANON_KEY VERCEL_TOKEN; do [ -n "$(printenv $v)" ] || echo "MISSING $v"; done</automated>
  </verify>
  <done>.env.local exists, is gitignored, and the verify loop prints no MISSING lines.</done>
  <resume-signal>Type "done" once .env.local is filled in</resume-signal>
</task>

<task type="auto">
  <name>Task 2: [BLOCKING] Push schema and seed to the linked project, generate live types, create the server-only client</name>
  <files>lib/db.types.ts, lib/supabase/admin.ts</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Supabase without Auth", pitfalls 4 and 5)
    - supabase/config.toml, supabase/migrations/20260926180000_core_schema.sql, supabase/migrations/20260926180100_wallet.sql, supabase/seed.sql (what is being pushed)
    - lib/env.ts (serverEnv contract from plan 01-01)
    - package.json (db:push, db:seed, db:types scripts)
  </read_first>
  <action>
This task runs AFTER every schema file edit (plan 01-02) and BEFORE type generation and any verification that reads the database. Build and typecheck would pass without it, which is why it blocks.
1. Load env non-interactively: `set -a; . ./.env.local; set +a` (SUPABASE_ACCESS_TOKEN in the environment suppresses the login prompt).
2. `supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"`.
3. Preview: `supabase db push --linked --dry-run --password "$SUPABASE_DB_PASSWORD"` must list `20260926180000_core_schema.sql` and `20260926180100_wallet.sql` (and nothing unexpected). If the remote already has unrelated migrations, stop and report instead of repairing history.
4. Apply: `supabase db push --linked --include-seed --password "$SUPABASE_DB_PASSWORD"` (the same command `pnpm db:seed` wraps). If a command still prompts for input despite the token and password flags, stop and surface the prompt to the user rather than guessing.
5. Verify against the live project with curl (see acceptance criteria): service-role reads of wallets and agents, and an anon read that must be denied.
6. Generate types from the live database: `pnpm db:types` (writes lib/db.types.ts via `supabase gen types typescript --linked --schema public`). Never hand-edit this file.
7. Create `lib/supabase/admin.ts`: first line `import 'server-only'` (pitfall 4: a client-component import then fails the build instead of leaking the key); import `createClient` from `@supabase/supabase-js`, `type Database` from `@/lib/db.types`, `serverEnv` from `@/lib/env`; export `function supabaseAdmin()` returning a module-cached `createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })`; also export `type Db = Database`. No browser client and no anon client exist in Phase 1 (RESEARCH).
  </action>
  <verify>
    <automated>set -a; . ./.env.local; set +a; curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/wallets?select=identity_id,balance_cents&identity_id=in.(00000000-0000-4000-8001-000000000001,00000000-0000-4000-8001-000000000002)" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" && grep -c 'wallet_reserve' lib/db.types.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `supabase db push --linked --dry-run` run after the push reports the remote database is up to date
    - The verify curl returns a JSON array with two objects, both `"balance_cents":5000`
    - `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/agents?select=id&status=eq.published" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"` returns 6 rows
    - `curl -s -o /dev/null -w '%{http_code}' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/wallets?select=balance_cents" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"` prints 401 or 403 (T-01-05)
    - lib/db.types.ts contains `wallet_reserve`, `wallet_settle`, `wallet_grant`, `demo_reset`, `wallets`, `ledger`, `identities`, `interview_turns`
    - lib/supabase/admin.ts first non-comment line is `import 'server-only'` and it contains `export function supabaseAdmin(` and `createClient<Database>`
    - `git status --porcelain .env.local` prints nothing (still ignored)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>The live project holds the Phase 1 schema and seed, types are generated from it, anon access is denied, and server code has one typed service-role client.</done>
</task>

<task type="auto">
  <name>Task 3: Link Vercel, store env vars, deploy to production</name>
  <files>.vercel/ (gitignored, not committed)</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Verification tooling" Vercel line, pitfall 6)
    - .env.example (which variables the app reads)
    - .gitignore (confirms `.vercel` is ignored)
  </read_first>
  <action>
1. `set -a; . ./.env.local; set +a`. Define `VC="pnpm dlx vercel@latest --token $VERCEL_TOKEN"` and append `--scope $VERCEL_SCOPE` when VERCEL_SCOPE is non-empty.
2. `$VC link --yes --project badger-experts` (creates or links the project; `.vercel/` stays untracked).
3. Add production env vars non-interactively by piping values on stdin (`printf %s "$VALUE" | $VC env add NAME production`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (add `--sensitive`; never under a NEXT_PUBLIC_ name — pitfall 6), `PLATFORM_FEE_PERCENT` = 15, `LLM_DAILY_SPEND_CAP_USD` = 20. If a variable already exists, remove it with `$VC env rm NAME production --yes` and re-add.
4. Deploy: `$VC deploy --prod --yes`; capture the production URL from stdout and record it in the SUMMARY. Production (not preview) is used because Vercel's default deployment protection puts preview URLs behind a Vercel login, and success criterion 1 requires that anyone who opens the site gets in.
5. Secret-leak check on a local production build: `pnpm build`, then confirm the service-role key string does not appear anywhere under `.next/static`.
  </action>
  <verify>
    <automated>set -a; . ./.env.local; set +a; pnpm build >/dev/null && ! grep -rqF "$SUPABASE_SERVICE_ROLE_KEY" .next/static && echo no-key-in-client-bundle</automated>
  </verify>
  <acceptance_criteria>
    - `curl -s -o /dev/null -w '%{http_code}' <production URL>` prints 200 and the body contains `Badger Experts`
    - `pnpm dlx vercel@latest env ls production --token "$VERCEL_TOKEN"` lists NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_FEE_PERCENT, LLM_DAILY_SPEND_CAP_USD and no `NEXT_PUBLIC_SUPABASE_SERVICE` name
    - The verify command prints `no-key-in-client-bundle`
    - `git status --porcelain .vercel` prints nothing
  </acceptance_criteria>
  <done>The Vercel project is linked with encrypted env vars and a public production URL serves the app; the key is absent from client bundles.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer shell → Supabase Management API / Vercel API | Long-lived personal tokens and the DB password are used by CLIs |
| Vercel build → browser bundle | Anything reachable from a client component ships to every visitor |
| Public internet → Supabase Data API | The anon key is public by design |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04 | Information Disclosure | SUPABASE_SERVICE_ROLE_KEY | mitigate | `import 'server-only'` in lib/supabase/admin.ts and lib/env.ts; Vercel var added with `--sensitive` under a non-public name; post-build grep proves the key is absent from `.next/static` |
| T-01-09 | Information Disclosure | .env.local, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, VERCEL_TOKEN | mitigate | Stored only in gitignored .env.local and loaded per command; acceptance checks `git status` shows neither .env.local nor .vercel |
| T-01-05 | Information Disclosure / Tampering | Data API with anon key | mitigate | Revokes from plan 01-02 verified live: anon read of wallets returns 401/403 |
| T-01-19 | Tampering | `supabase db push` against a shared project | mitigate | Dry-run first; stop and report if the remote has unexpected migration history instead of running `migration repair` |
| T-01-20 | Denial of Service | Public production URL | accept | Presentation MVP with no auth (D-01); Vercel's platform protections apply; the only paid dependency (LLM) is not called in Phase 1 |
</threat_model>

<verification>
- Live DB: service-role reads return seeded data; anon read denied
- lib/db.types.ts generated after the push; `pnpm typecheck` passes
- Production URL returns 200; key absent from client bundles
</verification>

<success_criteria>
- [BLOCKING] schema push complete before any DB-reading plan runs
- Typed, server-only DB access in place
- Deployed URL exists and is public
</success_criteria>

<output>
Create `.planning/phases/01-shell-wallet-shared-contracts/01-03-SUMMARY.md` when done (include the production URL)
</output>
