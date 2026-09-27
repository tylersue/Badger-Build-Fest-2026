# Phase 3 integration acceptance

PR #39 merges the Phase 3 builder, marketplace and thinking-orb UI with Phase 2's Supabase, retrieval, provider and billing services. Keep the PR in draft until local SQL, provider and browser acceptance succeeds.

## Server path

- Publishing checks persona fields, consent and at least five chunks from active answer or source revisions. Unpublishing prevents new conversations; existing chat IDs remain usable.
- Rate changes enforce 1×–5× in 0.5 steps and check the owner. Conversation creation checks published status under an agent row lock.
- Hirer messages use the shared answer pipeline. Conversation attachments are private server records, sent to the model as untrusted context and excluded from expert retrieval and citation IDs.
- A chat operation snapshots the agent's multiplier and reserves that multiplier times the bounded provider maximum. Each attempt carries a matching hold. SQL settlement books raw provider cost, hirer debit, 15% of the margin for the platform, and the remaining margin for the expert in one transaction. Unknown dispatched usage keeps its hold until evidence-backed reconciliation runs the same split.

## Checks

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` after the merge. Offline tests cannot prove a PostgreSQL migration or paid provider response.

Use a disposable local Supabase project for mutating SQL tests. Apply all eleven migrations listed in [Phase 2 setup](PHASE2-SETUP.md), then run the Phase 2 live suite and `pnpm test:phase3-sql` with `RUN_LIVE_TESTS=1`, `LIVE_TEST_DISPOSABLE=1`, service-role and anon keys. The Phase 3 test covers checklist failure, consent, owner and rate checks, creation after publish, refusal after unpublish, continuation of the old conversation, exact wallet and ledger split, low funds, and an unknown attempt resolved from usage evidence.

Run the paid Phase 2 acceptance runner and a real hirer message with the OpenAI key. Inspect event replay, expert and web citations, retrieved sources, gap notes, wallet holds, settled charges and earnings. Confirm the attachment never appears among expert chunks or citations. Verify the Maria/Sam loop and the Phase 3 screens at desktop, tablet and mobile widths. Keep the PR draft if any of these checks lack evidence.
