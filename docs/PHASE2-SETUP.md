# Phase 2 service setup and acceptance

Phase 2 offline tests use injected adapters. They prove service handoffs but do not prove that a database migration, provider account, or online search works. Plan 02-18 must complete live acceptance before the phase is called verified.

## Configuration and diagnostics

Copy `.env.example` to `.env.local` and set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and `VOYAGE_API_KEY`. Keep the service role and provider keys server side; never put them in `NEXT_PUBLIC_` variables. The demo identity switcher is not authentication. `SUPABASE_ANON_KEY` is needed only for the explicit public access denial test. Configure `PHASE2_APP_URL=http://127.0.0.1:3000` for the local paid runner.

Run `node --experimental-strip-types scripts/check-phase2-env.ts --offline` to see variable names and `set`/`missing` statuses without a network call. Run `pnpm check:phase2-env` to check Supabase REST reachability. The checker reads `.env.local` and process environment, prints no values, and reports reachability only as a status. Hosted Supabase may be checked this way without modifying it.

`LLM_PRICE_VERSION` must be `2026-09-26-standard-v1`; `LLM_PRICE_POLICY` must be `standard`. The displayed unit cost is computed from versioned published model rates and observed provider usage. It is **not an invoice reconciliation**. Account discounts are unsupported until a verified discount policy is implemented. Confirm that Anthropic permits the configured `claude-sonnet-5` model and web search/fetch tools, and Voyage permits `voyage-4-lite` with 1,024 dimensions. Successful live calls and stored attempts are the entitlement proof.

## Migration gate

Apply the migrations in this exact order. Every file is required, including seed, persona, and interview additions:

1. `20260927000100_phase2_core.sql`
2. `20260927000200_phase2_knowledge.sql`
3. `20260927000250_phase2_seed.sql`
4. `20260927000275_phase2_persona.sql`
5. `20260927000300_phase2_billing.sql`
6. `20260927000400_phase2_index.sql`
7. `20260927000500_phase2_intake.sql`
8. `20260927000600_phase2_interview.sql`
9. `20260927000650_phase2_answer_recovery.sql`

For a fresh disposable **local** project, run `supabase start` to apply the full chain. Inspect `supabase migration list --local` and require all nine versions. For a hosted project already linked to the correct Supabase project, inspect `supabase migration list --linked`, run `supabase db push --dry-run`, review the SQL/version list, then run `supabase db push` and verify with `supabase migration list --linked`. Do not use `db reset` on hosted data. Review the target project before applying migrations.

The knowledge migration creates the private `expert-sources` Storage bucket. Verify that it exists and `public=false`. Generate database types after applying migrations: `supabase gen types typescript --local > /tmp/phase2-db.types.ts` (or `--linked` for hosted), compare that file with `lib/server/db.types.ts`, and merge intentional changes. Seed presentation fixtures with `node --env-file=.env.local --experimental-strip-types scripts/seed.ts`. The seed is idempotent and its opening grant uses a locked SQL RPC; run it only after all migrations.

## Local SQL and paid acceptance

Start the app with `pnpm dev`. The SQL acceptance tests mutate fixture data and require a **fresh disposable loopback Supabase** instance. Set `SUPABASE_ANON_KEY`, `LIVE_TEST_DISPOSABLE=1`, and `RUN_LIVE_TESTS=1`. `SUPABASE_URL` must resolve to `localhost`, `127.0.0.1`, or `::1`. The billing suite requires the current UTC day budget row to be absent at start, so reset the disposable local database before the run. Run the SQL files serially with:

```sh
RUN_LIVE_TESTS=1 LIVE_TEST_DISPOSABLE=1 node_modules/.bin/vitest run tests/integration/billing.live.test.ts tests/integration/intake.live.test.ts tests/integration/retrieval.live.test.ts --no-file-parallelism
```

The SQL tests use service-role RPC/REST, unique test-owned identities and agents, and the anon key for a negative access check. They assert concurrent wallet/day holds, fractional and replayed settlement, an unresolved dispatch hold, source quota races, active revision filtering, cross-agent isolation, and public denial. They leave financial records and unresolved holds intact for inspection in this disposable project. They never erase provider or ledger evidence.

The full paid runner additionally requires `RUN_PAID_ACCEPTANCE=1`, `LIVE_TEST_DISPOSABLE=1`, loopback `PHASE2_APP_URL` and `SUPABASE_URL`, and an explicit `LLM_DAILY_SPEND_CAP_USD` above 0 and at most 2. It rejects an existing database day cap higher than that limit. Run `pnpm test:phase2-live` only after reviewing the local target. The runner creates a fresh owned agent, submits and edits an interview answer, saves persona text, confirms small PDF, DOCX, TXT, MD and pasted sources, and asks expert-only and web fallback sandbox questions. It checks both route results and stored vectors, provider token counts, citations, tool steps, exact attempt/ledger totals, and the absence of online Knowledge writes. It prints shortened operation IDs and unit totals, never keys, source text, or provider payloads. Paid calls are never part of `pnpm test` or the default environment check.

If a live operation stops with `unknown` usage, inspect its operation and provider attempt IDs using the service role; do not grant credits or release the hold automatically. Recover with recorded provider evidence via `scripts/reconcile-usage.ts` and verify its ledger and wallet before retrying with the original request key. A failed source keeps its private blob; request a fresh estimate and retry explicitly. A stale estimate requires re-preflight with the exact original bytes. Check the `source_cleanup_jobs` queue after deletion; historical citations remain readable as deleted-source history. Plan 02-18 records actual provider and SQL outcomes, including any missing entitlement or configuration names.
