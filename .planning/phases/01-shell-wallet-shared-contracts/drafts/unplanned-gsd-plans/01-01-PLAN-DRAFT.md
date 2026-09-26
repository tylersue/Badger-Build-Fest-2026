---
phase: 01-shell-wallet-shared-contracts
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - pnpm-lock.yaml
  - tsconfig.json
  - next.config.ts
  - postcss.config.mjs
  - eslint.config.mjs
  - .gitignore
  - .env.example
  - vitest.config.ts
  - tests/stubs/server-only.ts
  - lib/env.ts
  - lib/config/app.ts
  - lib/utils.ts
  - components.json
  - components/ui/
  - hooks/use-mobile.ts
  - app/globals.css
  - app/layout.tsx
  - app/page.tsx
  - app/favicon.ico
  - public/
  - .github/workflows/ci.yml
autonomous: false
requirements: [SHEL-01]

must_haves:
  truths:
    - "No npm package is installed before a human has confirmed the package list is legitimate (T-01-SC gate)"
    - "`pnpm install --frozen-lockfile && pnpm build` succeeds from a clean checkout with no .env.local present (server env is parsed lazily)"
    - "Every page inherits LangSmith's dark theme: <html class=\"dark\">, Inter, and the UI-SPEC hex tokens as shadcn CSS variables (D-05)"
    - "CI runs lint, typecheck, unit tests and build on every pull request and on pushes to main"
    - "The repo's own README.md and CONTRIBUTING.md survive the scaffold untouched; .env.example no longer mentions Stripe, PAYMENTS_MODE or ADMIN_EMAILS (D-01)"
  artifacts:
    - path: "package.json"
      provides: "pnpm 11 pin, scripts (typecheck, test, test:e2e, db:push, db:seed, db:types), frozen dependency set incl. ai@7 and @ai-sdk/anthropic"
      contains: "\"packageManager\": \"pnpm@11."
    - path: "app/globals.css"
      provides: "LangSmith dark tokens mapped onto shadcn variables plus role variables and @theme inline color mappings"
      contains: "--background: #09090f"
    - path: "app/layout.tsx"
      provides: "Root html (dark only) with Inter font"
      contains: "dark"
    - path: "lib/env.ts"
      provides: "zod-validated, lazily parsed server env"
      exports: ["serverEnv"]
    - path: "vitest.config.ts"
      provides: "Unit test runner with @ alias and server-only stub alias"
      contains: "server-only"
    - path: ".github/workflows/ci.yml"
      provides: "lint + typecheck + test + build on PR"
      contains: "pnpm typecheck"
    - path: "components/ui/sidebar.tsx"
      provides: "shadcn Sidebar block used by the shell"
  key_links:
    - from: "app/layout.tsx"
      to: "app/globals.css"
      via: "import './globals.css'"
      pattern: "globals\\.css"
    - from: "vitest.config.ts"
      to: "tests/stubs/server-only.ts"
      via: "resolve.alias for 'server-only'"
      pattern: "tests/stubs/server-only"
    - from: ".github/workflows/ci.yml"
      to: "package.json scripts"
      via: "pnpm lint / typecheck / test / build steps"
      pattern: "pnpm (lint|typecheck|test|build)"
---

<objective>
Scaffold the Next.js 16 app into the existing, non-empty repository, pin the toolchain, install the full Phase 1 dependency set (after a human package-legitimacy check), apply LangSmith's dark theme through shadcn, and add CI.

Purpose: every other plan in Phase 1 builds on this package.json, theme and test runner. Work lands on the checked-out branch `platform/skeleton-ui` (D-18); do not create or switch branches.
Output: a building Next 16 + Tailwind v4 + shadcn app with dark LangSmith tokens, vitest, Playwright installed, lazy zod env, rewritten .env.example, and a CI workflow.
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
@.planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md
@CONTRIBUTING.md
@.env.example
@.gitignore

<repo_tree>
Final Phase 1 repo tree (D-15: docs/ARCHITECTURE.md §3 minus app/(auth)/, app/(marketing)/ and app/api/stripe/; interview route added under build; wallet route added). Every plan in this phase uses these paths; plan 01-10 writes them into .github/CODEOWNERS.

