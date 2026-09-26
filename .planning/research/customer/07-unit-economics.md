# 07 — Unit Economics and Pricing Realism

**Date:** 2026-09-26 · **Scope:** the numbers a Badger Build Fest judge will poke at: cost per message, cost to build an agent, what hirers pay, what experts earn, what the platform keeps, and what happens when model prices keep falling. Every formula is shown; every constant is traceable to the Sources list.

**TL;DR.** A typical RAG message on Claude Sonnet 5 costs **~1.5¢** raw (1.43¢ model + 0.09¢ Haiku guard call) with the system prompt cached, 1.7¢ without. Building an agent from a 40-turn interview plus a 50-page PDF costs **20–74 credits ($0.20–$0.74)**. At the recommended default multiplier of **3x**, a hirer pays **4.6¢ a message, ~46¢ for a 10-message session**, and the expert takes home **2.6¢ a message** (85% of the markup). The platform's effective take is only **10% of gross** at 3x because "15% of margin" is a much smaller number than the 15%-of-gross Delphi and Clarity charge. Per-message pricing at these costs cannot pay an expert a living (at 3x, $100/month needs ~3,900 messages), and raw model cost is falling roughly 10x a year, so the MVP should ship the multiplier as specified but pitch **session passes** as the next pricing move.

---

## 0. Price constants (verified 2026-09-26)

| Model | Input $/MTok | Output $/MTok | 5-min cache write | Cache read | Min cacheable prefix |
|---|---|---|---|---|---|
| Claude Sonnet 5 | $2.00 | $10.00 | $2.50 (1.25x) | $0.20 (0.1x) | 1,024 tokens |
| Claude Haiku 4.5 | $1.00 | $5.00 | $1.25 | $0.10 | 4,096 tokens |
| Claude Opus 5.5 | $4.00 | $20.00 | $5.00 | $0.20 (0.05x) | 512 tokens |
| Claude Opus 5 | $5.00 | $25.00 | $6.25 | $0.50 | 512 tokens |
| Voyage `voyage-4-lite` (embeddings) | $0.02 | — | — | — | 200M free tokens |

