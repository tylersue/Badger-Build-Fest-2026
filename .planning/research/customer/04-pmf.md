# PMF Evidence, Timing, Market Sizing, Validation Plan, Pitch, and Kill Criteria

Research date: 2026-09-26. Method: direct fetches of primary pages plus Google News and Bing News RSS feeds (the session's web-search budget was exhausted after 12 queries, so some articles are cited by headline and date only).

Flags used throughout:
- **[unverified]** = claim seen only in secondary or self-reported sources
- **[headline only]** = article located but body not retrievable
- **[assumed]** = an input we chose; change it and the arithmetic changes

---

## 1. PMF evidence from adjacent products

| Product | Model | Hard numbers (date) | What it proves for us |
|---|---|---|---|
| **Delphi.ai** | Experts build a "digital mind"; hirers subscribe; expert pays $0 / $79 / $299 per month (1M / 5M training words) | $16M Series A led by Sequoia (Jess Lee), announced Jun 24 2025, with Menlo, Anthropic's Anthology Fund, Crossbeam, Lux and others. 2,000+ experts (Jun 2025). Matthew Hussey's mind: 2.5M+ questions answered, 1.2M+ voice minutes, 8M+ words ingested, "millions in recurring revenue" at $39/mo (implies 2,000+ subscribers). Sequoia podcast: voice users are 5x more retentive than text-only; Arnold Schwarzenegger's mind receives ~10,000 messages/week. Growth was word-of-mouth only. | Experts will let a clone answer for money, and hirers pay for a named person. But every cited winner already had an audience and millions of words of content. No 2026 metrics were found. |
| **Personify** (London) | Same shape; Free / $79/mo Pro / done-for-you | Launched Apr 21 2026. Career coach Lucy Gilmour: $8,800 revenue in 24 hours, 1,039 conversations in 9 days, 92 course students in week one; users in 94 countries. All self-reported in the launch press release **[unverified]**. | A second funded entrant within 12 months; the category is forming. Still audience-first. |
| **Coachvox** | Clone for coaches; $99/mo or $996/yr plus 10% of subscription revenue | "Hundreds" of coaches **[unverified]**; illustrative 50 subscribers × $100/mo = ~$4,272 net to the creator | Take-rate precedent: 10% plus a SaaS fee. |
| **BuddyPro** | White-label AI companion sold by the expert at $797–$3,497/yr; ~$300/user/yr AI cost; expert keeps 75–85% | Claims $5.5M+ cumulative recurring revenue, 26,451 clients, 36% trial-to-paid, 60% DAU (site, self-reported) **[unverified]** | Four-figure annual willingness to pay exists when the expert already has a following. |
| **JustAnswer** | Human experts answer paid questions since 2003 | 12,000 experts, 700 categories, 196 countries (about page). 16M+ questions answered **[unverified]**. Expert monthly averages: appraisals $8,457, tech $7,612, homework $6,200, wellness $1,167, general $614; $2–$20 per answer. Consumer price: $1–$5 join fee, then $28–$125/mo. FTC sued Jan 13 2026 under ROSCA for hidden subscriptions; Australia fined AU$10M Jul 2026; 9,000+ Trustpilot complaints. Revenue estimates $10–100M **[unverified]**. The "12M+ customers" figure was not found in any primary source **[unverified]**. | 22 years of proof that people pay strangers for expert answers, and that the incumbent's pricing is now a legal liability. Transparent per-message pricing is a wedge. |
| **Character.AI** | Consumer companion chat | 20M+ MAU (peak 28M mid-2024); ~75 min/day; ~$30M annualized revenue Jul 2025, projected $50M end-2025 (~$2 per MAU per year); 18M+ user-created bots; $2.7B Google deal Sep 2024; under-18 chat ban effective Nov 25 2025; wrongful-death suits settled Jan 7 2026; Pennsylvania AG sued May 5 2026 for bots posing as licensed doctors. | Huge engagement, tiny monetization, heavy liability. Entertainment personas are the wrong comp; verified experts are the counter-position. |
| **Poe (Quora)** | Creator monetization since Apr 2024; price-per-message (US creators only), cap $10,000 per 1,000 messages | "Over $100,000 paid out by mid-2026" (third-party) **[unverified]** | Per-message pricing is a shipped, accepted primitive. Total payouts are trivial. |
| **Intro.co** | 1:1 video calls with named experts | $79–$2,500 per session; Nikita Bier at $15,000 per 30 minutes (Business Insider, Aug 25 2026). Take rate undisclosed. | Named-person access commands 10–100x generic rates. |
| **Cameo** | Paid celebrity video shoutouts | $1B valuation 2021; 2024 cramdown of ~$28M at under $100M (The Information) **[headline only]**; three layoff rounds to 33 staff by Jul 2023; revenue reportedly down 80%+ from a $100M+ peak **[unverified]** | Novelty access without a repeat need collapses. Our repeat driver must be recurring problems, not curiosity. |
| **Substack** | Paid subscriptions to individuals | 5M paid subscriptions Mar 15 2025 (4M → 5M in ~4 months); no 6M announcement as of May 2026, suggesting deceleration. | Paying individuals for a named voice is mainstream; growth is not infinite. |
| **Kajabi** | Knowledge commerce | $10B cumulative creator revenue (Aug 6 2025); 100k+ creators; ~1,800 millionaires; the average six-figure earner has 1k–10k followers, ~4,000 emails, and only 309 paying customers. | "Small audience, real income" is the exact profile of our supply. |
| **Patreon** | Membership | $10B cumulative payouts (Axios, Aug 5 2025); podcasters earned $629M in 2025 (+33%); 20% layoffs Jul 2026; OpenAI hired co-founder Sam Yam to lead a Creator Product division (Sep 23–24 2026). | Category validated; OpenAI is now moving into creator monetization. |

### What investors said

Sequoia's partnering post (Jun 24 2025) argues that niche consumer behaviors go mainstream ("what starts as a niche can quickly become the new normal") and backs a "living Library of Alexandria" of verified minds. Jess Lee told Fast Company (Jun 24 2025): "This, today, I think, to a lot of consumers just seems weird. We need to cross the chasm and there need to be more people using them." The metrics Delphi and Sequoia cite publicly are the 2,000+ experts, Hussey's seven-figure run rate, and the 5x voice-retention lift. No aggregate GMV has been disclosed. On the Sequoia podcast, the founder listed four monetization paths: direct subscriptions, course and content licensing, brand licensing of verified identities, and search-as-a-service to find the right expert by topic.

### Press and surveys

- NYT: "'Talk to My A.I. Twin': Busy Executives Have a New Productivity Hack" (Aug 5 2026) **[headline only]**.
- 36Kr: "After replicating human faces, AI has begun to replicate the brains of experts" (Aug 26 2026) **[headline only]**.
- KTVU: Warriors' Moses Moody launches a Delphi digital mind (Mar 11 2026) **[headline only]**.
- No MIT Technology Review, WSJ, or Verge feature specifically on expert clones surfaced in the feeds.
- Pew (Feb 17–23 2026): 49% of US adults use AI chatbots (33% in 2024); 20% use them for medical advice; about a quarter use one daily.
- KFF (Feb 24–Mar 2 2026): 32% of adults have used chatbots for health advice; 69% of those users trust the answers; 58% then consulted a doctor; 41% uploaded personal medical records despite 77% citing privacy worries.
- **Gap:** no survey exists on consumer interest in "an AI version of a named professional." Run one in week 1 (see Section 4).

---

## 2. Tailwinds and timing (why now)

| Tailwind | Evidence | Date |
|---|---|---|
| General assistants are exiting tailored advice | OpenAI's usage policy prohibits "provision of tailored advice that requires a license, such as legal or medical advice, without appropriate involvement by a licensed professional" (quoted via Legal IT Insider and Baker Donelson; openai.com was not fetchable). OpenAI clarified this is a liability measure, not a functional ban (The Verge, Nov 3 2025). Bloomberg Law (Nov 17 2025): "ChatGPT Terms Act as Liability Shield." | Effective Oct 29 2025 |
| Custom GPTs are being retired | Enterprise: no new GPTs after Sep 25 2026; existing ones stop working Dec 11 2026; "other plans may follow the same transition timeline" (PCWorld, Sep 18 2026; Florida Realtors, Sep 24 2026). Replacements are ChatGPT Projects and Plugins/Skills, neither of which pays creators. | Dec 11 2026 |
| The GPT Store never became a creator economy | TechCrunch (Jan 10 2024): a US builder revenue program based on "user engagement" was promised for Q1 2024. VentureBeat: "GPT Store launches without revenue share." WIRED (Oct 11 2024): "OpenAI's GPT Store Has Left Some Developers in the Lurch." No evidence of a broad payout program was found. | 2024–2026 |
| Documented accuracy failures | BMJ Open (Apr 15 2026): 50% of health answers from ChatGPT, Gemini, Grok, Meta AI, and DeepSeek were problematic (30% somewhat, 20% highly). FT (Apr 13 2026): chatbots misdiagnose over 80% of early cases **[headline only]**. Saturn study (Sep 14 2026): 18 models, 10,000+ answers, 57% wrong on standard financial questions, 88% on complex ones; the best model (Claude Opus 5 reasoning) was still 39% wrong; free models 63% wrong vs paid 49%; PensionBee survey: ~60% would follow the answer without verifying. Stanford RegLab (Jan 2024): 69–88% legal hallucination rates. Nature (Apr 29 2026): training models for warmth raises sycophancy and lowers accuracy. A Florida man sued OpenAI Jul 22 2026 over medical advice that allegedly delayed treatment of a pulmonary embolism (CBS). | 2024–2026 |
| Per-expert context is now cheap | Anthropic pricing (fetched today): Sonnet 5 $2/$10 per MTok in/out, Haiku 4.5 $1/$5, cache reads 0.1x base, full 1M-token context at standard pricing on Claude 4.6+. Gemini 2.5 Flash $0.30/$2.50. Worked example: a 200k-token expert corpus served from cache costs 200k × $0.20/MTok = $0.04 plus ~$0.004 of output per message on Sonnet 5; a RAG design retrieving 6k tokens on Haiku 4.5 costs under $0.01. Pricing at $0.10–$0.25 per message leaves 75–90% gross margin. | 2026 |
| Verified, consented replicas become the lawful path | NO FAKES Act (Nurture Originals, Foster Art, and Keep Entertainment Safe): introduced Jul 2024, reintroduced Apr 2025 (S.1367) and again May 2026 with library and research protections; cleared Senate Judiciary unanimously Jun 18 2026. Creates a federal right over digital replicas with a licensing framework and $5k–$750k statutory damages; backed by OpenAI, Google, Disney, SAG-AFTRA; opposed by EFF. FTC finalized the Government and Business Impersonation Rule (Feb 2024) and proposed extending it to individuals and to AI platforms that "know or have reason to know" they enable impersonation; imposter-scam losses were $2.95B in 2024 of $12.5B total fraud. Status of the individual extension: not confirmed **[unverified]**. | 2024–2026 |
| States are moving on fake professionals | Illinois HB 1806 (Wellness and Oversight for Psychological Resources Act) signed ~Aug 5 2025, the first ban on AI therapy. New York SB 7263 (introduced Apr 2025, advanced by the Senate by Mar 2026) bars chatbot operators from substantive responses that constitute unauthorized practice of a licensed profession or law, requires AI disclosure, and adds a private right of action with attorneys' fees. Pennsylvania AG sued Character.AI May 5 2026 for bots holding themselves out as licensed doctors; a bipartisan PA bill against chatbots posing as licensed professionals was introduced Sep 24 2026 (bill number not found). Nevada and Utah laws referenced by CNN (Aug 27 2025) **[headline only]**. Bloomberg Law (Aug 3 2026): "AI Therapy Chatbots Spur States to Act." | 2025–2026 |
| The incumbent is under fire | FTC v. JustAnswer (Jan 13 2026): advertised $1–$5 access, then $28–$125/mo auto-renewal without consent; civil penalties and refunds sought against the company and CEO. Australia fined JustAnswer AU$10M (Jul 2026). | 2026 |

Double-edged: OpenAI's new creator division built around Patreon's founders (Sep 2026) validates the category and is also the largest platform threat (see Section 6).

---

## 3. Market sizing

### Supply-side bottom-up (US)

Occupation counts are BLS Occupational Outlook Handbook, 2025 data, unless noted.

| Segment | Count | Source |
|---|---|---|
| Lawyers | 863,700 | BLS OOH |
| Accountants and auditors | 1,595,200 | BLS OOH |
| Personal financial advisors | 299,400 | BLS OOH |
| Physical therapists | 283,700 | BLS OOH |
| Dietitians and nutritionists | 86,300 | BLS OOH |
| School and career counselors and advisors | 389,500 | BLS OOH |
| Mental-health and substance-abuse counselors | 533,400 | BLS OOH |
| Non-credentialed tax preparers (886,338 PTIN holders minus 209,076 CPAs, 71,966 EAs, 26,256 attorneys) | ~579,000 | IRS, as of Sep 1 2026 |
| US coaches (ICF: 122,974 practitioners worldwide, $5.34B revenue, ~$43k each; ~35% North America) | ~40,000 | ICF 2025; regional share **[assumed]** |
| **Advice-giving pool** | **~4.7M** | |

Arithmetic and assumptions:

| Step | Value | Basis |
|---|---|---|
| Independent share | 20% **[assumed]** | BLS says "most" personal financial advisors are self-employed or in finance; MBO Partners counts 72.9M US independents overall, 5.6M earning $100k+. 20% is a conservative blend across salaried counselors and solo practitioners. |
| Independent advice professionals | ~0.93M | 4.7M × 20% |
| GMV per active agent per month | $200 **[assumed]** | JustAnswer "general" experts average $614/mo with humans answering; Coachvox's example is $5,000/mo at 50 subscribers; a no-audience expert will start much lower. |
| **Supply TAM** | **~$2.2B GMV/yr** | 0.93M × $200 × 12; ~$670M platform revenue at a 30% take |
| **SAM** | **~$55M GMV/yr** | Low-liability domains (career and college counseling, nutrition, coaching, informational tax) ≈ 25% of the pool; 10% adoption in five years = ~23k experts × $200 × 12; ~$17M revenue |
| **SOM** (three years, one beachhead) | **~$1.8M GMV/yr** | 1,000 experts × $150 × 12; ~$540k revenue |

### Demand-side check (the binding constraint)

| Step | Value | Basis |
|---|---|---|
| US adults | ~262M | Census **[not fetched]** |
| Use AI chatbots | ~128M | Pew 49% |
| Use chatbots for medical advice | ~52M | Pew 20% of adults |
| Have one money/health/legal/school question a year worth paying a named expert for | ~26M | 10% of adults **[assumed]** |
| Convert to paying | 1.3M | 5% **[assumed]** |
| ARPU | $8/mo | Character.AI $9.99; Hussey $39; JustAnswer $28–$125; Poe per-message |
| **Demand-side TAM** | **~$125M GMV/yr** | 1.3M × $96 |

The supply-side TAM of $2.2B would require ~23M monthly payers, roughly 9% of US adults, which no analog has reached. JustAnswer's estimated revenue after 22 years is at most ~$100M **[unverified]**. Present TAM as **$0.1–$2.2B GMV with a ~$0.5B central case**, and say plainly that supply is abundant and demand is what must be proven. Upside beyond cents-per-message: "book the human" referral fees, and B2B licensing of agents to firms, schools, and clinics.

### Top-down context (treat with skepticism)

| Figure | Source | Caveat |
|---|---|---|
| Creator economy $250B (2023) → $480B by 2027 | Goldman Sachs, Apr 2023 (site 403; via coverage) | Nearly half of creators earn under $10k; the total is dominated by ad-supported video |
| Coaching profession $5.34B, 122,974 practitioners | ICF 2025 Global Coaching Study | Credible; membership-driven survey |
| Life coaching $5.79B by 2030; health coaching $32.3B by 2033 | Press-release research houses (Nov 2025, Mar 2026) | Low quality; do not lead with these |
| AI agents $7.84B (2025) → $52.62B (2030), 46.3% CAGR | MarketsandMarkets, Apr 2025 | Almost entirely enterprise automation; irrelevant to consumer demand |
| Kajabi $10B and Patreon $10B cumulative payouts | Aug 2025 | Cumulative over a decade-plus; useful for "people pay individuals," not for sizing |

---

## 4. How to validate before and during the MVP

Four people, four weeks:

| Week | Activity | Output |
|---|---|---|
| 1 | 15 expert and 15 hirer interviews; fake-door pages live; 5-question consumer survey on "AI version of a named professional" | Interview notes, waitlist counts, survey baseline |
| 2 | Concierge test (humans answer as the agent, real money) | Paid conversion, return rate, message depth |
| 3 | Alpha with five experts on the real product; Sean Ellis survey after second session | Activation, citation and refusal accuracy |
| 4 | Metrics roll-up, two LOIs, pitch rehearsal | Traction slide |

### Expert interview script (Mom Test: past behavior, no pitching)

1. Walk me through the last time someone asked you a question outside a paid engagement. What did you do?
2. How many of those do you get in a normal week, and through which channel?
3. What did your last new client pay, and how did they find you?
4. Tell me about the last request you ignored or declined because it wasn't worth your time.
5. What have you already tried for repeat questions (FAQ, templates, a blog, ChatGPT)? What happened?
6. What was the last thing you paid for to get clients or save time, and how much?
7. Which questions do you refuse to answer without a formal engagement, and why?
8. If a client acted on a wrong answer given under your name, what would happen to you?
9. Have you recorded yourself explaining your method (video, podcast, slides)? Who owns it?
10. Who else do you know who deals with this?

Close with a commitment, not an opinion: "Can I book 45 minutes next week to interview you on camera?"

### Hirer interview script

1. Tell me about the last time you had a tax, rehab, or essay question you couldn't answer yourself. What did you do first?
2. What did you type into Google or ChatGPT, and what came back?
3. Did you pay anyone? How much, and how did you decide?
4. What made you doubt the free answer?
5. Have you ever paid a subscription for advice (JustAnswer, a coach, Substack)? What happened next?
6. How did you find the person you finally trusted?
7. How long between the question and an answer you acted on?
8. What documents did you need someone to look at?
9. The last time you paid for advice online, what happened right after you paid?
10. Who else do you know who had this problem recently?

### Fake-door and waitlist test

Two pages per beachhead. Expert side: "Your expertise, answering while you sleep." Hirer side: "Ask [Name]'s AI. Cited. Cents per answer." Drive 300–500 visitors to each via campus lists, subreddits, LinkedIn, and $100–200 of ads.

| Signal | Threshold | Basis |
|---|---|---|
| Email sign-up rate | Under 3% weak; 5–10% real; over 10% strong | Unbounce cross-industry median landing conversion 6.6% (2024); industry range 3.8–12.3% |
| Second action (book an interview, reserve with $1) | 2%+ of visitors strong | Commitment beats opinion |
| Expert side | 10+ booked interviews per 100 sign-ups | Interview willingness is the supply gate |

### Concierge test

Three experts answer as "the agent" over WhatsApp or Telegram, citing their own notes, at $0.50 per message or $5 for 10 via a payment link. Ten hirers per expert for seven days. Thresholds: 30%+ of trial hirers pay; 25%+ return within seven days; refund rate under 5%; median 6+ messages per paid session. Also log every question the expert could not answer from their own knowledge, since that is the refusal set and the next-interview agenda.

### Sean Ellis test

After a hirer's second session: "How would you feel if you could no longer use this?" 40%+ "very disappointed" indicates fit. Superhuman started at 22%, reached 32% by segmenting to the users who loved it, then 58% within three quarters (First Round Review). Collect 40+ responses; segment by beachhead and by expert.

### Marketplace-specific validation

- Lenny Rachitsky's study of 17 marketplaces: 14 of 17 went supply-first because supply was harder and suppliers brought their own demand (Thumbtack: "all that matters is supply"). Top supply levers: direct sales (~60% of companies) and referrals (~33%). Top demand levers: word of mouth (Airbnb over 50% of guests, TaskRabbit 90%+ of customers) and supply-driven demand (Patreon creators marketed to their own followers). Winners used only 2–3 levers and constrained to one city or category; paid marketing rarely worked early.
- Andrew Chen's Cold Start Problem (book, not fetched): find the smallest atomic network that is self-sustaining, and give the hard side a single-player reason to show up. For us: five experts in one niche and 50 hirers in one campus community, plus an interview that produces a shareable expert FAQ the expert wants even with zero marketplace demand.
- Our twist on supply-first: our experts have no audience, so supply does not bring demand. The demand plan must be word of mouth inside one community plus SEO on the long-tail questions the agents already answer.

### MVP metric thresholds

| Metric | Week-4 target | Benchmark |
|---|---|---|
| Expert activation (interview started → agent published) | ≥60% | Median activation 25%, SaaS 30% (Lenny survey) |
| Hirer activation (opens chat → first paid message) | ≥15% | Marketplaces have the lowest activation rates; first transaction defines it |
| Trial-to-paid | ≥20% | BuddyPro claims 36% **[self-reported]** |
| Hirer 7-day return | ≥25% | Consumer transactional 6-month retention: 30% good, 50% great (Lenny) |
| Expert 30-day retention (adds content or reviews flagged answers) | ≥50% | None public |
| Messages per paid session | ≥6 | Hussey voice sessions run hours; voice users 5x retention (Delphi) |
| Citation coverage / correct out-of-scope refusal | ≥90% / ≥90% on a 50-question eval | BMJ Open baseline: 50% of generic answers problematic |
| Refunds or disputes | <5% | JustAnswer's complaint volume is the cautionary tale |

---

## 5. Pitch narrative (four-minute demo)

**Problem, one stat.** "AI gets financial questions wrong 57% of the time, and 60% of people follow the answer anyway" (Saturn and PensionBee, Sep 2026). Half of Americans now ask chatbots about their health and money (Pew, KFF).

**Why now.** Oct 29 2025: OpenAI bars tailored licensed advice. Dec 11 2026: custom GPTs die, and the GPT Store never paid anyone. A million-token context and $0.20-per-million cache reads make a per-expert brain cost about four cents a message. Jun 18 2026: NO FAKES clears Senate Judiciary, so verified self-clones become the legal path and unlicensed clones become liabilities. Delphi ($16M from Sequoia) and Personify (Apr 2026) proved experts with audiences will do this; the 99% without an audience have nowhere to go.

**Wedge.** Recommend college essay and career counselors first: no license risk, campus demand within reach, a document to upload, and a clear scope for refusals. Second beachhead: enrolled agents for tax questions, an IRS-verifiable credential with seasonal demand and documents.

**Demo beats.**
1. A five-minute interview clip becomes a published agent with a visible knowledge map.
2. A hirer asks a question and gets an answer with a citation to the expert's own words.
3. The hirer uploads an essay and gets specific feedback tied to the counselor's framework.
4. An out-of-scope question triggers a refusal and a "book the human" handoff.
5. Expert dashboard: credits earned and the unanswered-question list that seeds the next interview.

**Business model, one sentence.** Hirers pay cents per message, experts keep 70%, and we keep 30% plus the data on what people actually ask.

**Traction slide (credible in four weeks).** Experts interviewed and published; paid conversations and pledged or concierge revenue; Sean Ellis score; citation and refusal accuracy on the eval set; waitlist conversion rates; two LOIs from a counseling office or tax practice.

**Ask.** The build-fest prize, ten introductions to counselors and enrolled agents, and a small pre-seed to run a tax-season pilot in early 2027.

**Three alternative one-liners.**
- Cameo for expertise: pay a named expert's AI cents a question, with receipts.
- Every expert gets a clone; every clone cites its sources and admits what it doesn't know.
- JustAnswer without the subscription trap, ChatGPT without the guessing.

**Strongest judge objection.** "Why doesn't OpenAI do this, now that it has Patreon's founders?" Answer: OpenAI is retreating from tailored licensed advice by policy and retiring the very product that would host this. Its creator push follows Patreon's playbook, which needs an existing audience. Our supply is people with expertise and no audience, our product is refusal plus citation under a verified name, and our data asset is the map of unanswered questions per domain.

---

## 6. Counter-evidence and kill criteria

| Risk | Evidence against us | Kill signal | Early positive signal |
|---|---|---|---|
| Experts won't invest the time | Delphi's winners ingested 8M words; Personify trains on existing content; interview-only supply may be thin | Under 30% of interested experts finish a 45-minute interview, or interview-only agents can't answer half of real questions | Experts referring other experts unprompted; experts asking to add material |
| Hirers won't pay after free ChatGPT | Character.AI earns ~$2 per MAU per year; Poe has paid out ~$100k total; the GPT Store paid nothing | Concierge trial-to-paid under 10%; 7-day return under 15% | Follow-up questions in the same session; unsolicited requests for new domains |
| Regulated domains | Illinois HB 1806, NY SB 7263, the PA suit and bill; OpenAI's own policy signals model vendors may restrict use | No licensed professional will accept liability for their agent's answers even with review tools | A licensed expert asks for a review queue rather than declining |
| Accuracy and sycophancy | BMJ Open 50% problematic; Nature on warmth lowering accuracy; RAG over interviews still hallucinates | Citation grounding under 85%, or experts reject over 20% of sampled answers | Refusals that convert into "book the human" bookings |
| Novelty decay (Cameo) | Cameo lost 80%+ of revenue when repeat purchase never appeared | No hirer uses the product twice in the four weeks | Hirers returning with a second problem |
| Platform and competitor risk | OpenAI creator division (Sep 2026); Delphi and Personify free tiers | A platform launches per-message paid clones with verification before we reach 100 experts | Experts who tried Delphi or Personify choose us for the interview and refusal features |
| Two-sided cold start | Our experts have no audience, so demand acquisition is on us; paid marketing rarely worked early for the 17 marketplaces studied | Cost to acquire a paying hirer exceeds 12 months of their ARPU | Word-of-mouth share of new hirers above 30% |

---

## Sources

Adjacent products
- Delphi Series A: https://www.delphi.ai/blog/delphi-raises-16m-series-a-from-sequoia
- Sequoia partnering post: https://sequoiacap.com/article/partnering-with-delphi-meet-your-heroes
- Sequoia Training Data podcast with Dara Ladjevardian: https://sequoiacap.com/podcast/training-data-dara-ladjevardian
- Delphi Hussey case study: https://www.delphi.ai/blog/how-matthew-hussey-scaled-his-expertise
- Delphi pricing: https://www.delphi.ai/pricing
- Fast Company on Delphi (Jess Lee quote; body not fetchable): https://www.fastcompany.com/91356476/delphi-ai-digital-mind
- Personify launch release: https://natlawreview.com/press-releases/personify-launches-platform-lets-professionals-clone-themselves-ai
- Coachvox pricing: https://davidriha.com/blog/coachvox-ai-pricing-2026-revenue-share/
- BuddyPro: https://buddypro.ai/
- JustAnswer about: https://www.justanswer.com/info/about
- JustAnswer expert pay: https://sidehusl.com/justanswer/
- FTC v. JustAnswer: https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription
- JustAnswer / Pearl.com background: https://en.wikipedia.org/wiki/JustAnswer
- Character.AI stats: https://sqmagazine.co.uk/character-ai-statistics/ and https://www.demandsage.com/character-ai-statistics/
- Poe price-per-message (403 on fetch; via search): https://poe.com/blog/new-on-poe-creator-monetization-via-price-per-message
- Intro.co: https://intro.co/
- Cameo: https://en.wikipedia.org/wiki/Cameo_(website) and https://www.theinformation.com/articles/cameo-valuation-plunges-at-least-90-in-cramdown-funding-round
- Substack 5M: https://cdaley.substack.com/p/substack-hits-5-million-paid-subscriptions and https://simonowens.substack.com/p/is-substacks-subscription-growth
- Kajabi $10B: https://finance.yahoo.com/news/10b-creator-revenue-climbing-kajabi-130000846.html
- Patreon: https://en.wikipedia.org/wiki/Patreon; Axios "Patreon crosses $10 billion creator payout milestone" (Aug 5 2025, headline); Variety "Podcasters Earned $629 Million in 2025" (Apr 8 2026, headline)
- OpenAI hires Patreon founders: the-decoder.com (Sep 23 2026) and PYMNTS (Sep 24 2026), headlines

Tailwinds
- Custom GPT retirement: https://www.pcworld.com/article/3238025/custom-gpts-in-chatgpt-are-going-away-heres-how-to-save-yours.html and https://www.floridarealtors.org/news-media/news-articles/2026/09/custom-gpt-users-face-december-deadline
- GPT Store revenue promise: https://techcrunch.com/2024/01/10/openai-launches-a-store-for-custom-ai-powered-chatbots/; WIRED Oct 11 2024 (not fetchable); VentureBeat Jan 10 2024 (headline)
- OpenAI policy wording: https://legaltechnology.com/2025/11/03/openai-changes-chatgpts-usage-policy-to-preclude-legal-advice/ and https://www.bakerdonelson.com/openai-updates-usage-policies-key-considerations-and-next-steps-for-organizations-deploying-ai
- BMJ Open chatbot study: https://bmjgroup.com/substantial-amount-of-medical-information-provided-by-popular-chatbots-inaccurate/
- Saturn financial-advice study: https://ifamagazine.com/chatgpt-and-claude-get-financial-advice-wrong-57-of-the-time/
- Stanford RegLab legal hallucinations: https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive
- OpenAI medical-advice lawsuit: https://www.cbsnews.com/news/chatgpt-dangerous-medical-advice-openai-lawsuit/
- KFF poll: https://www.kff.org/health-information-and-trust/kff-tracking-poll-on-health-information-and-trust-use-of-ai-for-health-information-and-advice/
- Pew Americans and AI 2026: https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026/
- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- NO FAKES Act: https://en.wikipedia.org/wiki/NO_FAKES_Act; Rep. Salazar release on Senate Judiciary passage (Jun 22 2026, headline)
- FTC impersonation rule: https://www.ftc.gov/news-events/news/press-releases/2024/02/ftc-proposes-new-protections-combat-ai-impersonation-individuals
- FTC 2024 fraud data: https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024
- New York SB 7263: https://www.hklaw.com/en/insights/publications/2026/03/new-york-bill-would-create-liability-for-chatbot-proprietors; Reuters "Proposed New York law would bar AI chatbots from posing as lawyers" (Mar 5 2026, headline)
- Illinois HB 1806: Holland & Knight "New Illinois Law Restricts Use of AI in Mental Health Therapy" (Aug 26 2025, headline)
- Pennsylvania: https://www.abc27.com/pennsylvania/proposed-bipartisan-legislation-cracks-down-on-ai-chatbots-claiming-to-be-licensed-professionals/ (403); Canadian Press "Pennsylvania sues AI company, saying its chatbots illegally hold themselves out as licensed doctors" (May 5 2026, headline)

Market sizing
- BLS OOH 2025: https://www.bls.gov/ooh/legal/lawyers.htm; https://www.bls.gov/ooh/business-and-financial/accountants-and-auditors.htm; https://www.bls.gov/ooh/business-and-financial/personal-financial-advisors.htm; https://www.bls.gov/ooh/healthcare/physical-therapists.htm; https://www.bls.gov/ooh/healthcare/dietitians-and-nutritionists.htm; https://www.bls.gov/ooh/community-and-social-service/school-and-career-counselors.htm; https://www.bls.gov/ooh/community-and-social-service/substance-abuse-behavioral-disorder-and-mental-health-counselors.htm
- IRS PTIN statistics: https://www.irs.gov/tax-professionals/return-preparer-office-federal-tax-return-preparer-statistics
- ICF 2025 Global Coaching Study: https://coachingfederation.org/research/global-coaching-study
- MBO Partners State of Independence 2025: https://www.mbopartners.com/state-of-independence/
- Goldman Sachs creator economy (403; via coverage): https://www.goldmansachs.com/insights/articles/the-creator-economy-could-approach-half-a-trillion-dollars-by-2027
- AI agents market: https://www.marketsandmarkets.com/Market-Reports/ai-agents-market-15761548.html

Validation
- Lenny Rachitsky marketplace series: https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace (part 1); https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-9ee (supply vs demand); https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-911 (supply tactics); https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace-2e5 (demand tactics)
- Activation benchmarks: https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate
- Retention benchmarks: https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29
- Sean Ellis test via Superhuman: https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/
- Landing-page benchmarks: https://unbounce.com/conversion-benchmark-report/
- Andrew Chen, The Cold Start Problem (Harper Business, 2021); andrewchen.com returned 403
- Rob Fitzpatrick, The Mom Test (2013); not fetched
