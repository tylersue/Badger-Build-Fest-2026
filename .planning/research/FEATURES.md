# Feature Research

**Domain:** Expert-agent marketplace (build a RAG-grounded persona agent from personal documents, publish it, get hired, get paid a revenue share)
**Researched:** 2026-09-26
**Confidence:** MEDIUM-HIGH (cross-checked 2+ independent sources per product; mostly third-party review/analysis sites rather than every claim from an official page — see Sources)

## Comparable Products Checked

| Product | Relevance | What it validates |
|---|---|---|
| [Delphi.ai](https://www.delphi.ai) | Closest analogue — expert "Digital Mind" from documents/media, grounded answers with citations, public Discover/browse directory | RAG-grounded expert cloning is a proven category with paying users; monetization is usually gated to a *higher* tier, not the base plan |
| [Coachvox](https://coachvox.ai) | Second-closest analogue — coach/consultant AI twin, persona sliders, native paywall | Simple persona-config UX (tone/directness/length sliders) is enough; revenue share in the wild is 10–15% |
| OpenAI [GPT Store](https://openai.com/index/introducing-the-gpt-store/) | Largest builder+marketplace at scale | Cautionary tale: engagement-based (not transaction-based) payouts and buried discovery starved most creators — validates PRD's existing critique |
| [Poe creator monetization](https://help.poe.com/hc/en-us/articles/21921312368020) | Per-message creator pricing at platform scale | Direct, creator-set per-use pricing (like our per-conversation unlock) is a real, working model, not a hypothetical |
| Google Gemini Gems | Simplest possible builder UX reference | A builder can be just "name + instructions + up to 10 files" — validates that our persona form is not under-scoped |
| Character.AI | What NOT to do for a trust-based expert platform | Platform monetizes end users via ads/paywalls, not creators — direct revenue share to individual creators is essentially absent |
| LangSmith Agent Builder / LangGraph Platform (now "LangSmith Fleet" / "LangSmith Deployment") | Confirms non-goal | Built for internal tool-calling agents (Gmail/Slack/Linear via MCP), not persona+knowledge marketplaces — renamed twice in under a year, still developer-facing |
| Clarity.fm | Human-expert pricing reference | 15% platform commission on a pay-per-minute live-call model |
| MentorCruise | Human-expert pricing reference | Subscription-per-mentor (~$100/mo) and per-session (~$39) both work as pricing shapes |

## Feature Landscape

### Table Stakes (Users Expect These)

Grouped by the platform's functional areas.

**Builder**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Guided persona form (name, instructions/tone, category) | Every builder reviewed (Gemini Gems, Coachvox, GPT Builder) reduces "build an agent" to a form, not a prompt box | S | Already PRD BLD-2/3. Coachvox's tone/directness/length sliders are a good UX reference for the "how I work" field. |
| Knowledge upload (files) with per-file status | Delphi, Coachvox, Gemini Gems all let you attach source documents; Gemini caps at 10 files/100MB each — a real-world ceiling worth knowing | S–M | PRD BLD-4/KNW-6 already covers this; our 50-file/100MB/5,000-chunk cap is more generous than Gemini's, appropriately so since this is the whole product, not a side feature. |
| Test/sandbox before going live | Delphi and Coachvox both let the creator preview before the clone is customer-facing | S | PRD BLD-6. |
| Creator-set price per use | Poe (per-message), Delphi/Coachvox (subscription) both let the creator, not the platform, set price | S | PRD BLD-8. |
| Publish/unpublish toggle | Universal across every builder reviewed | S | PRD BLD-9. |

**Knowledge / RAG**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Answers grounded in uploaded material, not just model priors | This is Delphi's core pitch ("stays factually tied to what you've actually said or written") and the explicit gap the PRD identifies in GPT Store/Gems ("weak or no knowledge-base workflow") | M | PRD KNW-1–3. This is the product's central differentiator vs. generic chatbots — must be visibly true in the demo. |
| Visible citations per answer | Delphi shows source attribution; industry research (BMJ Open 2026 audit, chatbot-hallucination coverage) shows source attribution is the single most effective anti-hallucination technique available today | M | PRD KNW-5. Given fabricated-citation rates reported across general LLMs (~32% fully accurate in one audit), *showing the actual retrieved chunk*, not just a citation string, is the credible way to earn trust — already the plan (RUN-2). |
| Graceful "I don't know, ask the expert" fallback | None of the comparables (Delphi, Coachvox, GPT Store) reliably do this — it's a stated differentiator, but users still expect *some* limit-acknowledgment behavior rather than confident bluffing | S–M | PRD RUN-3. |

**Chat runtime**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Streaming response | Universal (ChatGPT, Gemini, Delphi, Coachvox, Poe) | S | PRD RUN-1. |
| Conversation persistence (return to a thread) | Universal chat-product expectation | S | Already in MVP-SCOPE USE "In". |
| First-message disclaimer for regulated categories | Necessary given documented legal risk: "customers/regulators treat chatbot output as company speech; disclaimers alone don't dodge liability" — so a disclaimer is table stakes but not sufficient on its own | S | PRD RUN-5/§8.1. Correctly scoped as a hard requirement in MVP-SCOPE, not treated as a compliance program. |

**Marketplace / discovery**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Browse/filter/search by category | Every marketplace reviewed (Delphi Discover, GPT Store, Clarity.fm, MentorCruise) has this as the primary discovery surface | S–M | PRD MKT-2. |
| Expert credibility signals on the listing (bio, credentials, experience) | Clarity.fm/MentorCruise (human marketplaces) make this the #1 purchase driver; Delphi's Discover page leads with named, recognizable creators | S | PRD MKT-3/ACC-3. Because our experts mostly *aren't* pre-famous (unlike Delphi's creator-with-an-audience model), the credibility card has to work harder — this is the key place our MVP differs from Delphi's default assumption. |
| Star rating from real users | Universal social-proof pattern; MentorCruise cites its Trustpilot score prominently as a trust anchor | S | PRD MKT-4 (rating only, review text is P1) — acceptable to sequence rating before written review. |

**Billing / payouts**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Free trial before paywall | Coachvox and Delphi both gate deep monetization behind a taste of the product first | S | MVP-SCOPE HIRE "In". |
| Transparent platform-fee cut visible to the creator | Every comparable disclosed a specific %: Delphi 15% (fee only exists on paid tiers), Coachvox 10%, Clarity.fm 15% | S | PRD BIL-3/BIL-4 sets ours at 20% (configurable) — **higher than every comparable found** (10–15%). Worth a deliberate decision, not a default: no live-human-time cost here (unlike Clarity.fm's per-minute calls), so a higher take could be defensible, but flag for the team since it's out of range on the low end of what similar creators have been trained to expect. |
| Creator earnings dashboard | Every creator-monetization comparable (GPT Store metrics, Poe per-message ledger, Delphi/Coachvox dashboards) surfaces earnings to the creator | S–M | PRD BIL-4. |

**Trust & safety**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Hard-stop on emergency/self-harm patterns | Baseline safety expectation for any consumer-facing conversational AI touching health/legal/financial topics | M | PRD RUN-5/§8.3. |
| Content-ownership terms (expert owns uploads, platform gets a limited license) | Legal table stakes for *any* platform ingesting a creator's proprietary material for resale — this is exactly the "someone steals their material" fear the PRD names as a top expert concern (§4.1) | S | **Gap: see "Missing from MVP-SCOPE" below** — stated in PRD §8.4 narrative but not present as an explicit "In" item (e.g., a consent checkbox) in MVP-SCOPE.md's BUILD or PUBLISH tables. |

**Admin**

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Ability to unpublish/take down an agent | Universal moderation baseline once anyone outside the founding team can publish | S | PRD ADM-1 (P1) — acceptable to defer given MVP is team-only experts at demo time, but this is the first thing to build after demo day per the GPT-Store cautionary tale (uncurated stores fill with low-effort listings fast). |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Direct, creator-set per-conversation pricing (not an opaque engagement pool) | GPT Store's revenue-share program stalled for two years and pays ~$0.03/conversation from a hidden formula; most creators cap out at $100–500/mo. Poe proved a *direct*, creator-set per-message price works at platform scale. Our per-conversation unlock is closer to Poe's model than to GPT Store's — worth foregrounding in positioning ("you set the price, you see exactly what you earned per conversation") | S (already planned) | Depends on: entitlement/ledger (BIL-2/3). |
| Retrieval inspector visible to the *builder* while testing | None of Delphi/Coachvox/GPT-Builder/Gemini Gems expose "here is exactly which chunk the model retrieved and how it scored" to the creator during testing — it's usually a black box even to the person who built it | M | PRD BLD-6. This directly targets the expert's stated fear ("the agent says something wrong under their name") by letting them *see and fix* retrieval before anyone else ever sees it. |
| Marketplace for experts *without* a pre-existing audience | Delphi and Coachvox both implicitly assume the creator brings their own audience/traffic ("model your business assuming you'll drive most traffic yourself" — one Delphi review explicitly warns of this). Our stated wedge is the opposite: a hirer with *no idea who the expert is* can still discover and trust them via category browse + credibility card + citations | M | This is the PRD's own stated differentiator (§2) — the research supports that no comparable actually solves this discovery-without-an-audience problem today; it's a real, unclaimed gap, not just marketing language. |
| Explicit "contact the expert directly" escape hatch inside the chat | Delphi/Coachvox are structured to keep the user inside the AI conversation (engagement is their business model); a visible off-ramp to a real human is a trust signal that fits a marketplace of unknown experts (vs. an audience-building tool for known ones) | S | Present in PRD narrative (§5.2, ACC-3 contact link) — **see "Missing from MVP-SCOPE" below**, should be made an explicit "In" line item since it doesn't currently appear in MVP-SCOPE.md's USE table. |
| Intent-based "ask a question, get routed to the best-suited expert" search | Delphi's `/browse` page does exactly this across its whole creator roster (cross-agent semantic routing) | L | Real feature seen in the wild, but crosses our stated non-goal ("cross-agent retrieval" is explicitly Out in MVP-SCOPE USE table) — good P2 candidate, not MVP. Depends on: semantic search over listings (MKT-7, P2). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| Voice/video cloning of the expert | Delphi's headline differentiator; "sounds and looks like you" is the most visually impressive demo | Materially larger build (media pipeline, consent/likeness risk, latency), and it's explicitly called out as a Non-goal already (PRD §3) — the research confirms it's a real, validated feature elsewhere, but it's the single most expensive thing on any competitor's roadmap relative to value for a 4-week/4-person team | Text-first chat with strong citations; the PRD is right to defer this |
| Mid-conversation ads or metered free tier as the platform's own monetization lever | Character.AI's 2026 shift (full-screen ads mid-chat, 400-message free cap, "charms" micro-transactions) monetizes the *end user's attention*, independent of the expert | Undermines the exact trust relationship this product depends on — a hirer paying to consult "their tax expert's AI" and getting an ad mid-answer breaks the premise entirely; also legally/ethically messier in regulated categories (legal/medical/financial) | Keep monetization solely at the purchase/entitlement layer (already the plan) |
| Engagement-based/opaque revenue-share formula (GPT Store's model) | Superficially simpler to implement (no per-transaction ledger, just a pool split by usage metrics) | Two years after launch, OpenAI's own community reports payouts still averaging $0.03/conversation with an undisclosed formula — creators can't reason about what they'll earn, which erodes the core value prop ("get paid when other people use it") | Direct per-purchase ledger entry the creator can see line-by-line (already PRD BIL-3/4) |
| Building a bespoke visual workflow/graph builder (LangGraph-style) | Looks powerful, "lets experts build anything" | This is precisely what the PRD's own gap analysis says makes LangSmith/Dify/Flowise inaccessible to a non-technical expert; LangSmith itself just renamed its no-code layer twice in under a year chasing internal-productivity use cases, not persona marketplaces — confirms this is the wrong reference model entirely | Fixed persona form + prompt template (already the plan) |
| Done-for-you / concierge onboarding tier (Coachvox's $16,000 white-glove tier) | Removes onboarding friction entirely for the expert | Doesn't scale with a 4-person team and isn't needed once the self-serve <15-minute BUILD flow works | Keep the onboarding self-serve; revisit only if self-serve completion rates are bad post-MVP |

## Feature Dependencies

```
Persona form (BLD-2/3)
    └──requires──> System prompt template
Knowledge upload (BLD-4)
    └──requires──> Parsing → chunking → embedding (KNW-1/2)
                       └──requires──> Retrieval top-k (KNW-3)
                                          └──requires──> Citations shown in chat (KNW-5)
                                                             └──enables──> "Retrieval inspector" differentiator (BLD-6)

Free trial (entitlement) ──requires──> Conversation + message counter
Paywall/Stripe Checkout ──requires──> Entitlement check (RUN-7)
    └──requires──> Purchase webhook (BIL-2)
                       └──requires──> Ledger entry (BIL-3)
                                          └──requires──> Earnings dashboard (BIL-4)

Publish (BLD-9) ──requires──> Persona complete + ≥1 knowledge source ready
    └──enables──> Marketplace listing (MKT-3)
                       └──enables──> Browse/search (MKT-2)

Star rating (MKT-4) ──requires──> ≥5 messages exchanged (per PRD threshold)

Admin review queue (ADM-1) ──conflicts──> "Publish is instant" demo requirement
    (deliberately sequenced as P1, turned on only once non-team experts join — correct per research: uncurated marketplaces degrade fast once open, per GPT Store's flooding problem, but curation friction would break the <15-min BUILD demo goal today)
```

### Dependency Notes

- **Citations require the full ingest pipeline to already be correct** (parse → chunk → embed → retrieve): there's no shortcut to "grounded answers with citations" — if any earlier step in that chain is degraded (e.g., PDF parsing loses page numbers), the citation feature silently breaks even though it looks like a UI-only feature.
- **The retrieval-inspector differentiator is nearly free once citations exist** — it's largely the same data (retrieved chunk + score) already computed for RUN-2/KNW-5, just surfaced to the builder instead of (or in addition to) the hirer. Sequence it right after citations, not as separate work.
- **Admin review queue conflicts with the "publish is instant" MVP goal** — this is a real, deliberate tension the team has already resolved correctly (defer until strangers join) rather than an oversight.

## MVP Definition

### Launch With (v1) — matches current MVP-SCOPE.md, validated against research

- [x] Persona form → auto-generated system prompt — table stakes, confirmed by every builder reviewed
- [x] Multi-format knowledge upload with per-file status — table stakes, confirmed by Delphi/Coachvox/Gemini Gems
- [x] Grounded answers with visible citations — the product's core differentiator; matches Delphi's own headline claim and directly counters the fabricated-citation problem documented industry-wide
- [x] Sandbox test chat with retrieval inspector — table stakes for builder trust, and doubles as a differentiator since no comparable exposes this
- [x] Creator-set price + free trial + Stripe paywall — matches Poe's proven direct-pricing model, avoids GPT Store's opaque-pool trap
- [x] Category browse/search + credibility card (bio, credentials, experience) — matches human-marketplace trust patterns (Clarity.fm/MentorCruise) applied to an AI-agent listing
- [x] Ledger + earnings dashboard — table stakes across every creator-monetization comparable

### Add After Validation (v1.x)

- [ ] Written reviews (not just star rating) — trigger: once star-rating volume is meaningful enough that text reviews add signal
- [ ] Admin pre-publish review queue — trigger: the day a non-team-member expert signs up (already the team's own stated trigger, and it matches the GPT-Store lesson that uncurated stores degrade)
- [ ] Credential verification / "Verified" badge — trigger: same as above; this is the single highest-leverage trust feature once experts are strangers to the platform, since it's the #1 driver in every human-expert marketplace reviewed
- [ ] Stripe Connect real payouts — trigger: first real (non-team) expert requests a payout
- [ ] Explicit ToS/content-ownership consent capture — should really move earlier (see gap below), but at minimum before any non-team expert uploads real proprietary material

### Future Consideration (v2+)

- [ ] Voice/video cloning — defer until text-based product-market fit is proven; Delphi's own build cost here is the biggest line item on their roadmap
- [ ] Cross-agent semantic "ask and get routed to the best expert" search — defer until there are enough agents per category for routing to matter (Delphi's `/browse` model)
- [ ] Subscription/credits-wallet pricing — defer until per-conversation pricing data shows demand for a different shape (MentorCruise/Delphi both support this as an *addition* to, not replacement for, one-off pricing)
- [ ] Embeddable widget (agent on the expert's own website) — a real Delphi feature and plausible differentiator, but adds a second surface (auth, entitlement, styling) outside the marketplace's own funnel — defer until the core marketplace loop is validated

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Grounded answers + citations | HIGH | MEDIUM | P1 |
| Persona form + sandbox | HIGH | LOW | P1 |
| Category browse + credibility card | HIGH | LOW | P1 |
| Creator-set pricing + paywall + ledger | HIGH | MEDIUM | P1 |
| Retrieval inspector (builder-facing) | MEDIUM | LOW (piggybacks on citations) | P1 |
| ToS/content-ownership consent capture | MEDIUM | LOW | P1 (currently under-scoped — see gap) |
| "Contact the expert" chat CTA | MEDIUM | LOW | P1 (currently under-scoped — see gap) |
| Written reviews | MEDIUM | LOW | P2 |
| Admin review queue + Verified badge | HIGH (post-launch) | MEDIUM | P2 |
| Stripe Connect real payouts | HIGH (post-launch) | MEDIUM | P2 |
| Voice/video cloning | MEDIUM | HIGH | P3 |
| Cross-agent semantic routing | MEDIUM | HIGH | P3 |
| Subscriptions/credits wallet | LOW (unvalidated demand) | MEDIUM | P3 |

## Competitor Feature Analysis

| Feature | Delphi.ai | Coachvox | GPT Store | Our Approach |
|---|---|---|---|---|
| Grounding/citations | Yes, core pitch | Yes, "strictly within your knowledge base" | No general guarantee | Same as Delphi's promise, but citations shown to *builder* too (differentiator) |
| Monetization model | Subscription/one-time, but only on top ($299+) tier, 15% fee | Subscription paywall, 10% fee | Opaque engagement pool, ~$0.03/message | Direct per-conversation unlock, creator-set price, 20% fee, visible ledger |
| Discovery | Public Discover/browse directory + intent routing | Mostly creator-driven traffic (embed on own site) | Category store, but "buried discovery" per multiple reviews | Category browse + search + featured row (MKT-2/5), targeting experts *without* pre-existing audiences |
| Trust signals | Named, often-recognizable creators | Creator's own brand | Basic star rating | Self-reported credentials (Verified badge deferred to P1/P2) + citations + star rating |
| Builder complexity | Connect existing content (books/podcasts/YouTube) — heavier ingestion surface | Sliders for tone/directness/length | Natural-language GPT description | Structured persona form (name/category/headline/how-I-work) — closer to Coachvox's simplicity than Delphi's broad-media ingestion |

## Missing from MVP-SCOPE.md "In" Columns (table-stakes items to add explicitly)

These three items are already implied by the PRD's own narrative sections but are **not currently listed as explicit "In" items in MVP-SCOPE.md's tables**. Recommend pulling them forward into the scope doc rather than leaving them only in PRD prose:

1. **ToS / content-ownership consent capture** — PRD §8.4 states "Terms state the expert owns their uploaded content and grants the platform a license." This is genuine legal table stakes for any platform that ingests a creator's proprietary material and resells access to it, and it directly addresses the #1 fear the PRD itself names for experts ("someone steals their material," §4.1). MVP-SCOPE's BUILD and PUBLISH tables have no consent-checkbox or ToS-acceptance line item. Low complexity (a checkbox + a static terms page) — should be added to BUILD's "In" column.
2. **"Contact the expert directly" CTA inside the chat** — PRD §5.2 describes it explicitly ("Can click 'Contact the expert directly' (mailto / link expert set)"), and ACC-3 collects the contact link, but MVP-SCOPE's USE table doesn't list this as an explicit "In" item — it only lists thumbs up/down. This is also a real differentiator (see above) versus Delphi/Coachvox, which structurally keep the user inside the AI conversation. Low complexity since the data (contact link) is already being collected — should be added to USE's "In" column.
3. **User-facing "flag this agent" affordance** — PRD §8 (Trust, safety, and legal, item 6) states "any user can flag an agent; admin can unpublish instantly," and ADM-3 depends on a "flagged conversations list" existing — but nothing in MVP-SCOPE's tables creates the *hirer-facing* flag button that would populate that list. Low complexity (a single "report" link/button) — should be added to USE's "In" column, since ADM-3 currently has no upstream source of flags other than thumbs-down.

None of these require a new table, service, or page outside the existing loop — they're small additions to forms/UI already being built, not scope creep.

## Sources

- Delphi.ai: [tooldirectory.ai review](https://tooldirectory.ai/tools/delphi), [official pricing](https://www.delphi.ai/pricing), [official Discover directory](https://www.delphi.ai/discover), [buddypro.ai marketplace analysis](https://buddypro.ai/blog/delphi-ai-marketplace-paying-subscribers-2026)
- Coachvox: [official monetization page](https://coachvox.ai/charge-for-ai/), [davidriha.com pricing/revenue-share breakdown](https://davidriha.com/blog/coachvox-ai-pricing-2026-revenue-share/), [quso.ai review](https://quso.ai/blog/coachvox-ai-review-features-pros-cons-alternatives)
- OpenAI GPT Store: [official announcement](https://openai.com/index/introducing-the-gpt-store/), [OpenAI Developer Community thread on stalled revenue share](https://community.openai.com/t/what-is-the-status-with-gpt-store-revenue-share/839172), [gptstorerevenueprogram.com](https://gptstorerevenueprogram.com/)
- Poe: [official Creator Monetization FAQ](https://help.poe.com/hc/en-us/articles/21921312368020-Poe-Creator-Monetization-FAQs), [Poe Creator Platform docs](https://creator.poe.com/docs/resources/creator-monetization)
- Google Gemini Gems: [official Gemini Apps Help — sharing](https://support.google.com/gemini/answer/16504957), [ai-toolbox.co walkthrough](https://www.ai-toolbox.co/gemini-management-and-productivity/how-to-use-gemini-gems-create-custom-2026)
- Character.AI: [Sacra company profile](https://sacra.com/c/character-ai/), [mypresio.com 2026 review](https://mypresio.com/blog/character-ai-review-2026)
- LangSmith Agent Builder / LangGraph Platform: [official LangChain blog](https://www.langchain.com/blog/langsmith-agent-builder), [LangGraph docs](https://docs.langchain.com/oss/python/langgraph/overview)
- Clarity.fm / MentorCruise: [MentorCruise's own Clarity.fm review](https://mentorcruise.com/blog/clarityfm-review-and-alternative/), [ADPList mentorship-platform roundup](https://adplist.org/guides/best-mentorship-platforms)
- Hallucination/citation risk: [BMJ-referenced chatbot audit summary via teledirectmd.com](https://teledirectmd.com/health-guides/ai-chatbot-medical-information-safety/), [TechRepublic on disclaimer limits](https://www.techrepublic.com/article/news-ai-chatbot-warning-labels/)
- Internal project docs read: `docs/PRD.md`, `docs/MVP-SCOPE.md`, `docs/RESEARCH.md`

---
*Feature research for: Expert-agent marketplace (RAG-grounded persona agents, build/publish/hire/use loop)*
*Researched: 2026-09-26*
