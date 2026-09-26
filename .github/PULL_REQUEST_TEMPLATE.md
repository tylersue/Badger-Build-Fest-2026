## What

<!-- One or two sentences. What does this PR change? -->

## Why

<!-- Link the issue. `Closes #123` auto-closes it on merge. -->

Closes #

## Workstream

<!-- Delete the ones that don't apply -->
- [ ] `builder` — expert-facing agent builder UI
- [ ] `knowledge` — ingestion / RAG pipeline
- [ ] `runtime` — chat runtime / agent execution
- [ ] `marketplace` — discovery, listings, hire flow
- [ ] `billing` — Stripe, credits, payouts
- [ ] `platform` — auth, DB schema, shared UI, infra, docs

## How to test

<!-- Steps a reviewer can follow. Include a screenshot or short clip for UI changes. -->

1.
2.

## Checklist

- [ ] `pnpm lint` and `pnpm typecheck` pass locally
- [ ] Touched files are inside my workstream, or I tagged the owner of the other workstream
- [ ] DB schema changes include a migration in `supabase/migrations/`
- [ ] No secrets committed (`.env.local` is gitignored; `.env.example` updated if I added a variable)
