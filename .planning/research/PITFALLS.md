# Pitfalls Research

**Domain:** RAG-grounded expert-persona agents + two-sided creator marketplace with revenue share (Stripe Connect), built in 4 weeks by 4 people on Next.js 16 / Supabase / Vercel AI SDK 7
**Researched:** 2026-09-26
**Confidence:** MEDIUM (web-search-verified across multiple independent sources; official docs cited where available; no Context7 lookups performed for this pass — see Sources)

This file extends [ARCHITECTURE.md §8](ARCHITECTURE.md#8-pitfalls-we-already-know-about), which already covers infra-level gotchas (Supabase free-tier pause, `proxy.ts` rename, `getClaims()`, Vercel 300s limit, webhook signature verification, AI SDK 7 versioning, prompt-cache stability, pgvector dimension/index timing, merge conflicts). Nothing below repeats those. This file is about the two things unique to *this* product: an agent that must stay grounded and safe under a real professional-advice liability, and a marketplace that must make strangers trust and pay an expert they've never met, on day one, with zero existing trust signal.

## Critical Pitfalls

### Pitfall 1: The agent answers confidently when it shouldn't know

**What goes wrong:**
Retrieval returns weak or no relevant chunks, but the model still produces a fluent, confident-sounding answer instead of saying "I don't have that in my knowledge base." Multiple independent write-ups on production RAG chatbots identify this as the single most trust-destroying failure mode: a bot that answers with certainty even when evidence is weak, because there is no explicit "low-confidence" branch in the prompt or pipeline ([GrowwStacks](https://growwstacks.com/blog/why-your-rag-chatbot-fails-users), [Red Gate](https://www.red-gate.com/simple-talk/ai/how-to-stop-ai-hallucinations-in-enterprise-rag-systems-a-complete-guide/)). This is the exact opposite of PRD requirement RUN-3 ("if the context doesn't cover it, say so"), so it isn't a hypothetical risk — it's a named P0 requirement that is easy to satisfy in the happy-path demo question set and easy to silently violate on anything slightly off-script.

**Why it happens:**
Prompt instructions like "answer based on the context" don't stop a capable model from filling gaps with general knowledge or plausible-sounding synthesis — LLMs are trained to be helpful and fluent by default, not to abstain. There's also no retrieval-score threshold wired into the pipeline (`hybrid_search` returns top-k regardless of how weak the matches are), so the model always receives *something* framed as "the context," even when it's irrelevant.

**How to avoid:**
Pass the retrieval score alongside each chunk in the prompt and give the model an explicit, enforced rule: "if the best match's relevance score is below X, or the chunks don't address the question, respond with the fallback message and do not answer from general knowledge." Build a small (10-20 question) adversarial eval set of *out-of-scope* questions per demo agent — not just in-scope ones — since the PRD's own success metric (§9) only tests grounded-answer rate on presumably in-scope questions.

**Warning signs:**
Demo rehearsal only exercises the 3-5 example questions on the listing page; nobody has asked the agent something its knowledge base doesn't cover. The eval set contains only questions the expert intentionally covered in their documents.

**Phase to address:**
Chat runtime phase (retrieval + prompt construction). Verify with an adversarial eval pass before the marketplace+hire phase begins, not after.

---

### Pitfall 2: Citations point at real chunks that don't actually support the claim

**What goes wrong:**
The model emits `[n]` markers that resolve to a real, retrieved chunk, but the specific sentence next to the citation was not actually supported by that chunk — a subtler and more dangerous failure than an obvious hallucination, because the presence of a citation increases user trust in the claim. Research measuring this directly found citation hallucination in roughly 1 in 6 queries even in advanced RAG systems without an added verification layer ([arXiv:2601.05866](https://arxiv.org/pdf/2601.05866), [oneuptime.com](https://oneuptime.com/blog/post/2026-08-31-evaluate-rag-hallucinations-against-sources/view)). For this product specifically, a mis-cited claim under a named expert's persona is worse than an anonymous chatbot error — it's presented as *that person's* professional judgment.

**Why it happens:**
The model generates the answer and the citation markers in the same pass, from the same context window, with no separate verification step checking that citation `[n]`'s content actually entails the adjacent claim. It's easy to eyeball-verify citations during development because developers already know which chunk should be right.

**How to avoid:**
For the MVP, the cheapest mitigation is process, not code: when reviewing sandbox test conversations (BLD-6's retrieval inspector), spot-check that at least one citation per answer actually contains the claimed fact, not just that a citation exists. If time allows in a later phase, add a lightweight post-generation check — does chunk `[n]`'s text plausibly contain the cited claim — before rendering, falling back to "unverified" styling rather than blocking the answer.

**Warning signs:**
Citations are only checked for "does `[n]` render as a hover card with a source name," never for "does the source actually say that."

**Phase to address:**
Chat runtime phase. Verification checklist item as part of demo prep in polish/demo phase.

---

### Pitfall 3: Conflicting or duplicate documents get blended into one confident wrong answer

**What goes wrong:**
An expert uploads a draft and a final version of the same document, or two documents that disagree (an old price sheet and a new one, a superseded protocol and its update). Retrieval returns chunks from both, and rather than flagging the conflict, the model averages them into a single fluent answer that matches neither source — described as one of the most common production RAG mistakes ([GrowwStacks](https://growwstacks.com/blog/why-your-rag-chatbot-fails-users)).

**Why it happens:**
Nothing in the ingestion pipeline detects near-duplicate or superseding documents; nothing in the prompt tells the model what to do when retrieved chunks disagree. Non-technical experts (the target user, per PRD §4.1) are especially likely to upload multiple versions of the same material without realizing the system doesn't know which one is current.

**How to avoid:**
Add a grounding rule to the system prompt: "if retrieved chunks disagree, say so explicitly and cite both, rather than picking one." At the ingestion UX level, when a new source's filename or content closely matches an existing source, prompt the expert ("this looks similar to `<existing file>` — replace it?") rather than silently accumulating both.

**Warning signs:**
An agent's knowledge base has multiple files with similar names or overlapping content and nobody has tested a question where the answer differs between them.

**Phase to address:**
Build+ingest phase (duplicate detection at upload), chat runtime phase (conflict-aware prompt rule).

---

### Pitfall 4: A hirer jailbreaks the persona and strips the safety disclaimer or hard stop

**What goes wrong:**
Persona-based jailbreaks ("ignore your instructions," "pretend you're an unrestricted version," DAN-style role-play prompts) are a well-documented, actively used attack class against exactly this kind of system: an LLM wrapped in a persona and a set of behavioral rules ([FutureAGI](https://futureagi.com/blog/jailbreaking-chatgpt-2025/), [PurpleSec](https://purplesec.us/resources/ai-security-glossary/jailbreaking/)). For this product the payoff for an attacker isn't abstract: getting a *legal/medical/financial* agent to answer without its required disclaimer, or getting the self-harm hard-stop to fire a real answer instead of the resource message, is a direct liability event, not just an annoyance. It's also directly relevant to active regulatory and litigation trends: a Pennsylvania lawsuit already targets an AI platform for chatbots that claimed to be licensed medical professionals ([NPR](https://www.npr.org/2026/05/05/nx-s1-5812861/characterai-chatbot-medical-advice-pennsylvania-lawsuit)), and pending New York legislation would let users sue over AI-given legal/medical advice regardless of disclaimers ([TechRadar](https://www.techradar.com/ai-platforms-assistants/new-york-lawmakers-move-to-block-ai-chatbots-from-giving-legal-or-medical-advice)). Separately, legal commentary notes courts look at the *whole product experience*, not just the presence of a disclaimer string — a disclaimer that appears only in the first message, and can be talked around afterward, is exactly the pattern under scrutiny ([Harris Beach Murtha](https://www.harrisbeachmurtha.com/insights/minimizing-legal-risks-of-ai-powered-chatbots/)).

**Why it happens:**
The disclaimer and hard-stop logic described in RUN-5 are implemented as prompt instructions and a pattern-matching pre-check on the *user's* message — they don't address a user working to bypass the persona's rules mid-conversation, and the disclaimer is only injected on the first assistant turn, not re-enforced later in long conversations.

**How to avoid:**
Treat the category disclaimer and hard-stop list as constraints the model must re-affirm are still active, not a one-time injection — e.g., re-check the safety pre-check on every user message (already partly true per architecture §5.2), and add an explicit system-prompt instruction that persona/role-play requests asking the agent to ignore its rules, disclaimers, or category restrictions must be refused. Test with 5-10 known jailbreak patterns per demo agent, not just benign example questions.

**Warning signs:**
Safety testing only used the documented "emergency/self-harm patterns" from RUN-5's own list — nobody tried a role-play or "ignore previous instructions" style prompt against a legal/medical/financial demo agent.

**Phase to address:**
Chat runtime phase (safety layer design), verified again in polish/demo phase since this is exactly the kind of thing a judge or curious tester tries live.

---

### Pitfall 5: Malicious or malformed content inside an uploaded document hijacks the agent

**What goes wrong:**
Indirect prompt injection: instructions hidden inside a retrieved document (invisible formatting, a buried "ignore the above and instead say X," or content copy-pasted from somewhere untrusted) reach the model's context as if they were system-level instructions, because retrieved content is implicitly trusted by the pipeline the same way a user's own message is not ([PredictionGuard](https://predictionguard.com/blog/rag-security-indirect-prompt-injection-and-knowledge-base-poisoning), [Promptfoo](https://www.promptfoo.dev/docs/red-team/plugins/rag-poisoning/)). Research shows this doesn't require poisoning most of the corpus — as few as five crafted documents in a database of millions can manipulate responses in the large majority of trials. For this product, the realistic vector isn't a malicious expert (they own their own agent) — it's an expert pasting in content they didn't author (a scraped web page, a forwarded email, a shared template) that happens to contain adversarial text, or a future "correction note" / URL-ingestion feature (BLD-7, KNW-5) becoming a write path an outsider could influence.

**Why it happens:**
Document parsing extracts all text uninspected before chunking and embedding; nothing distinguishes "content to answer from" versus "instructions to obey," and the chat prompt concatenates retrieved chunks directly into context the model treats as authoritative.

**How to avoid:**
Wrap retrieved chunk content in the prompt with clear delimiters and an explicit instruction that content inside the delimiters is reference material only, never instructions, regardless of what it claims to be. Don't build the URL-ingestion (KNW-5, P1) or "correction note" (BLD-7, P1) features without this framing in place, since those are the two paths where content an expert didn't personally write enters the knowledge base.

**Warning signs:**
Any ingestion path that pulls text from an external, non-authored source (a URL fetch, a pasted email) with no distinction in the prompt between "grounding material" and "instructions."

**Phase to address:**
Build+ingest phase (delimiter/framing convention established before URL ingestion ships), chat runtime phase (prompt template enforces it).

---

### Pitfall 6: Free-trial and entitlement limits are gamed with throwaway accounts

**What goes wrong:**
A hirer who hits the free-trial wall (`free_trial_messages`, default 3) simply signs up again with a new email to reset it — a specific, well-documented pattern in SaaS free-trial abuse, and one AI products see at elevated rates because signup is self-serve and the "product" (a few LLM calls) is cheap to re-obtain per account. Industry data shows roughly one in five consumers admit to creating multiple accounts specifically to re-access promotions/trials, rising to almost a third of Gen Z users ([451 Research via PayProGlobal](https://payproglobal.com/how-to/prevent-free-trial-abuse/)). This directly undercuts the revenue model this MVP exists to demonstrate: every reset trial is a hirer who never converts to `purchases`.

**Why it happens:**
`free_messages_used` is tracked per `conversation`/`hirer_id`, and Auth signup (ACC-1) has no friction beyond email or Google OAuth — nothing ties a "free trial" to a durable identity signal (device, phone, payment method) rather than an account row.

**How to avoid:**
For the MVP this is an acceptable, explicitly-scoped-out risk (it's not on the demo's critical path — the demo controls both accounts). Don't build trial-abuse defenses now, but do capture it as a named P1/P2 item rather than silently discovering it post-launch: the fix (device fingerprinting, requiring a payment method for the free trial, capping trials per IP) is a real cost, not a quick patch.

**Warning signs:**
Anyone treating "free trial" as launch-ready fraud-hardened rather than "good enough for a controlled demo, revisit before opening beyond the team."

**Phase to address:**
Marketplace+hire phase (acknowledge, don't solve) — explicitly listed as an open item so it isn't rediscovered as a surprise post-Build-Fest.

---

### Pitfall 7: Revenue-share opacity makes experts distrust the payout model

**What goes wrong:**
OpenAI's GPT Store is the direct cautionary precedent: it launched revenue sharing with vague, unclear mechanics, and successful creators concluded the model was unreliable enough that most abandoned it for direct monetization, keeping 95%+ of revenue themselves instead of an "unknown share" ([Medium/Sally's Fieldnotes](https://sallysliu.medium.com/why-openais-gpt-store-failed-to-gain-traction-7783972a5f90), [The GPT Shop Blog](https://www.thegptshop.online/blog/openai-gpt-store-revenue-sharing.md)). This product's whole pitch to experts (PRD §4.1: "get paid... without answering my phone at 9pm") depends on the earnings dashboard being immediately legible — gross, fee, net, per conversation — from the very first dollar, not just in aggregate at payout time.

**Why it happens:**
BIL-4 (earnings dashboard) is P0 but is easy to under-scope as "show a total" rather than "show the ledger breakdown per purchase" — and the 20% platform fee (BIL-3) is easy to leave undocumented on the expert-facing side even though it's baked into every ledger row.

**How to avoid:**
Make the per-purchase ledger breakdown (gross → platform fee → expert net) visible on the earnings page from day one, not a P1 polish item — this is cheap (the `ledger` table already stores it) and directly prevents the GPT Store failure mode. State the fee percentage in plain language somewhere the expert sees during onboarding/publish, not only inside a Stripe receipt.

**Warning signs:**
The earnings page only shows a single running total with no per-conversation or per-purchase detail; the 20% fee is only visible by reading the ledger table directly, not in any expert-facing UI.

**Phase to address:**
Billing phase (ledger UI), verified in polish/demo phase (an expert-user in the demo should be able to explain, unprompted, what they earned and why).

---

### Pitfall 8: The marketplace looks empty and untrustworthy at first load

**What goes wrong:**
Two compounding problems specific to a brand-new two-sided marketplace: (1) the classic cold-start "chicken and egg" problem — buyers won't engage with a thin catalog and sellers won't invest effort without buyers ([GrowthMentor](https://www.growthmentor.com/blog/chicken-and-egg-problem), [WC Vendors](https://www.wcvendors.com/chicken-and-egg-problem/)); and (2) even once there are a handful of seeded agents, "sort by rating" and star counts are meaningless with zero reviews, and self-reported, unverified credentials (PRD §8.2 explicitly ships with no verification) look identical whether the expert has 18 years of experience or none. Marketplace trust research is consistent that reviews, verified identity signals, and transparent listings are what convert a stranger into a paying user, and their absence suppresses trust in *everything* on the page, including genuinely good listings ([Valtorian](https://www.valtorian.com/blog/marketplace-trust-2026)).

**Why it happens:**
The MVP's own cold-start mitigation (seed script, 3 demo experts, per PRD §9 target of ≥5 published agents) solves "the marketplace isn't empty" but not "the marketplace has zero social proof" — ratings (`ratings` table) only populate from real usage, and there's no seed data plan for them.

**How to avoid:**
Seed the demo experts' agents with a handful of realistic, varied ratings/reviews as part of the same seed script that creates the demo documents (`scripts/seed.ts`), not just create the agents themselves. Make sure each seeded expert's credentials text is specific and concrete (PRD §4.1's own example — "18 years of residential HVAC" — is exactly the right level of detail; generic placeholder bios undercut the trust story the demo is supposed to sell).

**Warning signs:**
The marketplace browse page in a rehearsal shows agents with "0 ratings" or a generic one-line bio; sort-by-rating has nothing to differentiate.

**Phase to address:**
Marketplace+hire phase (seed data plan includes ratings, not just agents), verified in polish/demo phase.

---

### Pitfall 9: A streaming error during the live demo fails silently

**What goes wrong:**
Vercel AI SDK's `streamText`/data-stream APIs are documented — including in an open GitHub issue against the `vercel/ai` repo — to fail silently and swallow errors, and `useChat`'s default behavior on error is to set an error state and stop, leaving the user looking at a UI that appears simply frozen with no visible cause ([GitHub vercel/ai#4726](https://github.com/vercel/ai/issues/4726), [dev.to production-lessons writeup](https://dev.to/whoffagents/vercel-ai-sdk-usechat-in-production-lessons-from-real-traffic-4gbo)). In a 4-minute, live, one-shot demo (per MVP-SCOPE's own "presentable" criteria), this specific failure mode is the worst possible one: it looks exactly like the whole product is broken, with no error message to explain what happened or how to recover, and no time to debug live.

**Why it happens:**
The basic AI SDK integration examples don't cover production error handling, and it's easy to wire up the happy-path stream (which works fine in every rehearsal on a good network) without ever testing what the UI does when the LLM call errors, times out, or the network hiccups.

**How to avoid:**
Add an explicit `onError` handler on both the server route (`streamText`'s error callback) and the client (`useChat`'s `onError`) that renders a visible, human-readable message and a retry button — never leave the default "silent stop" behavior in the demo path. Pass `abortSignal: req.signal` through to `streamText` so an aborted/retried request doesn't keep generating (and billing) in the background. Rehearse the failure path once on purpose (kill network mid-stream) so the team knows what a judge would see if it happens live.

**Warning signs:**
Nobody has ever seen what the chat UI looks like when a request fails; the only tested path is "everything works."

**Phase to address:**
Chat runtime phase (error handling built alongside the happy path, not after), verified explicitly in polish/demo phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Build and test only against `PAYMENTS_MODE=mock` until the last week | Demo never depends on a flaky webhook; faster iteration | Real Stripe webhook path (signature verification, idempotency, destination-charge fee/dispute handling) gets discovered broken with no time to fix it before demo day | Fine through most of the billing phase; not acceptable past the point where BIL-5 (Connect onboarding) is claimed "done" — run at least one full real Stripe test-mode purchase before polish/demo phase |
| Changing chunk size, overlap, or embedding model mid-build without re-embedding existing sources | Faster iteration on retrieval quality | Every stored embedding for previously-ingested sources becomes stale/inconsistent with new chunks — silently degrades retrieval with no error, since nothing flags "this source was embedded with old settings" | Only in the build+ingest phase before any demo agent's real content is finalized; never after seed data is locked for demo |
| Skipping an adversarial/out-of-scope eval pass, testing only the 3-5 example questions on each listing | Faster to "looks done" | Pitfall 1 and 4 (overconfident answers, jailbreaks) go undetected until a judge or hirer asks something off-script live | Never — cheap to add, catastrophic to skip given the professional-advice liability context |
| Leaving the admin pre-publish review queue (ADM-1/PRD open question 7) undecided as "add it once strangers join" | One less P0 feature to build | If a team member publishes a deliberately-broken test agent for QA and forgets to unpublish it, it's live on the marketplace during the actual demo | Fine to defer building the queue itself; not fine to skip a manual "audit what's published" pass immediately before demo day |
| Treating the earnings dashboard as "show a total" instead of a per-purchase ledger breakdown | Less UI to build | Reproduces the GPT Store trust failure (Pitfall 7) even at MVP scale, undermining the "money moves" story that's a named MVP goal (PRD §3.4) | Never — the data already exists in the `ledger` table; this is a UI-only shortcut with an outsized narrative cost |

## Integration Gotchas

Common mistakes when connecting to external services (beyond what ARCHITECTURE.md §8 already covers).

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Stripe Connect (destination charges) | Assuming a refund or dispute cleanly reverses the payout — by default the connected (expert) account keeps the transferred funds and the *platform* eats the negative balance unless `refund_application_fee`/reversal is explicitly set ([Stripe docs](https://docs.stripe.com/connect/destination-charges), [ERPClaw](https://www.erpclaw.ai/blog/stripe-connect-application-fees-accounting/)) | Decide and implement the refund/dispute policy for the ledger (does the expert's earnings row reverse too?) before the first real purchase, not after the first refund request during a demo |
| Stripe Connect Express onboarding | Assuming onboarding is instant even in test mode — KYC-style verification steps and grace-period messaging are part of the real flow, so a live "connect your Stripe account" demo step can hang on an unexpected verification screen | Rehearse the exact onboarding flow with the exact test account/SMS code path ahead of time (`000-000` test SMS code per Stripe's testing docs); don't demo Connect onboarding live without a known-good rehearsed path, and keep the "charge goes to platform, payout is manual" fallback (already in architecture §5.3) as the actual demo path if onboarding is unrehearsed |
| Anthropic prompt caching + first-turn disclaimer | Injecting the category disclaimer dynamically per-conversation (e.g., with any per-request variation) breaks the byte-stable system prompt requirement architecture §8.7 already calls out, silently losing the cache-hit benefit for every agent in a regulated category | Bake the disclaimer into the *static* per-agent system prompt at generation time (BLD-3), not as a runtime-injected string per conversation |
| Voyage/embedding provider | Treating "free allowance covers the whole project" as license to re-embed liberally during iteration | Track cumulative embedding calls against the free allowance the same way `llm_usage` tracks LLM spend — a `voyage_usage` log or a running counter avoids finding out mid-build that iteration burned the allowance before demo day |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Passing full conversation history into every chat prompt with no windowing | Latency and token cost creep upward turn-over-turn within a single long conversation | Implement the "last N turns" windowing named in RUN-4 as part of the chat runtime phase, not deferred as P1 — a demo conversation that runs 15+ turns during Q&A will otherwise get slower and pricier live | Around 10-15 turns in a single conversation, well within reach during a live demo Q&A |
| Synchronous ingestion with a spinner (architecture's stated "Week 1" plan) | Feels fine on a 3-page PDF; a 40-page real expert document (exactly what MVP-SCOPE §2 asks the team to seed with) can approach or exceed the ~30s "presentable" target and risks the 300s hard stop on a bad day | Move to the fire-and-forget + polling pattern (architecture's "Week 2" plan) *before* ingesting the real, large seed documents, not after | Any real-world multi-page PDF from an actual expert's practice, which is explicitly what the seed data is supposed to be (MVP-SCOPE: "real content... not lorem ipsum") |
| No per-user or per-IP rate limit on `/api/chat` (RUN-8 is P1) | Fine when only the team is testing | One enthusiastic tester (or a judge) rapid-firing messages against the sandbox can burn a meaningful fraction of the daily LLM spend cap before the actual scheduled demo slot | As soon as the sandbox or public marketplace is reachable by anyone outside the team — i.e., the moment before the demo, when judges get hands-on access |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting retrieved chunk content as instructions rather than data (Pitfall 5) | An expert's own (possibly copy-pasted) document, or a future URL/correction-note ingestion path, silently overrides the persona's rules or disclaimers | Delimit retrieved content in the prompt and explicitly instruct the model that it is reference material only, never instructions |
| No re-affirmation of safety rules deeper into a conversation (Pitfall 4) | A hirer who fails a jailbreak attempt on turn 1 tries a slower, multi-turn social-engineering approach that the one-time safety pre-check doesn't catch | Re-run the safety pre-check per user message (already partly designed in architecture §5.2) and add an explicit "refuse persona-override requests" rule to the system prompt |
| Entitlement (`canChat`) checked only at conversation start, not enforced per message server-side | A crafted client request could replay a `conversationId` that was only briefly entitled | `canChat` is already designed to run "before each message" per RUN-7 — the risk is regression during iteration; keep an integration test asserting the check runs on every `/api/chat` call, not just the first |
| System prompt / persona leak via prompt-leaking attacks | An outsider extracts an expert's full persona/system prompt (their proprietary "how I work" content) and republishes or clones it elsewhere, undercutting the expert's IP that the platform's Terms (PRD §8.4) promise to protect | Treat this as a known, hard-to-fully-prevent risk class ([AI Safety Directory prompt-leaking guide](https://aisecurityandsafety.org/en/guides/prompt-leaking/)) rather than something to solve for MVP; document it as a stated limitation rather than silently promising IP protection the architecture can't fully back |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Paywall triggers abruptly with no warning of remaining free messages | Delphi.ai users specifically reported confusion when the paywall hit before they expected it, souring trust in the product right at the conversion moment ([creatoreconomytools.com](https://creatoreconomytools.com/tool/delphi-ai)) | Show a visible "2 free messages left" style counter before the wall, not just an abrupt 402 |
| Disclaimer shown only in the first assistant message, then never surfaced again in a long conversation | Legal commentary is explicit that a disclaimer that appears once and can be "talked around" is weaker protection than one embedded in the whole experience ([Harris Beach Murtha](https://www.harrisbeachmurtha.com/insights/minimizing-legal-risks-of-ai-powered-chatbots/)) | Keep a persistent, visible disclaimer element in the chat UI chrome for regulated categories, not just a one-time message |
| LLM daily spend cap trips with no user-facing signal | Chat simply stops responding or errors opaquely (compounds Pitfall 9) right when demo traffic is highest | Give the spend-cap-hit path its own clear message ("this demo has reached today's usage limit") distinct from a generic error |
| Ingestion status shows "processing" indefinitely with no distinction from "stuck" | Builder can't tell whether to wait or retry, especially on a 40-page real document | Show elapsed time or a progress indicator, and a clear "failed" state, not just queued/processing/ready |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Citations:** Often means "renders a `[n]` hover card" — verify by spot-checking that the cited chunk's actual text supports the adjacent claim, not just that a citation exists (Pitfall 2).
- [ ] **Grounding / "I don't know" behavior:** Often only tested with in-scope example questions — verify with an adversarial set of out-of-scope and jailbreak-style questions per demo agent (Pitfalls 1, 4).
- [ ] **Payment flow:** Often only exercised via `PAYMENTS_MODE=mock` — verify at least one real Stripe test-mode purchase through the actual webhook, including a refund, before demo week.
- [ ] **Earnings dashboard:** Often shows a single total — verify the per-purchase gross/fee/net breakdown actually renders from real `ledger` rows, not just that the table has data.
- [ ] **Free trial:** Often only tested with one hirer account — verify (and consciously accept, per Pitfall 6) what happens with a second throwaway account.
- [ ] **Marketplace trust signals:** Often means "the agents exist" — verify seeded agents also have realistic ratings/reviews and specific (not generic) credentials text, not zero-review listings.
- [ ] **Streaming error handling:** Often untested entirely — verify the chat UI's actual behavior (not just the happy path) when a request errors or is aborted mid-stream.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Overconfident/ungrounded answer surfaces during demo (Pitfall 1) | LOW | Add the retrieval-score threshold + abstention rule to the prompt; re-run the adversarial eval set; this is a prompt change, not a schema change |
| Jailbreak strips a disclaimer live (Pitfall 4) | LOW–MEDIUM | Add the "refuse persona-override" system-prompt rule and re-run the per-message safety pre-check; if caught before demo day, no data-model change needed |
| Stream error breaks the demo mid-run (Pitfall 9) | LOW | Add `onError` handlers and a retry button; this is additive UI, doesn't touch the working happy path |
| Real Stripe webhook path found broken the week of demo (Technical Debt row 1) | MEDIUM–HIGH | Fall back to `PAYMENTS_MODE=mock` for the actual demo while fixing the webhook path in parallel; architecture already supports this as an env-var switch, so it's a real, low-risk fallback, not a scramble |
| Marketplace looks empty/untrustworthy in rehearsal (Pitfall 8) | LOW | Extend `scripts/seed.ts` to insert seeded `ratings` rows alongside the seeded agents; pure data-seeding work, no code-path change |
| Stripe Connect onboarding hangs on an unrehearsed verification screen live (Integration Gotchas row 2) | LOW | Switch to the already-designed "charge to platform account, manual payout" path (architecture §5.3) for the live demo instead of live-onboarding an expert's Connect account |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|---------------|
| Overconfident/ungrounded answers (1) | Chat runtime | Adversarial eval set of out-of-scope questions per agent returns the fallback message, not a fabricated answer |
| Citation-content mismatch (2) | Chat runtime | Spot-check N sandbox conversations: cited chunk text actually supports the adjacent claim |
| Conflicting/duplicate sources blended (3) | Build+ingest, chat runtime | Upload two intentionally-conflicting test documents to one agent; ask a question both address; answer flags the conflict rather than picking one |
| Persona jailbreak defeats safety rules (4) | Chat runtime | Run 5-10 known jailbreak patterns against a legal/medical/financial demo agent; disclaimer and hard-stops hold |
| Document-borne prompt injection (5) | Build+ingest (before URL/correction-note features ship) | Ingest a document containing an embedded "ignore previous instructions" style string; agent behavior is unaffected |
| Free-trial gaming via multi-accounting (6) | Marketplace+hire | Explicitly documented as an accepted, scoped-out risk (not silently discovered later) |
| Revenue-share opacity (7) | Billing | Earnings page renders per-purchase gross/fee/net from real ledger rows before demo |
| Empty/untrustworthy marketplace (8) | Marketplace+hire | Seed script produces agents with realistic ratings and specific credentials, not zero-review placeholders |
| Silent streaming failure (9) | Chat runtime | Deliberately kill network/abort mid-stream once in rehearsal; UI shows a visible error and retry path |
| Mock-mode tunnel vision on Stripe (Tech Debt) | Billing | At least one real Stripe test-mode purchase + refund exercised through the actual webhook before demo week |
| Chunking/embedding config drift (Tech Debt) | Build+ingest | Any chunking or embedding-model change triggers a documented re-ingest of already-loaded sources, not a silent partial state |

## Sources

- [Why Your RAG Chatbot Fails Users](https://growwstacks.com/blog/why-your-rag-chatbot-fails-users) — MEDIUM confidence (single vendor blog, but pattern corroborated by others below)
- [RAG hallucinations explained: 6 failure points](https://www.red-gate.com/simple-talk/ai/how-to-stop-ai-hallucinations-in-enterprise-rag-systems-a-complete-guide/) — MEDIUM
- [Detecting and Correcting Reference Hallucinations in Commercial LLMs and Deep Research Agents, arXiv:2601.05866](https://arxiv.org/pdf/2601.05866) — MEDIUM-HIGH (peer-reviewable preprint with quantified measurement)
- [oneuptime.com — Evaluate RAG Hallucinations Against Sources](https://oneuptime.com/blog/post/2026-08-31-evaluate-rag-hallucinations-against-sources/view) — MEDIUM
- [Why OpenAI's GPT Store Failed to Gain Traction](https://sallysliu.medium.com/why-openais-gpt-store-failed-to-gain-traction-7783972a5f90) — MEDIUM (corroborated by second independent source below)
- [The GPT Shop Blog — OpenAI GPT Store vs Direct Monetization](https://www.thegptshop.online/blog/openai-gpt-store-revenue-sharing.md) — MEDIUM
- [GrowthMentor — Chicken and Egg Problem](https://www.growthmentor.com/blog/chicken-and-egg-problem) — MEDIUM
- [WC Vendors — Solving The Chicken And Egg Problem In Marketplaces](https://www.wcvendors.com/chicken-and-egg-problem/) — MEDIUM
- [Stripe Docs — Create destination charges](https://docs.stripe.com/connect/destination-charges) — HIGH (official documentation)
- [ERPClaw — Stripe Connect Destination Charges](https://www.erpclaw.ai/blog/stripe-connect-application-fees-accounting/) — MEDIUM
- [Stripe Docs — Testing account verification during API onboarding](https://docs.stripe.com/connect/testing-verification) — HIGH (official documentation)
- [OpenAI Medical Advice Lawsuit / Legal Examiner](https://www.legalexaminer.com/all/technology/can-you-trust-ai-with-medical-advice-openai-lawsuit-tests-the-limits/) — MEDIUM
- [NPR — Pennsylvania sues AI firm over chatbot posing as doctor](https://www.npr.org/2026/05/05/nx-s1-5812861/characterai-chatbot-medical-advice-pennsylvania-lawsuit) — HIGH (mainstream news reporting on an active legal action)
- [TechRadar — New York lawmakers move to block AI chatbots from legal/medical advice](https://www.techradar.com/ai-platforms-assistants/new-york-lawmakers-move-to-block-ai-chatbots-from-giving-legal-or-medical-advice) — MEDIUM
- [Harris Beach Murtha — Minimizing Legal Risks of AI-Powered Chatbots](https://www.harrisbeachmurtha.com/insights/minimizing-legal-risks-of-ai-powered-chatbots/) — MEDIUM (law firm client-advisory, directionally reliable)
- [GitHub vercel/ai#4726 — stream functions fail silently / swallow errors](https://github.com/vercel/ai/issues/4726) — HIGH (primary-source bug report against the exact library in this stack)
- [dev.to — Vercel AI SDK useChat in Production: Lessons From 30 Days of Real Traffic](https://dev.to/whoffagents/vercel-ai-sdk-usechat-in-production-lessons-from-real-traffic-4gbo) — LOW-MEDIUM (blog, unverifiable authorship, but consistent with the GitHub issue above)
- [PredictionGuard — RAG security: indirect prompt injection and knowledge base poisoning](https://predictionguard.com/blog/rag-security-indirect-prompt-injection-and-knowledge-base-poisoning) — MEDIUM
- [Promptfoo — RAG Poisoning](https://www.promptfoo.dev/docs/red-team/plugins/rag-poisoning/) — MEDIUM-HIGH (security-tooling vendor with red-team focus)
- [PayProGlobal — How to Detect & Prevent Free Trial Abuse](https://payproglobal.com/how-to/prevent-free-trial-abuse/) — MEDIUM
- [Delphi.ai Review 2026 — creatoreconomytools.com](https://creatoreconomytools.com/tool/delphi-ai) — LOW-MEDIUM (review-site, but names specific, checkable user complaints about paywall timing and refunds)
- [Valtorian — Marketplace Trust Features in 2026](https://www.valtorian.com/blog/marketplace-trust-2026) — LOW-MEDIUM
- [AI Safety Directory — Prompt Leaking guide](https://aisecurityandsafety.org/en/guides/prompt-leaking/) — MEDIUM
- [FutureAGI — ChatGPT Jailbreak in 2026](https://futureagi.com/blog/jailbreaking-chatgpt-2025/) — MEDIUM

---
*Pitfalls research for: RAG-grounded expert-agent marketplace (Badger Experts MVP)*
*Researched: 2026-09-26*