- app/layout.tsx, app/globals.css — root (platform)
- app/(app)/layout.tsx — shell (platform)
- app/(app)/page.tsx, app/(app)/marketplace/, app/(app)/agents/[slug]/ — marketplace-credits lane (`/` renders the marketplace, D-06)
- app/(app)/build/, build/new/, build/[agentId]/{layout.tsx,page.tsx,interview/,persona/,knowledge/,test/,publish/} — platform-builder lane
- app/(app)/build/[agentId]/insights/ — marketplace-credits lane (expert insights)
- app/(app)/chat/, app/(app)/chat/[conversationId]/ — runtime lane
- app/(app)/wallet/, app/(app)/earnings/ — marketplace-credits lane
- app/(app)/settings/, app/(app)/admin/ — platform-builder lane
- app/api/chat/route.ts — runtime; app/api/ingest/route.ts — knowledge
- features/{builder,knowledge,runtime,marketplace,billing}/ — one lane each (billing = marketplace-credits)
- components/ui/ (shadcn, add-only), components/app/ (shared page parts), components/shell/ (sidebar) — platform
- lib/{config/,llm/,supabase/admin.ts,env.ts,identity.ts,identity-actions.ts,profile.ts,profile-actions.ts,shell-context.ts,flags.ts,format.ts,db.types.ts,utils.ts} — platform (lib/llm and lib/config are shared contracts)
- supabase/{config.toml,migrations/,seed.sql} — platform
- scripts/reset-demo.mjs, tests/{e2e,integration,stubs}/ — platform
- No proxy.ts in Phase 1 (no auth session to refresh; RESEARCH "Next 16 notes")
</repo_tree>

Registry versions observed with `npm view` on 2026-09-26 (for the legitimacy checkpoint): next 16.3.6, react 19.3.0, @supabase/supabase-js 2.117.2, server-only 0.0.1, zod 4.6.5, lucide-react 1.48.0, ai 7.0.116, @ai-sdk/anthropic 4.0.65 (depends on @ai-sdk/provider 4.x, same major as ai@7), vitest 5.0.2, @playwright/test 1.63.0, shadcn CLI 4.21.0, vercel CLI 60.1.3. Local toolchain: node v26.5.0, pnpm 11.18.0, supabase CLI 2.98.2 (global).
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 1: Package legitimacy check before any install (T-01-SC)</name>
  <what-built>Nothing is installed yet. RESEARCH.md has no "Package Legitimacy Audit" table, so per the planner's fallback policy every package below is treated as [ASSUMED] and must be confirmed by a human before Tasks 2 and 3 run. This gate protects the install step itself and is never auto-approved (it is not an end-of-phase visual check).

Packages Tasks 2 and 3 will install or execute:
- via `pnpm create next-app@latest`: next, react, react-dom, typescript, @types/node, @types/react, @types/react-dom, tailwindcss, @tailwindcss/postcss, eslint, eslint-config-next
- via `pnpm add`: @supabase/supabase-js, server-only, zod, ai (^7), @ai-sdk/anthropic (^4)
- via `pnpm add -D`: vitest, @playwright/test
- via `pnpm dlx shadcn@latest` (init + add): shadcn CLI, lucide-react, radix-ui, class-variance-authority, clsx, tailwind-merge, tw-animate-css, sonner, next-themes (pulled in by the shadcn sonner component)
- via `pnpm dlx vercel@latest` in later plans: vercel CLI (executed, not added to package.json)</what-built>
  <how-to-verify>
