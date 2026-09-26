# Contributing

Four people, a few weeks, one repo. These rules exist so we don't block each other.

## Ownership

Every folder in the app has one owner (see [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md) and `.github/CODEOWNERS`). You can edit anything, but if you touch a folder you don't own, tag the owner on the PR. Shared folders (`supabase/`, `lib/`, `components/ui/`, `app/(app)/layout.tsx`) require a review from the `platform` owner.

## Branches

- `main` is always deployable. Vercel deploys it automatically.
- Branch from `main`, name it `<workstream>/<short-thing>`:
  - `builder/persona-form`
  - `knowledge/pdf-parser`
  - `runtime/streaming-endpoint`
  - `marketplace/browse-grid`
  - `billing/stripe-checkout`
  - `platform/rls-policies`
- Rebase on `main` before opening a PR. Delete the branch after merge.

## Pull requests

- Small. One issue per PR. If it's more than ~400 lines of diff, split it.
- Fill in the template. Link the issue with `Closes #N`.
- One approval from another team member merges it. The owner of the touched workstream is the preferred reviewer.
- CI (lint + typecheck) must be green. We do not merge red.
- Squash-merge. The PR title becomes the commit message, so write it like one: `builder: add persona form with live prompt preview`.
- Never push directly to `main` after week 1. (Week 1 is scaffolding and it's fine.)

## Issues and the board

- Every piece of work is an issue. Use the templates.
- Labels: one workstream label (`builder`, `knowledge`, `runtime`, `marketplace`, `billing`, `platform`) + one priority label (`P0`, `P1`, `post-mvp`) + type (`bug`, `enhancement`, `documentation`).
- The GitHub Project board has columns: **Backlog → This week → In progress → In review → Done**. Move your own cards.
- If you're blocked on someone else's workstream, comment on their issue and post in the team chat. Don't silently work around it.

## Database changes

- Schema lives in `supabase/migrations/`. Never edit the DB by hand in the Supabase dashboard on the shared project.
- One migration per PR. Name it `YYYYMMDDHHMM_short_description.sql`.
- Regenerate types after a migration: `pnpm db:types`. Commit the generated file.
- Every table gets RLS enabled and at least one policy in the same migration. No exceptions.

## Environment and secrets

- Copy `.env.example` to `.env.local`. Never commit `.env.local`.
- If you add an env var, add it to `.env.example` with a comment and to the Vercel project.
- Shared Supabase project + Stripe test account credentials are in the team password vault, not in chat.

## Code style

- TypeScript strict. No `any` without a comment explaining why.
- Prettier + ESLint run on commit via lint-staged. Don't fight them.
- Server code that calls the LLM or DB lives in `lib/` or route handlers, never in client components.
- Every LLM call goes through `lib/llm/` so usage logging and the spend cap apply everywhere.

## Definition of done

A PR is done when:

1. The acceptance criteria on the issue are checked off.
2. It works on the Vercel preview deploy, not just localhost.
3. Someone other than the author has clicked through it.
