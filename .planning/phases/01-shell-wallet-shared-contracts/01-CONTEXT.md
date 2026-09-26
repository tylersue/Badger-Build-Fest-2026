# Phase 1: Shell, Wallet & Shared Contracts - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the ground every lane builds on: a deployed Next.js app that opens straight into a LangSmith-style shell with every route of the BUILD → PUBLISH → HIRE → USE loop present as a stub page; two seeded identities (an expert and a hirer) with a sidebar switcher in place of sign-in; a real credit wallet with seeded balances and mock funding; the Supabase schema and seed data; and the shared contracts (`searchKnowledge`, `personaToSystemPrompt`, `buildPrompt`, wallet check, settlement, chat stream types, per-category model and safety config) as typed stubs that return canned placeholder data.

Not in this phase: the real interview, retrieval, chat, marketplace queries and earnings logic (Phases 2–4). Authentication, RLS and the admin allowlist are out of the MVP entirely (see Deferred).

</domain>

<decisions>
## Implementation Decisions

### Scope change: presentation MVP, no auth
- **D-01:** No authentication in the MVP. No sign-in pages, no Google login, no admin allowlist, no RLS policies. AUTH-01–04 move to Out of Scope in REQUIREMENTS.md.
- **D-02:** Two seeded identities replace accounts: one expert (owns a published agent, has earnings) and one hirer (has a wallet and past conversations). A "Viewing as" switcher in the sidebar footer swaps name, avatar and wallet; the nav highlights the active side; both sides' pages stay reachable in either view. A hire visibly moves credits from the hirer's wallet to the expert's.
- **D-03:** Content is placeholder, mechanics are real. Seed fake experts, agents, ratings, wallet balances, ledger history and past conversations so every page looks lived-in from the first load. The interview, chat, metering, wallet math and ledger writes actually run. Seed numbers don't need to be realistic; this is for presenting.
- **D-04:** Admin pages exist and are open. Admin routes are just part of the shell.

