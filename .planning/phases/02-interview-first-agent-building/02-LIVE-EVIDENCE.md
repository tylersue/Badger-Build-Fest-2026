# Phase 2 live acceptance evidence

**Checkpoint recorded:** 2026-09-27T04:33:20Z  
**Plan:** 02-18, task 1 of 3  
**Status:** Blocked on real-service access. No migration, provider, SQL, or browser acceptance has run.

## Configuration and local service preflight

- The names-only diagnostic reports `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, and optional `SUPABASE_ANON_KEY` as missing. `.env.local` and `.env` are absent. Its normal mode exited 1 with `Database reachability: unavailable (missing configuration)`; its offline mode skipped reachability by design. The sandboxed pnpm wrapper initially requested a modules purge due to its fallback store path; running `pnpm run check:phase2-env` with normal user-cache access succeeded in invoking the script and exited 1 for the same missing configuration. Direct Node diagnostics agreed.
- The Supabase and Docker CLIs are installed. A bounded `docker info --format '{{.ServerVersion}}'` and `supabase status` both exited 1 because the Docker daemon at the configured socket could not be reached. Earlier Docker Desktop start attempts did not make the daemon reachable.
- No hosted target is configured, so no project identity has been confirmed and no migration has been applied. No provider request or paid call was made.

## Code and offline evidence available at the checkpoint

- The prior offline run reported **152 passing tests and five explicitly skipped live tests**. Next type generation, TypeScript, ESLint, and the production build were reported passing. These are offline/build results; this checkpoint did not rerun them.
- Commit `d0d8ee4` changes `settle_operation` so a transition to `settled` stores `actual_units=coalesce(actual_units,0)`. The added database-backed test asserts zero `actual_units`, zero hold, and an idempotent replay for an operation with no provider attempt. Inspection shows `recover_answer_operation` reads that settled value as its charge; the normal answer finalizer also treats a settled zero charge as known usage. **This is a code-level resolution of CR-04, pending actual SQL execution.** The new test checks direct settlement; a recovered zero-attempt answer has not yet been observed against PostgreSQL.

## Required live gate, still unexecuted

- Apply and verify all **nine** timestamped migrations, `20260927000100` through `20260927000650`, on an identified target. Verify required tables, RPC permissions, vector dimensions, and the private Storage bucket. Generate actual `lib/server/db.types.ts` from that database.
- On a fresh disposable loopback Supabase instance, run serial SQL integration tests with the live opt-ins and inspect isolation, concurrency, quota, recovery, zero-attempt settlement, and public access denial.
- Run the explicit capped paid acceptance with Anthropic and Voyage, inspect actual provider attempts, usage, computed standard-rate cost, ledger equality, citations, and web/source behavior. The computed standard-rate cost is not provider invoice reconciliation.
- Run the browser acceptance, including the fresh-agent loop, reload persistence, disclosures, keyboard behavior, and 1440/768/320 layouts.

**Resume condition:** Supply Anthropic and Voyage access through `.env.local` or the process environment and make Docker's daemon reachable. A functioning local Supabase instance can then provide its URL, service-role key, and anon key without a hosted project. Re-run names-only diagnostics before any mutation, verify the target, then execute tasks 2 and 3. Phase 2 and plan 02-18 remain incomplete until the live evidence passes.
