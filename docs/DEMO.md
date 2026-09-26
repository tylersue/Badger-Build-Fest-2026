# Demo Script (target: 4 minutes, two laptops)

> Historical script: the document-first setup, Stripe, and per-agent trials below predate the current requirements. For the supplied event's two-minute submission video, use [BUILDFEST-STRATEGY.md](BUILDFEST-STRATEGY.md#two-minute-submission-video). Reconcile this live-demo script after the competition timeline is confirmed.

**Laptop A** = the expert. **Laptop B** = the hirer. Both are signed in before the demo starts. Laptop A already has a *draft* agent with the persona form filled in but **no knowledge uploaded yet**, so the audience sees ingestion happen live.

Prerequisite state (run `pnpm seed` the night before):

- 3 published seed agents already on the marketplace so the browse page isn't empty.
- Laptop A: draft agent "Ask [Teammate] — Residential HVAC" with persona filled, zero documents.
- Laptop B: fresh hirer account, no conversations.
- Stripe in test mode, test card `4242 4242 4242 4242` copied to clipboard. `PAYMENTS_MODE=stripe`. If Stripe is flaky in rehearsal, flip to `mock`.

---

### 0:00 — The problem (Laptop A, landing page)

> "Experts have knowledge people will pay for, but they sell it one hour at a time. Chatbots are free but generic and unaccountable. We built the thing in the middle."

### 0:30 — BUILD (Laptop A)

1. Open the draft agent. Scroll the persona form quickly: *"No prompts, no code. You describe how you work."*
2. Drag in **two PDFs** (e.g. a service checklist and an FAQ doc). Point at the per-file status flipping to *Ready*.
3. Open **Sandbox**. Ask a question only the PDFs can answer. Show the streamed answer **and** the retrieved-sources panel. *"It's answering from her documents, and it shows which page."*
4. Ask something the docs don't cover. Show the agent saying it doesn't have that and pointing to the expert's contact link. *"It knows what it doesn't know."*

### 1:45 — PUBLISH (Laptop A)

5. Set free-trial messages = 2, price = $5. Click **Publish**. Agent status flips to *Live*. Open the listing page in a new tab. *"That's the whole publish step."*

### 2:15 — HIRE (Laptop B)

6. Refresh the marketplace. Filter by category. The new agent is there. Open the listing: expert card, credentials, example questions, price, disclaimer.
7. Click an example question. Two free messages stream in with citations.
8. Third message → paywall. Click **Hire for $5** → Stripe Checkout (test card) → back in the chat, unlocked.

### 3:15 — USE (Laptop B)

9. Ask two more real questions. Show citations expanding. Thumbs-up one answer. Rate the agent 5 stars.

### 3:40 — The money (Laptop A)

10. Switch to Laptop A, open **Earnings**: one conversation, $5 gross, $1 platform fee, $4 net. *"She got paid while she was standing here."*

### 3:55 — Close

> "Build in ten minutes, publish in one click, get paid while you sleep. Every answer cites your material."

---

## Rehearsal checklist

- [ ] Both laptops on the same deployed URL (not localhost), logged in, tabs pre-opened.
- [ ] PDFs on Laptop A desktop, named cleanly.
- [ ] Sandbox question and "unknown" question written on a sticky note.
- [ ] Stripe test card on clipboard; `mock` fallback tested.
- [ ] Marketplace has ≥ 3 seed agents with real-looking cards.
- [ ] Network fallback: phone hotspot ready.
- [ ] Ran the whole script twice, timed, the day before.
