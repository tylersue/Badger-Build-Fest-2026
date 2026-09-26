---
phase: 01-shell-wallet-shared-contracts
plan: 05
type: execute
wave: 3
depends_on: ["01-03", "01-04"]
files_modified:
  - lib/identity.ts
  - lib/identity-actions.ts
  - features/billing/wallet.ts
  - features/billing/ledger.ts
  - features/billing/actions.ts
  - lib/llm/index.ts
  - app/api/chat/route.ts
  - app/api/ingest/route.ts
  - tests/integration/wallet.db.test.ts
autonomous: true
requirements: [SHEL-02, CRED-01, CRED-06]

must_haves:
  truths:
    - "The current identity comes from the httpOnly `bx_identity` cookie, is always one of the two switchable seeded identities, and falls back to Maria Chen when the cookie is missing or invalid (D-02)"
    - "Switching identity is a Server Action that validates the id, sets the cookie for a year and revalidates the layout, so the choice survives reloads (SHEL-02)"
    - "A metered call reserves the typical cost first and is refused with insufficient_credits when it does not fit; after the call the reservation settles to the real cost and the balance never goes negative (D-10)"
    - "Mock Subscribe and Buy pack grant a server-fixed amount (2,000 / 1,000 credits) and write a ledger row on every click (D-11, CRED-06)"
    - "Every metered call goes through lib/llm withUsageLogging, which writes an llm_usage row and settles against the wallet (CONTEXT integration point)"
    - "/api/chat streams the frozen ChatStreamEvent NDJSON contract from canned data and charges the caller's wallet; /api/ingest returns the canned ingest result (D-14)"
  artifacts:
    - path: "lib/identity.ts"
      provides: "IDENTITY_COOKIE, Identity type, listSwitchableIdentities, getCurrentIdentity"
      exports: ["IDENTITY_COOKIE", "getCurrentIdentity", "listSwitchableIdentities"]
    - path: "lib/identity-actions.ts"
      provides: "switchIdentityAction server action"
      exports: ["switchIdentityAction"]
    - path: "features/billing/wallet.ts"
      provides: "getWallet, reserveCredits, settleUsage, releaseReservation, grantCredits over the SQL functions"
      exports: ["getWallet", "reserveCredits", "settleUsage", "releaseReservation", "grantCredits"]
    - path: "features/billing/ledger.ts"
      provides: "listLedger, getWalletStats, listEarnings, getEarningsStats"
      exports: ["listLedger", "getWalletStats", "listEarnings", "getEarningsStats"]
    - path: "features/billing/actions.ts"
      provides: "addCreditsAction (mock Subscribe / Buy pack)"
      exports: ["addCreditsAction"]
    - path: "lib/llm/index.ts"
      provides: "chatModel, embed, cannedCompletion, withUsageLogging"
      exports: ["chatModel", "embed", "cannedCompletion", "withUsageLogging"]
    - path: "app/api/chat/route.ts"
      provides: "Chat stream stub route"
      exports: ["POST"]
    - path: "tests/integration/wallet.db.test.ts"
      provides: "Live-DB test of hard stop, settle, repeatable grants, route metering"
      min_lines: 60
  key_links:
    - from: "features/billing/wallet.ts"
      to: "wallet_reserve / wallet_settle / wallet_release / wallet_grant"
      via: "supabaseAdmin().rpc"
      pattern: "rpc\\('wallet_(reserve|settle|release|grant)'"
    - from: "lib/llm/index.ts"
      to: "features/billing/wallet.ts"
      via: "reserveCredits then settleUsage around the call"
      pattern: "reserveCredits\\(|settleUsage\\("
    - from: "app/api/chat/route.ts"
      to: "lib/llm/index.ts"
      via: "withUsageLogging(cannedCompletion)"
      pattern: "withUsageLogging\\("
    - from: "lib/identity-actions.ts"
      to: "bx_identity cookie"
      via: "(await cookies()).set(IDENTITY_COOKIE, ...)"
      pattern: "cookies\\(\\)"
---

<objective>
Build the database-backed services every page and lane calls: the current identity and switcher action, the wallet service over the SQL functions, ledger/earnings queries, mock funding, the lib/llm metering choke point, and the /api/chat and /api/ingest stub routes — proven against the live database with an integration test that never touches the seeded identities' balances.