1. For each name above open https://www.npmjs.com/package/NAME and confirm: the publisher is the expected org (vercel, supabase, colinhacks, shadcn, radix-ui, microsoft/playwright, vitest-dev, lucide, emilkowalski for sonner, pacocoursey for next-themes), weekly downloads are in the millions or hundreds of thousands, and the name is spelled exactly as listed (no look-alike).
2. Confirm `create-next-app` and `shadcn` are the official CLIs (nextjs.org/docs, ui.shadcn.com/docs/installation/next).
3. Reply "approved", or list any package to drop or replace.
  </how-to-verify>
  <resume-signal>Type "approved" or list packages to remove/replace</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Scaffold Next.js 16 into the non-empty repo, pin the toolchain, install dependencies, add env and test runner</name>
  <files>package.json, pnpm-lock.yaml, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .gitignore, .env.example, vitest.config.ts, tests/stubs/server-only.ts, lib/env.ts, lib/config/app.ts, app/page.tsx, app/layout.tsx, app/globals.css, app/favicon.ico, public/</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md (sections "Scaffold", "Verification tooling", "Pitfalls specific to this phase" 1, 3, 6)
    - .planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md (D-01, D-13, D-15, D-18; canonical_refs `.env.example` note)
    - .env.example (current contents — rewrite target)
    - .gitignore (current contents — merge target)
    - CONTRIBUTING.md (must stay byte-identical in this plan)
    - docs/ARCHITECTURE.md §1 and §8 (stack versions, pitfalls)
  </read_first>
  <action>
Pitfall 1 (RESEARCH): create-next-app refuses a non-empty directory. Scaffold into a scratch directory, then move files in.

