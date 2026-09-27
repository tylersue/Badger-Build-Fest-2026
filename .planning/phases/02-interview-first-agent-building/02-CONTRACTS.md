# Phase 2 execution contracts

Status: frozen by plan 02-01 before dependent work. Current scope overrides archived Phase 1 SQL and canned behavior. Do not switch branches. No authentication, RLS, payment rails, deployment, or new framework.

## Data and money

- Preserve current text IDs, including `sandbox:{agentId}`; new IDs use full crypto UUIDs with existing prefixes. Seed records carry `origin=fixture`; real records carry `origin=live`. Fixture display history is never retrieval evidence.
- SQL money is BIGINT nanodollars: 1 USD = 1,000,000,000 units; 1 credit = 10,000,000 units. TypeScript arithmetic uses bigint; JSON transports decimal strings (`MoneyAmount`). Display conversion may use fractional credits; no whole-credit minimum. Existing `*Cents` compatibility selectors return display numbers only, never settlement inputs.
- `Operation`: id, requestKey, identityId, agentId, purpose, state, estimateUnits, heldUnits, actualUnits, priceVersion, createdAt. `Attempt`: id, operationId, stageKey, provider, model, state (prepared/dispatched/completed/failed/unknown/settled), providerRequestId, input/output/cache-read/cache-write/embedding tokens, successful search count, gross/effective cost, latency, bounded request metadata. Unique requestKey scoped to identity plus route; unique operation/stage/attempt. Reusing key with different payload is conflict.
- `ServiceResult<T>` is success {ok:true,data:T} or typed failure {ok:false,error:{code,message,retryable,operationId?,neededUnits?,availableUnits?,resetAt?}}. Codes include invalid_input, not_owner, conflict, insufficient_credits, daily_cap, configuration, quota, stale_estimate, provider, indexing, unknown_usage. Never include credentials/provider raw errors.
- `AnswerRevision`: answerId, revisionId, parentAnswerId?, questionId, question, text, version, deletedAt. Answer owns currentRevisionId/indexedRevisionId and captured/indexing/ready/failed state. Linked detail is a separate answer; deleting parent tombstones linked details but preserves question/transcript.
- `PersonaFieldState`: value, origin blank/interview/expert, version, evidenceRevisionIds, pendingSuggestion. `PersonaState`: fields for every PersonaForm field, version, promptMode generated/custom, customPrompt, promptVersion. Unsupported fields stay empty; category uses fixed configured default until supported/selected. Explicit expert edits own their fields.
- `KnowledgeSource`: id, agentId, kind, name, state queued/processing/ready/failed, currentRevisionId, activeRevisionId, contentHash, byteCount, pageCount nullable, chunkCount, deletedAt, error, origin. `Chunk`: sourceId/answerId, agentId, revisionId, ordinal, content, question?, page?, headingPath?, vector(1024). Cross-agent composite FKs enforce alignment.
- `RetrievedChunk`: id, agentId, revisionId, sourceId, sourceType interview/document, sourceName, content, question, page, headingPath, score.
- `EvidenceCitation` discriminates expert interview/document versus web; stable evidenceId, ordinal, excerpt, source title/name, revision, question/page/heading, safe https/http URL for web, deleted-source historical status. Snapshots remain on messages after source deletion.
- `ToolStep`: id, operationId, sequence, kind search/page-read, status running/complete/failed, query?, title?, url?, error?. Persist before emitting; stable IDs update rows and replay after reconnect.
- `ChatStreamEvent`: operation-start, sources, text-delta, citations, tool-start/update/result, knowledge-gap, cost, refusal, error, done. Every event has operationId, eventId, sequence. cost has status settled/pending, estimateUnits, chargedUnits nullable, balanceUnits, heldUnits; done means message durable, not necessarily usage reconciled. Chunked NDJSON decoder accepts split lines.

## Persistence and privileges

Migrations create profiles/identities, agents/persona_fields, interview_sessions/questions/answers/answer_revisions, sources/source_revisions/chunks/index_jobs/quota_holds/intake_estimates, conversations/messages/message_events, wallets/ledger/operations/provider_attempts/daily_budgets, seed_imports. Audit timestamps and version columns are required where mutable. Existing fixture flags/ratings remain display data until their assigned phases.

All tables/functions/private Storage are inaccessible to anon/public/authenticated database roles; server service role only. SQL functions set explicit search_path and grant execute only to service_role. No RLS policies or sign-in. Demo identity is a server-validated allowlisted selector, not a claim of authentication. Same-origin mutation guard plus strict JSON/form size bounds. No client owner IDs, models, prices, or wallet balances are trusted. Server resolves agent ownership on every builder, knowledge, operation, and sandbox access.

`lib/server/request.ts`: resolveDemoIdentity(request), requireAgentOwner(identityId,agentId), parseRequest(schema,request), apiError(error). Identity selection is a same-origin cookie mutation; only the two switchable seeded IDs accepted. Node handlers await params.

`lib/server/db.ts` creates server-only service-role client lazily so missing configuration permits offline builds and read-only configuration diagnostics. `lib/server/env.ts` validates names without printing values. `lib/server/repository.ts` owns DB/read-model serialization; repository interface allows test doubles but production always chooses configured SQL.

## Frozen service interfaces