### App skeleton & navigation
- **D-05:** Copy LangSmith's UI closely, with our own section names. Shell = LangSmith's collapsible left sidebar, breadcrumb bar and dense tables. Building an agent = LangSmith Agent Builder layout (conversation on the left, agent config on the right).
- **D-06:** The app is a website that opens straight into the shell at `/`, landing on the marketplace. No separate marketing landing page; MKT-01 moves to Out of Scope.
- **D-07:** Every route in the loop exists at the end of Phase 1 as a page with a title, an empty state and working nav: my agents, interview, persona, knowledge, test (sandbox), publish, marketplace, listing, chat, wallet, earnings, insights, admin. Lanes fill in their own folders in Phases 2–4.
- **D-08:** Sidebar sections (working names, rename to match LangSmith's tone): Marketplace, My agents, Chats, Wallet, Earnings, Admin. The active identity's wallet balance is visible in the shell at all times.

### Wallet rules
- **D-09:** Seeded balances: $50 (5,000 credits) for each identity. Enough that nothing blocks mid-presentation while the balance visibly moves.
- **D-10:** Hard stop at zero. Before a metered call, reserve the estimated cost and refuse with the top-up prompt if it doesn't fit. The balance never goes negative. The reservation is adjusted to the real cost after the call.
- **D-11:** Mock Subscribe and Buy pack are instant and repeatable: each click adds the configured credits and writes a ledger row. No monthly cycle, no "already subscribed" state.
- **D-12:** Ledger and earnings pages ship with seeded history (a few weeks of placeholder rows and past conversations); real activity appends to it.
- **D-13:** Margin share stays a config constant, default 15%, per PROJECT.md. Not revisited.

### Contract freeze & stubs
- **D-14:** Shared stubs return canned placeholder data, never throw: `searchKnowledge` returns a few chunks with citations, `buildPrompt` returns a prompt string, the wallet check passes, settlement writes rows. Every lane can build and demo screens before the real implementation lands.
- **D-15:** Keep the repo tree from `docs/ARCHITECTURE.md` §3, minus `app/(auth)/` and `app/api/stripe/`; add the interview route under build and the wallet route. The planner records the final tree in the plan and updates `.github/CODEOWNERS` paths to match.
- **D-16:** Regulated categories for now: health/PT and tax/finance. Career/admissions is unregulated. PROVISIONAL: the user expects to change this, so it must be a config list (one line to change), never hard-coded per category in prompts or UI.
- **D-17:** Lane owners stay open until kickoff. The four lanes are Platform→Builder, Knowledge, Runtime, Marketplace→Credits; Knowledge and Runtime go to different people. Names get filled into CODEOWNERS when the team meets.
- **D-18:** Work happens on branch `platform/skeleton-ui`, PR into `main` (the `<workstream>/<thing>` convention in CONTRIBUTING.md). GSD `branching_strategy` stays `none`; execute-phase commits to the checked-out branch.

### Profile
- **D-19:** The expert profile (display name, photo, field, credentials labeled self-reported, years, contact link) is seeded and editable from a profile page. Listings look complete on first load.

### Claude's Discretion
- Exact seed content (names, fields, agent headlines, ratings, ledger amounts), as long as it covers the three seed categories (health/PT, tax/finance, career/admissions) and both identities.
- The reservation estimate for the pre-call wallet check (for example a per-purpose typical-cost table).
- How the identity switcher is persisted (cookie or local state); it must survive reloads.
- Component choices within the LangSmith look (shadcn/ui is the stated stack).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and decisions
- `.planning/PROJECT.md` — core value, constraints, key decisions (wallet model, interview-first, margin share)
- `.planning/REQUIREMENTS.md` — v1 requirements and traceability; AUTH-01–04, CRED-07 and MKT-01 are Out of Scope after this discussion
- `.planning/ROADMAP.md` — four phases, lanes, delivery checkpoints; Phase 1 reshaped after this discussion

### Architecture and contracts
- `docs/ARCHITECTURE.md` §3 — repo layout and folder ownership (keep, minus auth and Stripe)
- `docs/ARCHITECTURE.md` §4 — data model (drop `stripe_account_id` and `purchases`; wallet and ledger replace them; no RLS)
- `docs/ARCHITECTURE.md` §6 — day-one shared contract signatures (starting point; `canChat` and `recordPurchase` are replaced by the wallet check and settlement)
- `docs/ARCHITECTURE.md` §8 — known pitfalls (Next 16 `proxy.ts`, Vercel 300 s limit, AI SDK 7, prompt caching, pgvector)
- `.planning/research/SUMMARY.md` — authoritative scope after research; the "Phase 0" section lists what the scaffold must include; the Gaps section
- `.planning/research/ARCHITECTURE.md` — build-order dependency analysis; tenant isolation by `agent_id` filter
- `.planning/research/STACK.md` — verified versions and library notes
- `.planning/research/PITFALLS.md` — pitfalls 1–9 (the RLS-related items no longer apply)

### Team conventions
- `CONTRIBUTING.md` — branching (`<workstream>/<thing>`), PR flow, migrations, definition of done
- `docs/WORKSTREAMS.md` — original six-workstream split (superseded by the four lanes in ROADMAP.md, still useful for folder ownership)
- `.github/CODEOWNERS` — paths to update once lanes are assigned
- `.env.example` — env variables; remove the Stripe and `ADMIN_EMAILS` entries

### Visual reference
- LangSmith (smith.langchain.com) — main app shell (sidebar, breadcrumbs, tables) and Agent Builder (chat left, config right). There is no local copy; the planner should capture screenshots or a written layout description in a UI-SPEC before implementation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code exists yet; the repo holds docs and planning only.
- `.env.example` — variable names to keep (Supabase, Anthropic, Voyage, `LLM_DAILY_SPEND_CAP_USD`, `PLATFORM_FEE_PERCENT`); drop Stripe and `ADMIN_EMAILS`.
- `.github/` — issue and PR templates, plus a CODEOWNERS skeleton that already lists the lane paths.

### Established Patterns
- Folder-per-lane ownership under `features/` and `app/(app)/`, documented in `docs/ARCHITECTURE.md` §3 and `CONTRIBUTING.md`.
- All LLM calls go through `lib/llm` (model registry, usage logging, spend cap): the single choke point for metering.
- Timestamped Supabase migrations, one per PR; one person regenerates `db.types.ts` per migration.

### Integration Points
- `app/(app)/layout.tsx` — the shell; every lane's pages mount inside it.
- `lib/llm/` — every metered call (interview turn, embedding, chat) settles against the wallet here.
- `supabase/seed.sql` and `scripts/seed.ts` — the seeded identities, agents, ledger history and conversations.
- `features/billing/` — wallet check, settlement, ledger; called by Runtime and Knowledge.

</code_context>

<specifics>
## Specific Ideas

- "Let's use LangSmith as a reference, copy the UI of it very similar but use our headers." The look should be recognisably LangSmith: neutral sidebar, compact typography, table-heavy list pages, breadcrumb bar.
- "Just placeholder information, we don't need everything to have accurate information, we are just presenting." Seed data is for show; nobody will audit the numbers.
- "This should be a website": opens straight into the app, no gate, no landing page.
- The identity switcher sits where LangSmith shows the workspace and user (sidebar footer).

</specifics>

<deferred>
## Deferred Ideas

- **Real authentication (email + Google), RLS on every table, admin allowlist** — cut from the presentation MVP. Reinstate when strangers use the platform. AUTH-01–04 stay in REQUIREMENTS.md under Out of Scope with this reason.
- **Free credit grant for new accounts (CRED-07)** — no accounts without auth; replaced by seeded balances. Returns with auth.
- **Marketing landing page (MKT-01)** — replaced by opening into the shell. Could return as an in-app "About" page.
- **Regulated-category list** — provisional (D-16); revisit before Phase 3 chat ships.
- **Lane owner names** — decide at kickoff, then update CODEOWNERS.
- **GSD `branching_strategy: phase`** — flip it if the team wants a branch per phase created automatically.

</deferred>

---

*Phase: 01-shell-wallet-shared-contracts*
*Context gathered: 2026-09-26*