1. Run `pnpm create next-app@latest "$TMPDIR/badger-scaffold" --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --yes` (Next 16 defaults to Turbopack and React 19.2+). If any flag is rejected, run `pnpm create next-app@latest --help` and use the equivalent flag; the target is App Router, TypeScript, Tailwind v4, ESLint, no src/ dir, `@/*` alias, pnpm.
2. Copy from the scratch dir into the repo root: `app/`, `public/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (only if generated), `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`. Do NOT copy any generated `README.md`, `AGENTS.md`, `CLAUDE.md` or `.gitignore` (the repo's README.md and CONTRIBUTING.md stay untouched in this plan). Delete the scratch dir afterwards.
3. Merge `.gitignore`: keep every existing line; append `next-env.d.ts`, `*.tsbuildinfo`, `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`.
4. Edit package.json: `"name": "badger-experts"`, `"private": true`, `"packageManager": "pnpm@<exact output of pnpm --version>"` (must be 11.x; never pnpm 12 — STACK.md), `"engines": { "node": ">=22" }`. Scripts: `dev` = `next dev`, `build` = `next build`, `start` = `next start`, `lint` = `eslint .` (Next 16 removed `next lint`), `typecheck` = `tsc --noEmit`, `test` = `vitest run`, `test:watch` = `vitest`, `test:e2e` = `playwright test`, `db:push` = `supabase db push --linked`, `db:seed` = `supabase db push --linked --include-seed`, `db:types` = `supabase gen types typescript --linked --schema public > lib/db.types.ts`. The Supabase CLI is used from PATH (global install, ≥2.98), not added as a devDependency (its postinstall binary download needs pnpm build-script approval).
5. Install: `pnpm add @supabase/supabase-js server-only zod ai@^7 @ai-sdk/anthropic@^4` and `pnpm add -D vitest @playwright/test`. The ai/@ai-sdk/anthropic majors are frozen now so every lane builds against the same SDK (docs/ARCHITECTURE.md §6 `chatModel(): LanguageModel`); no model is called in Phase 1.
6. tsconfig.json: confirm `"strict": true` and the `"@/*": ["./*"]` path.
7. Create `vitest.config.ts` (defineConfig from `vitest/config`): `test.environment` = `node`, `test.include` = `['**/*.test.ts']`, `test.exclude` = `['node_modules/**', '.next/**', 'tests/e2e/**']`, `test.passWithNoTests` = true; `resolve.alias`: `'@'` → repo root (`path.resolve(__dirname)`), `'server-only'` → `path.resolve(__dirname, 'tests/stubs/server-only.ts')`. Create `tests/stubs/server-only.ts` as an empty module (`export {}`) with a one-line comment explaining it lets vitest import server modules.
8. Create `lib/config/app.ts` exporting `APP_NAME = 'Badger Experts'` (UI-SPEC: product name lives in one constant).
9. Create `lib/env.ts`: first line `import 'server-only'`; a zod object schema with `NEXT_PUBLIC_SUPABASE_URL` (url), `SUPABASE_SERVICE_ROLE_KEY` (string, min 1), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional string), `ANTHROPIC_API_KEY` (optional), `VOYAGE_API_KEY` (optional), `EMBEDDING_PROVIDER` (enum voyage|openai, default voyage), `LLM_DAILY_SPEND_CAP_USD` (coerce number, default 20), `PLATFORM_FEE_PERCENT` (coerce number 0–100, default 15), `NEXT_PUBLIC_APP_URL` (url, default http://localhost:3000). Export `type ServerEnv` and `function serverEnv(): ServerEnv` that parses `process.env` on first call, caches the result in a module variable, and throws an Error whose message lists the missing/invalid keys. Parsing is lazy so `pnpm build` and CI succeed without secrets.
10. Rewrite `.env.example` (CONTEXT canonical_refs): remove `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `PAYMENTS_MODE`, `ADMIN_EMAILS`, `LLM_MODEL_CHAT` (the model is platform config per category, PERS-03). Keep, with one-line comments: `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (not read by the app in the MVP; there is no browser client), `SUPABASE_SERVICE_ROLE_KEY=` (server-only; never prefix with NEXT_PUBLIC_), `ANTHROPIC_API_KEY=`, `LLM_DAILY_SPEND_CAP_USD=20`, `EMBEDDING_PROVIDER=voyage`, `VOYAGE_API_KEY=`, `OPENAI_API_KEY=`, `PLATFORM_FEE_PERCENT=15` (platform share of the usage margin, D-13), `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Add a section headed "CLI only (export in your shell; the app never reads these)" with `SUPABASE_PROJECT_REF=`, `SUPABASE_ACCESS_TOKEN=`, `SUPABASE_DB_PASSWORD=`, `VERCEL_TOKEN=`, `VERCEL_SCOPE=`, and a "Tests" section with `RUN_DB_TESTS=0`, `E2E_ALLOW_WRITES=0`, `PLAYWRIGHT_BASE_URL=`. Every secret value stays empty.
11. Replace the create-next-app demo in `app/page.tsx` with a server component that renders one `h1` containing `APP_NAME` (plan 01-07 deletes this file when `app/(app)/page.tsx` takes over `/`).
  </action>
  <verify>
    <automated>pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - package.json contains `"packageManager": "pnpm@11.` and `"typecheck": "tsc --noEmit"` and `"test": "vitest run"` and `"test:e2e": "playwright test"` and `"db:types": "supabase gen types typescript --linked --schema public > lib/db.types.ts"`
    - package.json dependencies include `next` (major 16), `ai` (major 7), `@ai-sdk/anthropic`, `@supabase/supabase-js`, `zod`, `server-only`; devDependencies include `vitest` and `@playwright/test`
    - tsconfig.json contains `"strict": true`
    - lib/env.ts first non-comment line is `import 'server-only'` and the file contains `export function serverEnv(`
    - vitest.config.ts contains `tests/stubs/server-only` and `passWithNoTests`
    - `grep -cE 'STRIPE|ADMIN_EMAILS|PAYMENTS_MODE|LLM_MODEL_CHAT' .env.example` prints 0; .env.example contains `PLATFORM_FEE_PERCENT=15`, `SUPABASE_SERVICE_ROLE_KEY=`, `SUPABASE_ACCESS_TOKEN=`, `RUN_DB_TESTS=0`
    - `git diff --quiet HEAD -- README.md CONTRIBUTING.md` exits 0 (both untouched)
    - `git ls-files --others --cached --exclude-standard | grep -E '^\.env'` prints only `.env.example`
    - With no `.env.local` present, `pnpm build` exits 0
  </acceptance_criteria>
  <done>A clean checkout installs with the frozen lockfile, typechecks, lints, runs vitest (no tests yet) and builds without secrets; toolchain pinned to pnpm 11; env contract and .env.example reflect the no-auth, no-Stripe MVP.</done>
</task>

<task type="auto">
  <name>Task 3: shadcn init and components, LangSmith dark theme tokens, Inter root layout, CI workflow</name>
  <files>components.json, lib/utils.ts, components/ui/, hooks/use-mobile.ts, app/globals.css, app/layout.tsx, .github/workflows/ci.yml</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md (Design System, Color, Typography, Spacing, Registry Safety)
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Scaffold" token map and pitfall 2)
    - .planning/phases/01-shell-wallet-shared-contracts/refs/mockup.html (the `:root` custom properties block — same palette)
    - app/globals.css and app/layout.tsx as left by Task 2
  </read_first>
  <action>