Sources: [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing); [Voyage pricing, updated Aug 26 2026](https://docs.voyageai.com/docs/pricing). Three footnotes that matter for a judge: (1) Sonnet 5's $2/$10 was introductory and scheduled to rise to $3/$15 on Sept 1 2026; Anthropic's page now states the increase "will not occur" and $2/$10 is the standard price. (2) Claude 4.7+ models (including Sonnet 5 and Opus 5.5) use a tokenizer that produces ~30% more tokens for the same text than Sonnet 4.6; the token counts below are assumed to be measured in the model's own tokenizer, so do not re-inflate them. (3) The minimum cacheable prefix is 1,024 tokens on Sonnet 5 but 4,096 on Haiku 4.5, so a 1.5k-token system prompt caches on Sonnet 5 and **silently does not cache on Haiku 4.5** (per the prompt-caching reference in Anthropic's docs).

---

## 1. Cost per message

**Formula.** `cost = cached_in × P_read + uncached_in × P_in + out × P_out + guard + embed`, where `guard` is an optional Haiku 4.5 scope/jailbreak check (~800 in / 20 out = 0.09¢) and `embed` is the query embedding (~50 tokens on voyage-4-lite = 0.0001¢, effectively zero).

**Typical message:** system prompt 1,500 tokens (cached), 8 chunks 3,000, history 2,000, answer 400.
**Heavy message:** system 1,500 (cached), 16 chunks 6,000, history 8,000, hirer-uploaded document 6,000, answer 1,200.

| Model | Typical, no cache | Typical, system cached | Typical, system + history cached | Heavy, system cached |
|---|---|---|---|---|
| Sonnet 5 | 1.70¢ | **1.43¢** | 1.07¢ | 5.23¢ |
| Haiku 4.5 | 0.85¢ | 0.85¢ (cannot cache 1.5k) | 0.85¢ | 2.75¢ |
| Opus 5.5 | 3.40¢ | 2.83¢ | 2.07¢ | 10.43¢ |
| Opus 5 | 4.25¢ | 3.58¢ | 2.68¢ | 13.08¢ |

Worked example, Sonnet 5 typical with system cached: `1,500 × $0.20/M + 5,000 × $2.00/M + 400 × $10/M = $0.0003 + $0.0100 + $0.0040 = $0.0143` = 1.43¢. Add the guard call and the constant the rest of this report uses is **raw_typical = 1.52¢ ≈ 1.5¢; raw_heavy = 5.32¢**.

**Effect of caching.** Caching the system prompt saves 16% on a typical message (1.70 → 1.43¢) and costs a one-time 5-minute cache write of `1,500 × $2.50/M` = 0.375¢, which is refreshed free on every hit. Because the system prompt is *per agent* and byte-stable, it is shared across every hirer of that agent, so a popular agent's cache is effectively always warm. Caching history too would cut the message to 1.07¢ (a further 25%) but conflicts with stripping old chunks out of history to keep it small; for the MVP, cache the system prompt only. A 10-message session at raw on Sonnet 5, including the one cache write and guard calls, is **15.6¢**.

**Model choice.** Haiku 4.5 is 40% cheaper but cannot cache the prompt and is the wrong tier for tax and PT answers under an expert's name; Opus 5.5 doubles the price for no demo-visible gain. Use Sonnet 5 for every category, Haiku 4.5 for guard and tagging calls.

---

## 2. What it costs an expert to build an agent

Assumptions for a 45-minute typed interview: 40 turns; interviewer system prompt 2,000 tokens; expert answers average 130 tokens; interviewer questions 120 tokens; the transcript is resent every turn.

`cumulative_input = Σ_{t=0}^{39} (2,000 + 250·t) = 275,000 tokens; output = 40 × 120 = 4,800 tokens.`

| Step | Formula | Cost |
|---|---|---|
| Interview, uncached (Sonnet 5) | 275,000 × $2/M + 4,800 × $10/M | $0.598 |
| Interview, automatic prefix caching | 263,000 reads × $0.20/M + 12,000 writes × $2.50/M + output | **$0.131** |
| Answer → chunk processing (Haiku, 40 calls, 600 in / 100 out) | 40 × (600 × $1/M + 100 × $5/M) | $0.044 |
| Persona draft (Sonnet, 10k in / 800 out) | 10,000 × $2/M + 800 × $10/M | $0.028 |
| Embed 200 answers (~150 tokens each = 30k tokens) | 30,000 × $0.02/M | $0.0006 |
| 50-page PDF (~40k tokens with overlap): embed | 40,000 × $0.02/M | $0.0008 |
| 50-page PDF: optional Haiku chunk titling | 40,000 × $1/M + 4,800 × $5/M | $0.064 |
| **Total build** | | **$0.20 (cached, no titling) to $0.74 (uncached, with titling)** |

In credits at raw cost that is **20–74 credits**. Fifty sandbox test messages add 76 credits. Embedding is a rounding error (and free under Voyage's 200M-token allowance); the interview transcript is the only cost that grows, and prompt caching is what keeps it at 13¢ instead of 60¢. Turns are ~1 minute apart, well inside the 5-minute cache TTL. **Implication:** a 500-credit starting grant for experts covers the build 7x over plus 250 sandbox messages, so "you can build your agent for free" is literally true.

---

## 3. Hirer economics

`price_per_message = raw × m`, where `m` is the expert-set multiplier.

| Multiplier | Per typical message | 10-message session | 10 heavy messages |
|---|---|---|---|
| 1x (at cost) | 1.52¢ | 15¢ | 53¢ |
| 2x | 3.04¢ | 30¢ | $1.06 |
| **3x (default)** | **4.56¢** | **46¢** | **$1.60** |
| 5x (cap) | 7.60¢ | 76¢ | $2.66 |

**Comparators (what the hirer would otherwise pay):**

| Alternative | Price | Sessions at 3x it buys |
|---|---|---|
| JustAnswer membership | $28–$125/month plus a $1 or $5 "join" fee, per the [FTC complaint, Jan 13 2026](https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription) | 61–274 |
| Intro.co expert video call | lowest listed expert $79/session; sessions run 15 min–3 h, most 15–60 min ([intro.co](https://intro.co/), [FAQ](https://intro.co/faq)) | 173+ |
| TurboTax Expert Assist | $79–$209 federal list ($39–$159 promo) plus $39–$49 per state; Full Service from ~$89–$150 ([CNBC Select, Mar 19 2026](https://www.cnbc.com/select/turbotax-review/)) | 173–458 |
| PT cash visit | assumed $75–$150/visit (unverified, see list) | 164–329 |
| 1-hour admissions consultant | assumed $150–$300/hour (unverified, see list) | 329–658 |

Even at the 5x cap a 10-message session (76¢) is under 3% of JustAnswer's cheapest month and under 1% of one Intro call. The product is not competing on price with any of these; it is competing with "did not ask anyone."

**Free grant sizing.** Trying two agents for five messages each is 10 messages: 46¢ at 3x, 76¢ at 5x, $1.60 if every message is heavy at 3x. A **200-credit ($2.00) grant** covers 10 heavy messages at 3x or 26 typical messages at 5x, and reads as "about 40 free messages" on the landing page. A 100-credit grant would be exhausted by two heavy conversations, and the sibling PITFALLS research already flags an abrupt paywall as a trust-killer.

---

## 4. Expert economics

Let `s` = platform's share of margin (0.15). Then:

`margin = raw × (m − 1)` · `expert_earning = (1 − s) × margin = 0.85 × raw × (m − 1)` · `platform_take = s × margin`.

| Multiplier | Price | Margin | Expert earns / msg | Platform take / msg | Platform take as % of gross |
|---|---|---|---|---|---|
| 1x | 1.52¢ | 0 | 0 | 0 | 0% (pro-bono setting) |
| 2x | 3.04¢ | 1.52¢ | 1.29¢ | 0.23¢ | 7.5% |
| 3x | 4.56¢ | 3.04¢ | **2.58¢** | 0.46¢ | 10.0% |
| 5x | 7.60¢ | 6.08¢ | 5.17¢ | 0.91¢ | 12.0% |

**Messages per month to reach an income target** (`N = target / expert_earning`):

| Target | 2x | 3x | 5x |
|---|---|---|---|
| $100/mo | 7,740 msgs (26 sessions/day) | 3,870 (13/day) | 1,935 (6.4/day) |
| $500/mo | 38,700 | 19,350 | 9,675 |
| $2,000/mo | 154,800 | 77,400 | 38,700 |

**Reality check against other creator platforms.**
- **JustAnswer experts** are paid $2–$20 per answer and paid out monthly above a $20 balance ([SideHusl, updated Apr 21 2025](https://www.sidehusl.com/justanswer/)). One $2 JustAnswer answer equals the expert income from **77 of our messages** at 3x; a $20 answer equals 774.
- **Poe** denominates creator prices in *milli-cents* (thousandths of a US cent) in its [bot monetization API](https://creator.poe.com/docs/server-bots/poe-bot-monetization-api-documentation), with example rates like 10 milli-cents per 1k tokens: the same "too small to feel like money" scale we are at. The widely repeated claim that most Poe creators earn under $100/month could not be sourced to a primary page (help center returns 403); treat it as unverified.
- **GPT Store** payouts are reported by creators at ~$0.03 per conversation from an undisclosed formula (sibling FEATURES research citing an [OpenAI community thread](https://community.openai.com/t/what-is-the-status-with-gpt-store-revenue-share/839172); not re-verified here). Our 3x session pays the expert 26¢, roughly 9x that, and every cent is itemized.
- **Delphi** charges the *creator* $0 / $79 / $299 per month ([pricing](https://www.delphi.ai/pricing)); its showcase creator Matthew Hussey has run 2.5M+ conversations and the company raised a $16M Series A in June 2025 ([Delphi blog](https://www.delphi.ai/blog)), but both facts describe creators who arrive with an audience. Delphi publishes no earnings distribution.
- **Substack** reports 50,000 creators earning money (Oct 2025), 5M paid subscriptions (Mar 2025) and a 10% take ([Wikipedia summary](https://en.wikipedia.org/wiki/Substack)); no median is published, and the known numbers (top ten publishers at $7M annualized in 2021) describe a power law.

**Honest takeaway for the stage:** at MVP volumes an expert will earn tens of dollars, not hundreds. That is fine, because the MVP's job is to prove the metering loop (every message shows gross → platform take → expert credit), not to replace an income. The number that *does* impress is the ratio: the expert keeps 85% of the markup and the platform keeps 15%, versus JustAnswer keeping an undisclosed majority and GPT Store keeping an undisclosed formula.

---

## 5. Platform economics

`platform_share_of_gross = s × (m − 1) / m` → 7.5% at 2x, 10% at 3x, 12% at 5x. Raw model cost is passed through at exactly cost, so **the platform's only income is 15% of the markup**. The 15% anchor from Delphi and Clarity.fm is 15% *of gross*; ours is 15% *of margin*, which is 1.5–2x thinner. Keep it for the demo (it is the creator-friendly headline), but know what it implies below.

**Cash cost of a spent credit.** At 3x, every credit a hirer spends costs the platform `raw + expert_share = (1.52 + 2.58) / 4.56` = **90% of face**; the platform nets 10%. Infra is a rounding error at MVP scale (Supabase Pro from $25/mo, Vercel Pro $20/seat/mo; [supabase.com/pricing](https://supabase.com/pricing), [vercel.com/pricing](https://vercel.com/pricing)); call fixed cost ~$46/month.

**Contribution after free grants.** If experts are paid on free-credit usage (they must be, or the demo cannot show earnings), 10 free messages at 3x cost the platform **41¢ of real money** (15¢ raw + 26¢ expert payout), and it takes **90 paid messages** at 0.46¢ take to recoup that. At 5x it is 67¢ and 73 messages. Per-message take cannot fund acquisition; subscriptions and breakage must.

**Subscription tiers.** Grant credits 1:1 with dollars. Bonus credits are underwater: a $50 tier granting 6,000 credits costs $54 in cash if fully used at 3x (net −$4), while 5,000 credits nets $5 at full use and $23 at 60% utilization.

| Tier | Credits | Net at 60% used | Net at 100% used |
|---|---|---|---|
| $10 | 1,000 | $4.60 | $1.00 |
| $20 | 2,000 | $9.20 | $2.00 |
| $50 | 5,000 | $23.00 | $5.00 |

**Break-even.** `subscribers = fixed / net_per_subscriber` → **10 subscribers** on the $10 tier at 60% utilization, 46 at 100% utilization. Since purchases are mocked in the MVP, the live number is the demo's projected one; state it as "ten paying users cover the servers."

---

## 6. Sensitivity

**Raw cost keeps falling.** a16z measured a 10x/year decline in the price of constant-capability inference from Nov 2021 to Nov 2024 ([a16z, LLMflation](https://a16z.com/llmflation-llm-inference-cost/)); Epoch AI measured 9x to 900x per year depending on the capability threshold, ~40x/year for GPT-4-level science questions ([Epoch AI, Mar 12 2025](https://epoch.ai/data-insights/llm-inference-price-trends)). Sonnet 5 itself is 33% cheaper than Sonnet 4.6, and the planned Sept 2026 increase was cancelled.

If raw drops 5x to 0.30¢: at 3x a message is 0.91¢, the expert earns 0.52¢, and $100/month needs **19,350 messages**; at 5x, 9,675. Nothing in the ledger breaks, but every revenue line (expert income, platform take) shrinks 5x while hirers get 5x more messages per credit. **Cost-plus pricing indexes the whole business to a deflating input.** This is Poe's problem in one sentence: a price expressed in milli-cents cannot feel like money to either side, and a multiplier of a vanishing number is still a vanishing number.

**What bundling fixes.** Price the expert's judgment, not the tokens, by selling a fixed unit whose price is decoupled from raw cost:

| Bundle | Price | Raw cost | Margin | Expert (85%) | Platform (15%) |
|---|---|---|---|---|---|
| Per message at 3x (today) | 4.56¢ | 1.52¢ | 3.04¢ | 2.58¢ | 0.46¢ |
| Session pass, 20 messages | 99 credits | 30¢ | 69¢ | 58¢ | 10¢ |
| Monthly allowance, 200 messages with one agent | 500 credits | $3.04 | $1.96 | $1.67 | 29¢ |

The session pass pays the expert 58¢ for a conversation that per-message pricing pays 52¢ for (20 × 2.58¢), so it is roughly income-neutral today, but when raw cost falls 5x the pass still pays the expert ~75¢ (margin grows to 93¢) while per-message pays 10¢. Bundles convert cost deflation into expert margin instead of platform shrinkage. They also fix the psychology: "99 credits for a session" is a purchase; "4.56 credits" is noise. Recommend: MVP ships the multiplier exactly as specified (it is already in REQUIREMENTS CRED-04 and PUB-01), stores the expert's price as a *credits-per-message number derived from the multiplier at publish time*, and adds session passes as the first post-MVP pricing feature.

---

## 7. Recommended MVP pricing constants

| Constant | Value | Why |
|---|---|---|
| Chat model | Claude Sonnet 5, all categories | 1.43¢ typical, caches at 1.5k; Haiku cannot cache it; Opus 5.5 is 2x for no demo gain |
| Guard / tagging model | Claude Haiku 4.5 | 0.09¢ per call |
| Embeddings | voyage-4-lite, 1024-d | $0.02/MTok, 200M free |
| `RAW_TYPICAL_CENTS` | 1.5 (heavy 5.3) | Section 1; also the placeholder "typical cost" for a brand-new agent until it has 50 real messages |
| Multiplier range / default | 1x–5x, default **3x**, integer steps | 3x = 4.6¢/msg, 46¢/session; expert earns 2.6¢/msg |
| Platform margin share `s` | 0.15 | Market anchor; effective 10% of gross at 3x |
| Ledger unit | integer milli-credits (1/1000 credit) | Raw cost is 1.52¢, so whole-credit rounding would be a hidden 30% markup; Poe uses milli-cents for the same reason |
| Display | credits to one decimal | "4.6 credits per message" |
| New hirer grant | 200 credits | 10 heavy messages at 3x; ~40 typical; platform cash cost ≤ 41¢ per new hirer |
| New expert grant | 500 credits | Build (20–74) + 250 sandbox messages + trying other agents |
| Entitlement check | balance ≥ max(10 credits, 2 × agent's listed typical price) | Heavy message at 5x is 26.6 credits; charge after the call, tolerate a small negative |
| Subscription tiers (mocked) | $10 → 1,000; $20 → 2,000; $50 → 5,000 credits | 1:1; bonuses go underwater at 90% cash cost per credit |
| Credit packs (mocked) | 500 credits $5; 2,000 credits $20 | Same 1:1 rule |

**What the founder says on stage:**

> "A message to an expert's agent costs us about a cent and a half in model cost. We show the expert that number and let them mark it up one to five times. At the default of three, a hirer pays four and a half cents a message, about forty-five cents for a ten-message session, which is under two percent of a JustAnswer month and under one percent of one fifteen-minute Intro call. The expert keeps 85 percent of the markup, about two and a half cents a message, and sees every cent in a ledger; we pass model cost through at cost and keep 15 percent of the markup, so we only make money when the expert does. Building your agent, a 45-minute interview plus a 50-page PDF, costs under a dollar. And because model prices fall about ten times a year, our next move is session passes that price the expert's judgment, not the tokens."

---

## Sources

- Anthropic model, cache and batch pricing (Sonnet 5 $2/$10 made permanent; cache multipliers; tokenizer note): https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic prompt-caching minimum prefix by model (1,024 Sonnet 5; 4,096 Haiku 4.5): https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Voyage AI pricing (voyage-4-lite $0.02/MTok, 200M free; updated Aug 26 2026): https://docs.voyageai.com/docs/pricing
- FTC v. JustAnswer press release, Jan 13 2026 ($1/$5 join fee; $28–$125/month): https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription
- FTC case page (filed Jan 13 2026, updated Jul 20 2026): https://www.ftc.gov/legal-library/browse/cases-proceedings/justanswer
- JustAnswer expert pay ($2–$20 per answer; $20 payout threshold), SideHusl, updated Apr 21 2025: https://www.sidehusl.com/justanswer/
- Intro.co expert rates ($79–$2,500 per session) and session lengths (15 min–3 h): https://intro.co/ and https://intro.co/faq
- TurboTax 2026 tier prices, CNBC Select, Mar 19 2026: https://www.cnbc.com/select/turbotax-review/
- TurboTax Live product page (dynamic pricing, "pay only when you file"): https://turbotax.intuit.com/personal-taxes/online/live/
- Poe bot monetization API (milli-cent units): https://creator.poe.com/docs/server-bots/poe-bot-monetization-api-documentation
- Poe creator monetization overview: https://creator.poe.com/docs/creator-monetization
- Delphi pricing ($0/$79/$299 per month): https://www.delphi.ai/pricing
- Delphi blog ($16M Series A Jun 24 2025; Matthew Hussey 2.5M+ conversations): https://www.delphi.ai/blog
- Substack figures (5M paid subs Mar 2025; 50,000 earning creators Oct 2025; 10% take): https://en.wikipedia.org/wiki/Substack
- a16z, LLMflation (10x/year cost decline, 2021–2024): https://a16z.com/llmflation-llm-inference-cost/
- Epoch AI, LLM inference price trends (9x–900x/year), Mar 12 2025: https://epoch.ai/data-insights/llm-inference-price-trends
- Supabase pricing (Pro from $25/mo): https://supabase.com/pricing
- Vercel pricing (Pro $20/seat/mo): https://vercel.com/pricing
- Sibling research in this repo: `.planning/research/FEATURES.md` (Delphi 15%, Coachvox 10%, Clarity.fm 15% take rates; GPT Store ~$0.03/conversation) and `.planning/research/STACK.md` (model and embedding choices)

## Unverified

- **PT cash-pay visit $75–$150** and **admissions consultant $150–$300/hour**: every candidate page (GoodRx, CostHelper, Healthline, Crimson, IECA, US News) returned 403/404/429 in this session; these are stated assumptions and should be replaced with a cited figure before the pitch.
- **"Most Poe creators earn under $100/month"**: Poe's help-center FAQ (https://help.poe.com/hc/en-us/articles/21921312368020) returned 403; the claim is repeated in secondary commentary but no primary source was reached.
- **Substack median writer earnings**: Substack publishes no median; only aggregate counts and top-earner figures are public.
- **Delphi 15% revenue share, Coachvox 10%, Clarity.fm 15%, GPT Store ~$0.03/conversation**: taken from sibling FEATURES.md research, not re-fetched here.
- **Token counts** (1.5k system, 3k chunks, 2k history, 400 answer; 40-turn interview shape; 40k-token PDF) are design assumptions, not measurements; verify with `count_tokens` once the prompt exists, remembering the 4.7+ tokenizer is ~30% denser.
- **Subscription utilization (60%)** and prepaid-credit breakage are industry-typical assumptions with no source.
- **Fixed cost ~$46/month** assumes Supabase Pro + one Vercel Pro seat + domain; Anthropic has no minimum.
