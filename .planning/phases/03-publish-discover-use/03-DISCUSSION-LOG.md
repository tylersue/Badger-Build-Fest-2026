# Phase 3: Publish, Discover & Use - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 3-Publish, Discover & Use
**Areas discussed:** Answer engine, Hirer file upload, Publish gate, Safety reply, Weak-retrieval refusal, Build mode, Landing

---

## Answer engine

| Option | Description | Selected |
|--------|-------------|----------|
| Real Claude, canned fallback | Server route streams from Claude with real token usage; canned stream when no key | (picked in dialog, then reversed) |
| Canned only, simulated streaming | Keep Phase 1 canned answers, stream word by word, no key, no route | ✓ |

**User's choice:** Asked for a fuller explanation of the trade-off, then: "Just build the basic functionality as quickly as possible, we will hone down on the demo functionality specifics later so B and start building."
**Notes:** Real-model answers are recorded as a deferred idea for the demo-honing pass.

---

## Hirer file upload

| Option | Description | Selected |
|--------|-------------|----------|
| Server extraction: PDF, DOCX, TXT, MD | Route handler with unpdf and mammoth, ~50 KB cap, untrusted wrapper | ✓ |
| Text files only for now | TXT and MD in the browser, no PDF or DOCX | |
| Extract in the browser | pdf.js and mammoth client-side | |

---

## Publish gate

| Option | Description | Selected |
|--------|-------------|----------|
| 5 chunks + core persona fields | Name, category, headline, description, one example question; Maria's draft (6 answers) qualifies | ✓ |
| 10 chunks + core persona fields | Draft would need 4 more answers | |
| 1 chunk + name and category | Almost no gate | |

---

## Safety reply (CHAT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| National plus UW Madison line | 988, 911, UHS 24/7 crisis line; zero credits; flags conversation | |
| National lines only | 988 and 911 | |

**User's choice:** Free text: "Is this for like guardrails for certain cases where people try to use the agent for self-harm like an edge case? dont worry about this right now as this is not needed for the project scope. We will limit all edge case building for now like these."
**Notes:** Read as: defer CHAT-06 out of Phase 3 and avoid edge-case work generally. Moved to Phase 4 in REQUIREMENTS.md and ROADMAP.md.

---

## Weak-retrieval refusal (CHAT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed local reply, zero credits | No model call; fixed sentence plus contact link; caption says no charge | ✓ |
| Claude writes the refusal, charged | Model writes it; normal message cost | |

---

## Build mode

| Option | Description | Selected |
|--------|-------------|----------|
| Direct build, like Phase 1 | Context file, build in demo-path order, lint/typecheck/tests/browser walkthrough, update planning docs | ✓ |
| Full GSD pipeline | Research, UI-SPEC, PLAN.md, plan check, executors, verifier, code review | |

---

## Landing

| Option | Description | Selected |
|--------|-------------|----------|
| Push straight to main | Matches the earlier project instruction | |
| Open a pull request | Push the branch, PR into main | ✓ |
| Commit here, don't push | Stay local | |

---

## Claude's Discretion

- Windowed history size (10 messages), slider steps (0.5), extracted-text cap (50,000 chars), streaming reveal speed, checklist copy, chip styling.
- Assembling interview-derived chunks for retrieval inside the demo store.

## Deferred Ideas

- Real Claude answers with canned fallback (server route per `ChatStreamEvent`).
- CHAT-06 emergency/self-harm resource reply → Phase 4.
- Daily spend cap in a server route → Phase 2.
