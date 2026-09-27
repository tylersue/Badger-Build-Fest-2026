# Phase 4 Launch Readiness

## Current status

**Automated now:** 14 adversarial fixtures and the demo-store ledger reconciliation checks. Run `pnpm test` for the complete suite, or run the targeted suites with `pnpm exec vitest run features/launch/adversarial.test.ts features/billing/reconcile.test.ts`.

**Blocked:** 9 adversarial fixtures, the outside-user run, and every check that needs real interviews, retrieval, model answers, web fallback, or server-side identity. The fixture todos name the dependency that must change before each check can run.

No blocked fixture or gate has been run or passed. In particular, CHAT-06 remains unimplemented and blocked pending the resource-copy and scope decisions listed for RS-03.

## Adversarial fixture matrix

| ID | Category | Kind | Status | Blocked on |
|---|---|---|---|---|
| CT-01 | Cross-tenant access | Representative | Automated | — |
| CT-02 | Cross-tenant access | Adversarial | Automated | — |
| CT-03 | Cross-tenant access | Adversarial | Automated | — |
| CT-04 | Cross-tenant access | Adversarial | BLOCKED | Phase 2 real retrieval (RETR-03) |
| TP-01 | Transcript privacy | Representative | Automated | — |
| TP-02 | Transcript privacy | Adversarial | Automated | — |
| TP-03 | Transcript privacy | Adversarial | Automated | — |
| TP-04 | Transcript privacy | Adversarial | Automated | — |
| TP-05 | Transcript privacy | Adversarial | BLOCKED | Phase 2 backend authentication |
| CV-01 | Citation validity | Representative | Automated | — |
| CV-02 | Citation validity | Adversarial | Automated | — |
| CV-03 | Citation validity | Adversarial | BLOCKED | Online fallback (not built) |
| CV-04 | Citation validity | Adversarial | BLOCKED | Phases 2–3 real model and knowledge |
| OF-01 | Online fallback | Representative | BLOCKED | Online fallback (not built) |
| OF-02 | Online fallback | Adversarial | BLOCKED | Online fallback (not built) |
| UR-01 | Unsupported-answer refusal | Representative | Automated | — |
| UR-02 | Unsupported-answer refusal | Adversarial | Automated | — |
| UR-03 | Unsupported-answer refusal | Adversarial | BLOCKED | Phase 2 embedding score threshold |
| RS-01 | Regulated-category safety | Representative | Automated | — |
| RS-02 | Regulated-category safety | Adversarial | Automated | — |
| RS-03 | Regulated-category safety / CHAT-06 | Adversarial | BLOCKED | Coordinator decision on resource copy and D-03/D-05 exception |
| SE-01 | Streaming errors / insufficient credits | Representative | Automated | — |
| SE-02 | Streaming errors | Adversarial | BLOCKED | Phase 3 real chat route |

### Fixture details

- **CT-01–03:** Check the keyword retriever returns only the selected agent's chunks, including when passed a foreign tenant's extra chunk. CT-04 requires the real retrieval boundary.
- **TP-01–04:** Check shared-only, correct-owner visibility; verify revocation takes effect and only the hirer can change sharing. TP-05 requires authenticated server-side access checks.
- **CV-01–02:** Check seeded citations against conversation ownership and answer markers, then ensure canned citations come from retrieved same-agent chunks. CV-03–04 need web fallback or real claims to evaluate.
- **OF-01–02:** Both cases are blocked because online fallback is not built.
- **UR-01–02:** Check that weak retrieval returns an uncharged contact referral and that a canned answer without chunks does not invent expertise. UR-03 needs semantic retrieval.
- **RS-01–02:** Check first-turn health disclaimers and the untrusted hirer-file wrapper. RS-03 remains blocked; no emergency/self-harm behavior is implemented by this phase.
- **SE-01:** Check that a grounded request with one credit refuses before writing a message or ledger row. SE-02 needs the real stream path.

## Outside-user run protocol

**Status: BLOCKED on Phases 2–3 (real interview, retrieval, and answers).** When those phases are available, use at least one participant who has not authored the agents. Explain the demo's limits, get consent before capturing feedback or transcripts, and do not use real sensitive health or financial information.

1. **As Sam (hirer):** browse Marketplace, open a listing, ask five questions in chat, submit a rating and optional review, give answer feedback, share and then revoke a transcript, and flag an agent.
2. **As Maria (expert):** open Insights and confirm only consented transcripts appear; open Earnings, inspect conversation totals and wallet history, and request a mock cash-out.
3. **As admin:** open the queue, resolve a flag, unpublish a flagged agent with a note, then confirm it no longer appears in Marketplace and that the owner preview shows the note.

Record the participant role, date, browser, steps attempted, expected and observed result, screenshots with consent, and any unexpected state or balance changes. Pass only when all three roles complete their steps, transcript visibility follows sharing and ownership, review and feedback controls persist, wallet entries reconcile, and moderation removes the agent from Marketplace. If a real-data or backend step is unavailable, record it as blocked with the dependency; do not convert it to a pass.

## Ledger reconciliation

The seeded ledger and a scripted session against the demo store are automated. The session checks three grounded chat charges at the configured multiplier, raw interview and sandbox charges, conversation split rows, balance chains, and a requested mock cash-out. Run `pnpm exec vitest run features/billing/reconcile.test.ts`.

Rerunning the same reconciliation against real metered data is **BLOCKED on Phases 2–3**. The current demo has no real model usage or shared ledger.

## Known limits

- The demo has no authentication. Privacy and admin controls are enforced in browser state and UI behavior, not as production authorization boundaries.
- State is stored per browser and does not reconcile across devices.
- Benchmark figures are hand-picked sample data, not measured runs.
- Cash-out is a mock request capped at earned credits and current wallet balance; no payment is sent.
- CHAT-06 remains blocked. The coordinator must choose the emergency resource copy (988, 911, or UW UHS candidates) and approve the scope exception before implementation planning.