Purpose: SHEL-02, CRED-01 and CRED-06 mechanics are real (D-03); the UI plans only render what these services return.
Output: lib/identity*.ts, features/billing/{wallet,ledger,actions}.ts, lib/llm/index.ts, two API routes, tests/integration/wallet.db.test.ts.
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
@.planning/phases/01-shell-wallet-shared-contracts/01-03-SUMMARY.md
@.planning/phases/01-shell-wallet-shared-contracts/01-04-SUMMARY.md

<interfaces>
<!-- From plan 01-03 -->
lib/supabase/admin.ts: `supabaseAdmin(): SupabaseClient<Database>` (server-only). lib/db.types.ts: generated `Database` incl. `Functions` wallet_reserve(p_identity, p_purpose, p_estimate_cents) → uuid, wallet_settle(p_reservation, p_actual_cents, p_ref_type?, p_ref_id?, p_note?) → jsonb {balance_cents, debited_cents, shortfall_cents}, wallet_release(p_reservation) → void, wallet_grant(p_identity, p_kind, p_amount_cents, p_note?, p_ref_type?, p_ref_id?) → int.
<!-- From plan 01-04 -->
features/billing/types.ts: Wallet, ReserveResult, SettleInput, SettleResult, GrantKind, LedgerEntry, EarningsRow. features/billing/pricing.ts: estimateCents, toChargeCents. lib/llm/pricing.ts: Usage, costCentsFromUsage. lib/llm/registry.ts: MODELS, ModelId, modelForCategory, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS. lib/config/credits.ts: MeteredPurpose, SUBSCRIPTION_GRANT_CENTS, PACK_GRANT_CENTS. features/knowledge/search.ts: searchKnowledge, toCitations. features/runtime/agent.ts: AgentConfig, buildPrompt. features/runtime/stream.ts: ChatStreamEvent, encodeStreamEvent, CHAT_STREAM_CONTENT_TYPE. features/runtime/safety.ts: checkMessageSafety.