- `reserveOperation({identityId,agentId,purpose,requestKey,payloadHash,estimateUnits,maxUnits,priceVersion})`, `expandReservation(operationId,additionalUnits)`, `recordAttempt(...)`, `settleOperation(operationId)`, `reconcileOperation(operationId,evidence)`: RPC-backed. Locks in order UTC day → wallet → operation. Reserve both daily cap and wallet before every dispatch; settle known actual usage once; unknown calls retain holds. Never clamp actual costs to balance. Each attempt is assigned the dispatch UTC day, including operations crossing midnight; reconciliation settles those original day buckets.
- `meteredStructured<T>({operation,stageKey,model,instructions,input,schema,limits})`, `meteredStream({...})`, `embedTexts({operation,stageKey,texts,inputType})` live in `lib/llm/`. Hidden retries disabled; journal each actual attempt. All services use these exclusively. Voyage voyage-4-lite, dimension 1024, truncation false, input_type document/query. Category model is read server-side.
- `applyPersonaSuggestions(agentId,patches,observedVersions)`, `savePersonaFields(agentId,patch,expectedVersions)`, `setCustomPrompt(agentId,text,expectedVersion)`, `regeneratePrompt(agentId,expectedVersion,confirmed)`. Suggestion evidence IDs must belong to active captured revisions on that agent; stale suggestions cannot overwrite newer expert edits.
- `submitInterviewAnswer({agentId,questionId,text,requestKey,expectedVersion,parentAnswerId?})`; `controlInterview(agentId,action)` (start/pause/resume/skip/continue/dismiss-ready); `editAnswer/deleteAnswer/retryAnswerIndex`. Save answer transaction before paid calls. Model returns one question, topic state, evidence-linked persona patches and readiness evidence. Readiness: two concrete examples + one principle + one exception; advisory, configurable.
- `parseSource(input,limits)` → bounded text segments with page/heading metadata; `chunkSegments(segments)`; `indexRevision(jobId)`; `searchKnowledge({agentId,query,operation,k})` → only active scoped chunks. Empty remains empty; provider/DB failures are typed failures. k default 6, clamp 1..12.
- `preflightSource({agentId,fileOrText,name})` returns content-hash-bound estimate token/version/expiry (10 minutes), projected known use, remaining quotas, approximate cost, maximum hold; no parsing/embedding. `confirmSource({agentId,estimateToken,requestKey})` revalidates, reserves quotas/cost, saves private object/source/job then processes bounded work. `retrySource` requires fresh preflight confirmation; `deleteSource` tombstones before cleanup.
- `runAnswer({agentId,actorId,conversationId,requestKey,text,mode})` streams the same event contract for sandbox and future hirer integration; mode/pricing resolved by server, never arbitrary body input. This phase exposes sandbox only; hirer route belongs to Phase 3. `assessSufficiency` checks source coverage and valid IDs. `researchWeb` sees public missing question only. `buildPrompt` places immutable platform rules before custom/generated persona and separately delimited expert/web/untrusted data.
- `getDemoSnapshot(identityId)`, `createAgent`, `saveProfile`, `grantMockCredits`, `importLegacyDraft`, `resetPresentationFixtures`. No client ledger import. Reset preserves all real usage, wallet ledger, reservations and daily spending.

## API and browser handoff

All mutations use an Idempotency-Key where provider, financial, or job work can occur; edits also send expectedVersion. Error shape is ServiceResult. Routes:
- GET /api/demo/snapshot; POST /api/demo/identity, /api/demo/import, /api/demo/reset; POST /api/agents; PATCH /api/profile; POST /api/wallet/grants.
- GET/POST /api/agents/[agentId]/interview (read/control/submit discriminated action); PATCH/DELETE /api/agents/[agentId]/answers/[answerId] (edit, add-detail, retry-index actions on PATCH).
- GET/PATCH /api/agents/[agentId]/persona (save-fields, accept/keep-suggestion, custom-prompt, regenerate-prompt).
- GET/POST /api/agents/[agentId]/sources (list, preflight, confirm; bounded multipart or JSON); POST/DELETE /api/agents/[agentId]/sources/[sourceId] (fresh preflight/retry or delete).
- GET/POST /api/agents/[agentId]/sandbox (persisted transcript or NDJSON stream); GET /api/operations/[operationId] (owner-only polling/replay).
Browser lib/api-client.ts owns typed fetch/NDJSON; lib/demo-store.ts retains selector names and is server snapshot cache plus per-agent draft storage only. Migration/import is explicit and idempotent; old localStorage remains until success. Server snapshot merge never overwrites dirty form/draft text. Missing configuration renders actionable state and disables paid work; no canned fallback.

## Limits and prices

Source defaults: 10 document/paste sources, 5 MiB per file, 25 MiB per agent, 100 PDF pages, 100,000 extracted chars, 1,000 active chunks including interview. Chunk target 2,000 chars, 200 overlap at paragraph boundaries. Parser worker: 15-second timeout, bounded worker heap and 20 MiB cumulative inflated DOCX bytes; reject pathological ZIP entries before Mammoth. All limits configured server-side and reported in preflight.

Provider requests: bounded text/history/output and elapsed time. Reserve conservative maximum envelope using price snapshot, not only typical estimate. Web: at most one search and two fetches, bounded continuation count, 1,200 output tokens; fetch 4,000 nominal content tokens is not a hard input bound. Reserve the actual provider context envelope including binary/PDF exposure or refuse before dispatch. No arbitrary app-side URL fetch.

Use research price table including cache writes/reads/search fees and separate gross cost from effective billed cost. Default allowance policy is published standard usage rates unless explicit configured account policy proves a discount; label this computed usage cost, never invoice-exact. Live verification must validate provider entitlement/pricing configuration before acceptance.

## Verification boundaries

Offline fixtures prove behavior only. Every test uses explicit adapter injection; missing real configuration must never silently select a test double. Terminal live gate applies/verifies migrations and generates DB types, runs real SQL concurrency and two-agent isolation tests, performs real Anthropic/Voyage/search calls, and records redacted IDs/usage/ledger evidence. No migration or live-provider success claim without command evidence.