1. Run `pnpm dlx shadcn@latest init` non-interactively with defaults (base color neutral, CSS variables on; use `--help` to find the non-interactive flags of the installed CLI). It writes components.json, lib/utils.ts (`cn`) and updates app/globals.css.
2. Run `pnpm dlx shadcn@latest add sidebar button input textarea label checkbox badge table tabs sheet dialog dropdown-menu popover avatar scroll-area separator tooltip skeleton switch select card collapsible breadcrumb toggle-group sonner` non-interactively (overwrite prompts: yes). Files land in components/ui/ (add-only from now on, CONTRIBUTING.md) and hooks/use-mobile.ts.
3. app/globals.css — dark only (UI-SPEC). Inside the `.dark` block, override the shadcn variables with these exact values, keeping the variable NAMES shadcn components read (pitfall 2): `--background: #09090f`, `--foreground: #f5f8fb`, `--card: #0d0f18`, `--card-foreground: #f5f8fb`, `--popover: #0d0f18`, `--popover-foreground: #f5f8fb`, `--primary: #006ddd`, `--primary-foreground: #ffffff`, `--secondary: #111521`, `--secondary-foreground: #e2e8f0`, `--muted: #1b2030`, `--muted-foreground: #8790ab`, `--accent: #0c336a`, `--accent-foreground: #5fbef8`, `--destructive: #f04438`, `--border: #282e42`, `--input: #393f55`, `--ring: #0078f1`, `--sidebar: #0d0f18`, `--sidebar-foreground: #f5f8fb`, `--sidebar-primary: #0078f1`, `--sidebar-primary-foreground: #ffffff`, `--sidebar-accent: #0c336a`, `--sidebar-accent-foreground: #5fbef8`, `--sidebar-border: #111521`, `--sidebar-ring: #0078f1`. Set `--radius: 4px` (controls; cards use rounded-xl = 12px per UI-SPEC).
   Also inside `.dark`, add LangSmith role variables (UI-SPEC Registry Safety naming): `--bg-surface-level-1: #0d0f18`, `--bg-surface-level-2: #111521`, `--bg-surface-level-3: #1b2030`, `--bg-pill: #282e42`, `--border-faint: #111521`, `--border-muted: #1b2030`, `--border-subtle: #282e42`, `--border-default: #393f55`, `--text-primary: #f5f8fb`, `--text-secondary: #e2e8f0`, `--text-tertiary: #cbd5e1`, `--text-muted: #8790ab`, `--bg-brand: #006ddd`, `--border-brand: #0078f1`, `--bg-selected: #0c336a`, `--text-selected: #5fbef8`, `--text-success: #46cd89`, `--bg-success: #053321`, `--text-warning: #fdb022`, `--bg-warning: #4c2400`, `--text-destructive: #f97066`, `--bg-error: #55160c`, `--tile-purple: #4e3487`, `--tile-purple-surface: #190d38`.
   In the `@theme inline` block add utility mappings (names chosen to avoid shadcn's existing `--color-muted`): `--color-surface-1: var(--bg-surface-level-1)`, `--color-surface-2: var(--bg-surface-level-2)`, `--color-surface-3: var(--bg-surface-level-3)`, `--color-pill: var(--bg-pill)`, `--color-line-faint: var(--border-faint)`, `--color-line-muted: var(--border-muted)`, `--color-line-subtle: var(--border-subtle)`, `--color-line-default: var(--border-default)`, `--color-fg-secondary: var(--text-secondary)`, `--color-fg-tertiary: var(--text-tertiary)`, `--color-fg-muted: var(--text-muted)`, `--color-brand: var(--bg-brand)`, `--color-brand-border: var(--border-brand)`, `--color-selected: var(--bg-selected)`, `--color-selected-fg: var(--text-selected)`, `--color-success: var(--text-success)`, `--color-success-surface: var(--bg-success)`, `--color-warning: var(--text-warning)`, `--color-warning-surface: var(--bg-warning)`, `--color-danger-fg: var(--text-destructive)`, `--color-danger-surface: var(--bg-error)`, `--color-tile: var(--tile-purple)`, `--color-tile-surface: var(--tile-purple-surface)`, and `--font-sans: var(--font-inter)`. In the base layer set body font-size 14px, line-height 1.5.
4. app/layout.tsx: load Inter with `next/font/google` (subsets latin, weights 400/500/600, `variable: '--font-inter'`); render `<html lang="en" className={`dark ${inter.variable}`}>` and `<body className="bg-background text-foreground font-sans antialiased">`; `metadata.title` = `APP_NAME` from lib/config/app.ts, description "Agents built from real experts' own answers." Dark only, no ThemeProvider (UI-SPEC Theme row).
5. Create `.github/workflows/ci.yml`: name `CI`; triggers `pull_request` and `push` on `main`; job `check` on ubuntu-latest: actions/checkout@v4, pnpm/action-setup@v4 (version read from packageManager), actions/setup-node@v4 with node-version 22 and `cache: pnpm`, then steps `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. No secrets are referenced (env is lazy).
  </action>
  <verify>
    <automated>pnpm lint && pnpm typecheck && pnpm build && grep -c -- '--background: #09090f' app/globals.css</automated>
  </verify>
  <acceptance_criteria>
    - components.json exists; components/ui/sidebar.tsx, components/ui/sheet.tsx, components/ui/popover.tsx, components/ui/sonner.tsx, components/ui/table.tsx, components/ui/toggle-group.tsx exist; hooks/use-mobile.ts exists
    - app/globals.css contains `--background: #09090f`, `--primary: #006ddd`, `--sidebar: #0d0f18`, `--sidebar-accent: #0c336a`, `--border: #282e42`, `--radius: 4px`, `--bg-surface-level-2: #111521`, `--color-surface-2:`, `--color-selected-fg:`, `--color-tile-surface:`
    - app/layout.tsx contains `Inter`, `lang="en"` and a className containing `dark`
    - .github/workflows/ci.yml contains `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and does not contain `secrets.`
    - `pnpm build` exits 0 and `pnpm lint` exits 0
  </acceptance_criteria>
  <done>shadcn is initialised with every component the shell and pages need, the LangSmith dark palette is the only theme, Inter is the body font, and CI enforces lint/typecheck/test/build.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → repo | Third-party code enters the build and the Vercel runtime |
| developer machine → git | Local secrets (.env.local, CLI tokens) could be committed |
| CI runner → repo | Workflow runs on every PR, including from forks |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-SC | Tampering | npm/pnpm installs (Task 2, Task 3) | mitigate | Blocking human legitimacy checkpoint (Task 1) before any install; pnpm-lock.yaml committed; CI uses `pnpm install --frozen-lockfile` |
| T-01-09 | Information Disclosure | .env.local, CLI tokens | mitigate | .gitignore keeps `.env`, `.env.local`, `.env.*.local` ignored and whitelists only `.env.example`; .env.example values are empty; acceptance check lists tracked `.env*` files |
| T-01-04a | Information Disclosure | lib/env.ts | mitigate | `import 'server-only'` as the first line so any client-component import fails the build; service-role key never gets a NEXT_PUBLIC_ name (.env.example comment) |
| T-01-17 | Elevation of Privilege | .github/workflows/ci.yml on fork PRs | mitigate | Workflow references no secrets and uses the default read-only GITHUB_TOKEN; `pull_request` (not `pull_request_target`) trigger |
</threat_model>

<verification>
- `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` exits 0 with no .env.local
- `git diff --quiet HEAD -- README.md CONTRIBUTING.md` exits 0
- Current branch is still `platform/skeleton-ui` (`git branch --show-current`)
</verification>

<success_criteria>
- Human approved the package list before installation
- Next 16 app with Tailwind v4, shadcn components and LangSmith dark tokens builds cleanly
- vitest and Playwright installed; server-only aliased for unit tests
- CI workflow in place; .env.example rewritten for the no-auth, no-Stripe MVP
</success_criteria>

<output>
Create `.planning/phases/01-shell-wallet-shared-contracts/01-01-SUMMARY.md` when done
</output>