New in this plan:
```typescript
// lib/identity.ts
export const IDENTITY_COOKIE = 'bx_identity';
export type Identity = { id: string; kind: 'expert' | 'hirer'; displayName: string; avatarInitial: string; avatarColor: string; avatarUrl: string | null };
export async function listSwitchableIdentities(): Promise<Identity[]>;
export const getCurrentIdentity: () => Promise<Identity>; // React cache()
// lib/identity-actions.ts ('use server')
export async function switchIdentityAction(identityId: string): Promise<{ ok: true; identity: Identity } | { ok: false; error: 'unknown_identity' }>;
// features/billing/wallet.ts
export async function getWallet(identityId: string): Promise<Wallet>;
export async function reserveCredits(identityId: string, purpose: MeteredPurpose, estimateCents: number): Promise<ReserveResult>;
export async function settleUsage(input: SettleInput): Promise<SettleResult>;
export async function releaseReservation(reservationId: string): Promise<void>;
export async function grantCredits(identityId: string, kind: GrantKind, amountCents: number, note: string, ref?: { type: string; id: string }): Promise<{ balanceCents: number }>;
// features/billing/ledger.ts
export async function listLedger(identityId: string, limit?: number): Promise<LedgerEntry[]>;
export async function getWalletStats(identityId: string): Promise<{ balanceCents: number; spentThisWeekCents: number; spentByPurpose: Record<MeteredPurpose, number>; addedThisMonthCents: number }>;
export async function listEarnings(expertId: string): Promise<EarningsRow[]>;
export async function getEarningsStats(expertId: string): Promise<{ netThisMonthCents: number; grossCents: number; platformCents: number; cashoutCents: number }>;
// features/billing/actions.ts ('use server')
export async function addCreditsAction(kind: 'subscription' | 'pack'): Promise<{ ok: true; grantedCents: number; balanceCents: number } | { ok: false; error: string }>;
// lib/llm/index.ts
export type LlmCallResult = { text: string; usage: Usage; latencyMs: number };
export function chatModel(id?: ModelId): LanguageModel; // from 'ai'
export async function embed(texts: string[], inputType: 'document' | 'query'): Promise<{ embeddings: number[][]; usage: Usage }>;
export async function cannedCompletion(input: { model: ModelId; system: string; userMessage: string }): Promise<LlmCallResult>;
export type MeterContext = { purpose: MeteredPurpose; identityId: string; agentId?: string | null; conversationId?: string | null; multiplier?: number };
export async function withUsageLogging<T extends { usage: Usage; latencyMs?: number }>(ctx: MeterContext, call: () => Promise<T>):
  Promise<{ ok: true; result: T; chargedCents: number; balanceCents: number } | { ok: false; reason: 'insufficient_credits'; neededCents: number; availableCents: number }>;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Identity service and switch action; wallet and ledger services; mock funding action</name>
  <files>lib/identity.ts, lib/identity-actions.ts, features/billing/wallet.ts, features/billing/ledger.ts, features/billing/actions.ts</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Identity switcher (D-02)", "Wallet mechanics", Next 16 notes, pitfall 3)
    - .planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md (D-02, D-09, D-10, D-11, D-12, D-13)
    - supabase/migrations/20260926180100_wallet.sql (function names, argument names, error codes, ledger columns)
    - supabase/seed.sql (earnings rows: ref_type 'conversation'; platform rows have null identity)
    - lib/db.types.ts, lib/supabase/admin.ts, features/billing/types.ts, lib/config/credits.ts
  </read_first>
  <action>
All five files start with `import 'server-only'` except the two action files, which start with `'use server'`.
1. lib/identity.ts: `IDENTITY_COOKIE = 'bx_identity'`; `listSwitchableIdentities()` selects identities `where is_switchable = true order by kind asc` (expert before hirer) and maps snake_case to the Identity type; `getCurrentIdentity` = React `cache(async () => …)`: `const store = await cookies()` (async in Next 16 — pitfall 3; a sync call returns an empty jar), read the cookie, return the matching switchable identity, else the first `expert`, else the first row. Never return a non-switchable identity even if its id is in the cookie (T-01-01).
2. lib/identity-actions.ts: `switchIdentityAction(identityId)`: validate with `z.string().uuid()`; must be in `listSwitchableIdentities()` else `{ ok: false, error: 'unknown_identity' }`; `(await cookies()).set(IDENTITY_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 })`; `revalidatePath('/', 'layout')`; return `{ ok: true, identity }`.
3. features/billing/wallet.ts (types from features/billing/types.ts):
   - `getWallet(identityId)`: select the wallets row; `availableCents = balance − reserved`; a missing row returns zeros.
   - `reserveCredits(identityId, purpose, estimateCents)`: `supabaseAdmin().rpc('wallet_reserve', { p_identity, p_purpose, p_estimate_cents })`; on error whose message contains `INSUFFICIENT_CREDITS` return `{ ok: false, reason: 'insufficient_credits', neededCents: estimateCents, availableCents: (await getWallet(id)).availableCents }`; any other error throws with the Postgres message; success returns `{ ok: true, reservationId, estimateCents }`.
   - `settleUsage(input)`: rpc `wallet_settle` with `p_reservation, p_actual_cents, p_ref_type, p_ref_id, p_note`; map the jsonb to `{ balanceCents, debitedCents, shortfallCents }`; errors throw.
   - `releaseReservation(id)`: rpc `wallet_release`.
   - `grantCredits(identityId, kind, amountCents, note, ref?)`: rpc `wallet_grant`; returns `{ balanceCents }`.
4. features/billing/ledger.ts:
   - `listLedger(identityId, limit = 50)`: ledger rows for the identity, `created_at desc`, mapped to LedgerEntry.
   - `getWalletStats(identityId)`: balance from getWallet; `spentThisWeekCents` = −sum of `debit` rows in the last 7 days; `spentByPurpose` per MeteredPurpose over the same window; `addedThisMonthCents` = sum of seed/subscription/pack/earnings rows since the first day of the current month (UTC).
   - `listEarnings(expertId)`: for every ledger row with `kind = 'earnings'`, `identity_id = expertId`, `ref_type = 'conversation'`, group by ref_id: `netCents` = sum of those earnings; `grossCents` = −sum of `debit` rows with the same ref (any identity); `platformCents` = sum of `platform_cost` + `platform_margin` rows with the same ref; join conversations (title, message_count) and agents (name). Order by the latest earnings row desc.
   - `getEarningsStats(expertId)`: `netThisMonthCents` (earnings rows this month), `grossCents` and `platformCents` summed over listEarnings, `cashoutCents` = −sum of `cashout` rows.
5. features/billing/actions.ts: `addCreditsAction(kind)`: validate `z.enum(['subscription', 'pack'])`; identity from getCurrentIdentity(); amount = SUBSCRIPTION_GRANT_CENTS or PACK_GRANT_CENTS — never taken from client input (T-01-02); note `Mock monthly plan · no payment taken` or `Mock credit pack · no payment taken`; `grantCredits(identity.id, kind, amount, note)`; `revalidatePath('/', 'layout')`; return `{ ok: true, grantedCents, balanceCents }`; unexpected errors return `{ ok: false, error: 'Couldn't add credits. Try again.' }`. No subscribed-state check: every call grants again (D-11).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && grep -c "await cookies()" lib/identity.ts lib/identity-actions.ts</automated>
  </verify>
  <acceptance_criteria>
    - lib/identity.ts contains `export const IDENTITY_COOKIE = 'bx_identity'`, `await cookies()` and `is_switchable`
    - lib/identity-actions.ts first line is `'use server'`, contains `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 31536000`, `revalidatePath('/', 'layout')` and `z.string().uuid()`
    - features/billing/wallet.ts contains `rpc('wallet_reserve'`, `rpc('wallet_settle'`, `rpc('wallet_release'`, `rpc('wallet_grant'` and `INSUFFICIENT_CREDITS`
    - features/billing/actions.ts contains `SUBSCRIPTION_GRANT_CENTS`, `PACK_GRANT_CENTS`, `z.enum(['subscription', 'pack'])` and `no payment taken`; it declares no numeric amount parameter
    - lib/identity.ts, features/billing/wallet.ts and features/billing/ledger.ts each have `import 'server-only'` as the first non-comment line
    - `pnpm typecheck` and `pnpm lint` exit 0
  </acceptance_criteria>
  <done>Identity, switcher action, wallet, ledger/earnings and mock funding services exist over the live schema with server-side validation.</done>
</task>

<task type="auto">
  <name>Task 2: lib/llm metering choke point, /api/chat and /api/ingest stub routes, live-DB integration test</name>
  <files>lib/llm/index.ts, app/api/chat/route.ts, app/api/ingest/route.ts, tests/integration/wallet.db.test.ts</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("LLM registry and pricing" — no real LLM call in Phase 1; "Wallet mechanics" tests line)
    - docs/ARCHITECTURE.md §5.2 (chat flow) and §6 (chatModel / embed contract)
    - .planning/research/PITFALLS.md (Pitfall 9 — visible errors, not silent stops)
    - features/runtime/stream.ts, features/runtime/agent.ts, features/runtime/safety.ts, features/knowledge/search.ts, features/billing/pricing.ts, lib/llm/pricing.ts, lib/llm/registry.ts (contracts from 01-04)
    - features/billing/wallet.ts and lib/identity.ts (Task 1)
    - Load the `claude-api` skill before writing lib/llm/index.ts (AI SDK 7 / @ai-sdk/anthropic usage)
  </read_first>
  <action>
1. lib/llm/index.ts (`import 'server-only'`; the only module that constructs model handles — CONTRIBUTING "every LLM call goes through lib/llm"):
   - `chatModel(id = MODELS.default)` returns `anthropic(id)` from `@ai-sdk/anthropic`, typed `LanguageModel` from `ai`. Creating the handle makes no network call; Phase 1 never invokes it.
   - `embed(texts, inputType)` returns one `EMBEDDING_DIMENSIONS`-length zero vector per text and usage `{ model: EMBEDDING_MODEL, tokensIn: Math.ceil(totalChars / 4), tokensOut: 0 }` (canned, D-14; never throws).
   - `cannedCompletion({ model, system, userMessage })` resolves `{ text, usage: { model, tokensIn: 1200, tokensOut: 300, cacheReadTokens: 0 }, latencyMs }` where text is a fixed two-sentence answer containing `[1]` and `[2]`.
   - `withUsageLogging(ctx, call)`: (a) `estimate = estimateCents(ctx.purpose, ctx.multiplier ?? 1)`; (b) `reserveCredits(ctx.identityId, ctx.purpose, estimate)` — if not ok, return the refusal unchanged without calling `call` (D-10); (c) run `call()` measuring latency; on throw, `releaseReservation` then rethrow; (d) `rawCents = costCentsFromUsage(result.usage)`, `actualCents = toChargeCents(rawCents)`; (e) insert an `llm_usage` row (identity_id, agent_id, conversation_id, purpose, model, tokens_in, tokens_out, cache_read_tokens, cost_cents = rawCents, latency_ms, reservation_id) and get its id; (f) `settleUsage({ reservationId, actualCents, refType: ctx.conversationId ? 'conversation' : 'llm_usage', refId: ctx.conversationId ?? usageId })`; (g) return `{ ok: true, result, chargedCents: debitedCents, balanceCents }`.
2. app/api/chat/route.ts: `export const runtime = 'nodejs'`; `POST(req)`: parse JSON with zod `{ agentId: uuid, conversationId: uuid optional, message: string trimmed 1..4000, mode: enum ['sandbox','hirer'] }` → 400 `{ error }` on failure; `identity = await getCurrentIdentity()`; load the agent (id, name, category, system_prompt, greeting, rate_multiplier, owner display_name, owner profile contact_url) via supabaseAdmin → 404 when missing; `chunks = await searchKnowledge(agentId, message)`; `system = buildPrompt(agentConfig, chunks, { isFirstTurn: !conversationId })`; `verdict = checkMessageSafety(message, category)` — if `resource_reply`, stream `safety` + `done` with no charge; otherwise `withUsageLogging({ purpose: mode === 'sandbox' ? 'sandbox_message' : 'chat_message', identityId: identity.id, agentId, conversationId }, () => cannedCompletion({ model: modelForCategory(category), system, userMessage: message }))`; a refusal returns HTTP 402 with the `refusal` event as the JSON body; success returns a `ReadableStream` with `Content-Type: application/x-ndjson` emitting `sources`, one `text-delta` per word of the canned text, `citations` (`toCitations(chunks)`), `cost` `{ creditsCharged, balanceCents }`, `done` `{ messageId: crypto.randomUUID() }`, each via `encodeStreamEvent`. Any thrown error is caught and emitted as an `error` event (Pitfall 9) before closing. Nothing is written to conversations/messages in Phase 1. Both modes settle the raw charge; CRED-04's hirer/platform/expert split is a Phase 3 requirement and is not part of this route.
3. app/api/ingest/route.ts: `runtime = 'nodejs'`; `POST` zod `{ sourceId: uuid }` → 400 on failure; returns `Response.json(await ingestSource(sourceId))`.
4. tests/integration/wallet.db.test.ts: whole suite `describe.skipIf(process.env.RUN_DB_TESTS !== '1')`; when enabled, call `process.loadEnvFile('.env.local')` if the file exists. `beforeAll`: insert a throwaway identity (random uuid, kind hirer, is_switchable false, display_name `DB test`) and `grantCredits(id, 'seed', 10, 'db test')`. Tests: (a) `reserveCredits(id, 'chat_message', 11)` → `{ ok: false, reason: 'insufficient_credits' }`; (b) reserve 3 → available 7 → `settleUsage` actual 2 → balance 8, reserved 0, newest ledger row is `debit` −2 with balance_after 8; (c) reserve 3 then settle actual 50 → debitedCents 8, shortfallCents 42, balance 0, never negative; (d) `grantCredits(id, 'pack', 1000, …)` twice → balance rises by 2000 and two `pack` rows exist (D-11); (e) `withUsageLogging` with cannedCompletion → ok, chargedCents 1, one llm_usage row for the identity; (f) route: `vi.mock('@/lib/identity')` so getCurrentIdentity returns the throwaway identity, call `POST` from app/api/chat/route.ts with `{ agentId: '00000000-0000-4000-8002-000000000001', message: 'Is swelling normal?', mode: 'hirer' }`, read the NDJSON, assert the event types in order start with `sources` and end with `cost`, `done`, and the balance fell by 1; (g) drain the throwaway wallet to 0 with a grant-free reserve/settle, then POST again → HTTP 402 with `reason: 'insufficient_credits'`. `afterAll` deletes the identity's ledger, llm_usage, reservations, wallets and identities rows. The seeded identities are never touched (their 5,000 balances stay intact).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm test && RUN_DB_TESTS=1 pnpm vitest run tests/integration</automated>
  </verify>
  <acceptance_criteria>
    - lib/llm/index.ts contains `export async function withUsageLogging`, `reserveCredits(`, `releaseReservation(`, `settleUsage(`, `.from('llm_usage')`, `costCentsFromUsage(` and `from '@ai-sdk/anthropic'`
    - app/api/chat/route.ts contains `withUsageLogging(`, `application/x-ndjson` (or CHAT_STREAM_CONTENT_TYPE), `status: 402`, `encodeStreamEvent(` and a zod schema with `max(4000)`
    - `pnpm test` (without RUN_DB_TESTS) passes and reports the integration suite as skipped
    - `RUN_DB_TESTS=1 pnpm vitest run tests/integration` passes all 7 cases
    - After the integration run, the service-role curl for Maria and Sam wallets from plan 01-03 still returns 5000 and 5000
    - `grep -rn "anthropic(" --include=*.ts --include=*.tsx app features components lib | grep -v '^lib/llm/'` prints nothing (lib/llm is the only model constructor)
  </acceptance_criteria>
  <done>Metering runs end to end (reserve → call → llm_usage → settle) against the live database, the chat stub streams the frozen event contract with a hard stop at zero, and the seeded balances are untouched by tests.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Server Actions (switchIdentityAction, addCreditsAction) | Any visitor can invoke them; no authentication in the MVP (D-01) |
| Browser → /api/chat, /api/ingest | Unauthenticated JSON POSTs |
| Cookie `bx_identity` → server identity | Client-controlled value selects whose wallet is charged |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Spoofing | bx_identity cookie / getCurrentIdentity | accept (partial mitigate) | Accepted by D-01/D-02: the switcher is the product's stand-in for sign-in. Mitigation: cookie is httpOnly, sameSite lax, secure in production; the value is validated against switchable identities so a forged id can only select Maria or Sam, never another row |
| T-01-02 | Tampering / Elevation | addCreditsAction | accept (partial mitigate) | Unlimited repeat grants are the intended behaviour (D-11) of mock money with no real value. Mitigation: kind validated with zod enum; amount fixed server-side from config; every grant leaves a ledger row |
| T-01-10 | Denial of Service | /api/chat wallet drain | accept (partial mitigate) | Anyone can POST and spend the selected identity's mock credits. Mitigation: zod validation, 4,000-char message cap, reservation hard stop at zero (402), no real LLM call in Phase 1; `pnpm db:reset-demo` restores seeded balances |
| T-01-15 | Spoofing (CSRF) | Server Actions | mitigate | Next.js Server Actions compare Origin and Host headers by default; do not configure `serverActions.allowedOrigins` wildcards |
| T-01-04 | Information Disclosure | service-role key via lib/llm, wallet services | mitigate | Every service module starts with `import 'server-only'`; routes run on the nodejs runtime server-side only |
| T-01-24 | Information Disclosure | error messages | mitigate | Route returns generic `error` events / `{ error }` bodies; Postgres messages are not echoed to clients except the INSUFFICIENT_CREDITS refusal shape |
</threat_model>

<verification>
- `pnpm typecheck && pnpm lint && pnpm test` exit 0
- `RUN_DB_TESTS=1 pnpm vitest run tests/integration` passes against the linked project
- Seeded Maria/Sam balances still 5000 after the integration run
</verification>

<success_criteria>
- Identity, wallet, ledger, earnings and mock-funding services are live and typed
- Pre-call reservation with a hard stop at zero and post-call settlement proven on the real database
- /api/chat and /api/ingest honour the frozen contracts with canned content
</success_criteria>

<output>
Create `.planning/phases/01-shell-wallet-shared-contracts/01-05-SUMMARY.md` when done
</output>
