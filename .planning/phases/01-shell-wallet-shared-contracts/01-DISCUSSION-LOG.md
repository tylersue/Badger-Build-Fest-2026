# Phase 1: Shell, Wallet & Shared Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 1-Shell, Wallet & Shared Contracts (discussed under its original name, "Accounts, Wallet & Shared Contracts")
**Areas discussed:** App skeleton & navigation, Wallet rules, Contract freeze & stubs, Sign-up & profile flow

---

## App skeleton & navigation

**How much of the loop exists as real routes when Phase 1 ends?**

| Option | Description | Selected |
|--------|-------------|----------|
| Every route stubbed | Every page in the loop exists with a title, empty state and nav links | ✓ |
| Clickable prototype with fake data | Same routes, each renders a realistic mock | |
| Phase 1 pages only | Just shell, auth, profile, wallet, admin | |

**How should the signed-in navigation reflect one account that builds and hires?**

| Option | Description | Selected |
|--------|-------------|----------|
| One nav, both sides | Top bar with Marketplace, My agents, Chats, wallet, avatar menu | (picked, then superseded) |
| Hire / Build mode switch | Airbnb-style mode toggle | |
| Sidebar app layout | ChatGPT-style left sidebar | |

**Which pages are public without signing in?**

| Option | Description | Selected |
|--------|-------------|----------|
| Landing, marketplace and listings public | Sign-in required to chat, build or see a wallet | |
| Landing public only | Everything past landing requires sign-in | |
| Public through the first message | Sign-in prompted at first message | |

**User's choice:** Free text: "lets use langsmith as a reference, copy the ui of it very similar but use our headers, we dont need to do auth this is a MVP", then "also make it just placeholder information we dont need everything to have accurate information we are just presenting", then "we dont need auth as well".
**Notes:** This superseded the top-bar nav pick (LangSmith uses a sidebar) and removed auth from the MVP entirely. Follow-up clarifications:

| Question | Options | Selected |
|----------|---------|----------|
| What still actually works? | AI real, rest placeholder / Everything placeholder / Everything real except auth | Everything real except auth |
| How does one laptop show both sides? | Expert/Hirer switcher / Single demo user / Pick a persona on load | Expert/Hirer switcher |
| Which LangSmith screens? | Sidebar shell + Agent Builder / Main app shell only / Send screenshots | Sidebar shell + Agent Builder |
| How to record the change? | Update requirements + roadmap / CONTEXT.md only / Hold, check with team | Update requirements + roadmap |

User also asked for the work to happen on a branch off `main` (created: `platform/skeleton-ui`).

---

## Wallet rules

| Question | Options | Selected |
|----------|---------|----------|
| Seeded demo balance | Comfortable $50 / Tight $5 / Separate expert and hirer balances | Comfortable $50 |
| Call costs more than the wallet has | Allow, balance goes negative / Hard stop at zero | Hard stop at zero |
| Mock Subscribe behaviour | Instant grant, repeatable / One-time plan toggle | Instant grant, repeatable |
| Ledger and earnings on first load | Seeded history / Empty until used | Seeded history |

**Notes:** User declined the recommended "allow negative" option in favour of a pre-call reservation with a hard stop. Moved on without further questions.

---

## Contract freeze & stubs

| Question | Options | Selected |
|----------|---------|----------|
| What shared stubs return | Canned placeholder data / Types only, functions throw | Canned placeholder data |
| Repo layout | Keep ARCHITECTURE.md §3 minus auth and Stripe / Let the planner restructure | Keep it, minus auth and Stripe |
| Regulated seed categories | Health/PT and tax/finance only / All three / Health/PT only | Free text: "lets have this for now but we will definitely change this later" (read as: health/PT and tax/finance, provisional) |
| Lane owners | Leave open, decide at kickoff / I'll assign them now | Leave open |

**Notes:** Regulated list is explicitly provisional; recorded as config-driven so it is a one-line change.

---

## Sign-up & profile flow

| Question | Options | Selected |
|----------|---------|----------|
| Root URL with no sign-in | Straight into the app shell / Landing page, then Enter app | Free text: "this should be a website so straight into the app shell" |
| Demo expert profile | Seeded and editable / Seeded, read-only | Seeded and editable |
| Identity switcher placement | Sidebar footer, swaps identity / Top bar toggle, filters nav | Sidebar footer |
| Demo account identity | Two seeded people / One person, two hats | Two seeded people |

---

## Claude's Discretion

- Exact seed content across the three seed categories and both identities
- Reservation estimate for the pre-call wallet check
- Persistence mechanism for the identity switcher
- Component choices within the LangSmith look

## Deferred Ideas

- Real auth (email + Google), RLS, admin allowlist — out of the presentation MVP
- Free credit grant for new accounts — replaced by seeded balances
- Marketing landing page — replaced by opening into the shell
- Regulated-category list — provisional, revisit before Phase 3
- Lane owner names — kickoff
- GSD `branching_strategy: phase` — optional later
