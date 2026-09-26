# Demand side: who hires a named expert's AI agent, and what they will pay

Research date: 2026-09-26. Sources are 2025–2026 primary disclosures and surveys where available. Items marked **[unverified]** could not be confirmed from a primary source in this session (the shared web-search budget was exhausted mid-task; the rest was gathered by direct page fetch).

## Headline findings

- **Paid expert Q&A is a real, large, and angry market.** JustAnswer runs 12K experts across 700 categories in 196 countries, charges $28–$125/month after a $1–$5 "join" fee, and was sued by the FTC in January 2026 for exactly that funnel. Demand exists; the incumbent's trust is broken.
- **Asking AI for professional advice is now mainstream.** 49% of US adults use chatbots (Pew, Feb 2026); 34% use them for health (Pew, Aug 2026); 26% for personal finance (NerdWallet/Harris, June 2026); ~26% used AI for 2025 tax filing (Adobe). ChatGPT alone sees 200M weekly health askers.
- **Trust in the generic chatbot is low and stuck.** Only 18% of chatbot health users rate the answers highly accurate vs. 65% for their own provider (Pew). 30% have confidence in AI for money vs. 80% for a human adviser (Gallup). Accuracy studies put chatbot error rates at 43–57% on money and health questions.
- **The product's two design choices map onto measured trust levers.** Citations raise trust (even fake ones, which is the risk). Expert attribution raises rated quality of identical advice (d≈0.42). Both are experimentally documented in 2025–2026.
- **The Oct 29, 2025 OpenAI policy carve-out ("without appropriate involvement by a licensed professional") is a tailwind.** A named, consenting professional whose material is the corpus is the compliant shape.

---

## 1. Who already pays for expert answers online, and how much

| Platform | Model | Price | Scale / notes | Source |
|---|---|---|---|---|
| JustAnswer | $1–$5 join fee → auto-enrolled monthly membership | $28–$125/mo by category ($65/mo typical in late 2025; $5 join, $25 for tutors) | 12K experts, 700 categories, 196 countries; ~8,500–9,500 questions/day **[secondary]**; experts keep 20–50% of fee; median reply ~3 min. FTC suit filed Jan 13, 2026 (ROSCA); 8,000+ BBB complaints in 3 yrs; 9K+ Trustpilot fraud reports (US). Historical pay-per-question price for legal: $30–$40 (2012). | [FTC](https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription), [JustAnswer About](https://www.justanswer.com/about), [Wallet Hacks](https://wallethacks.com/justanswer-review/), [Clark](https://clark.com/education/justanswer-review/), [Wikipedia](https://en.wikipedia.org/wiki/Pearl.com) |
| Intro.co | Per-session video calls with named experts | $100–$2,000/hr; $35–$500 per 15 min; 30% platform commission | Complaint: "every follow-up bills again" | [GrowthMentor](https://www.growthmentor.com/blog/intro-co-alternatives) |
| Clarity.fm | Per-minute phone calls | $2–$30/min (commonly $5–$8); 15% platform fee | 14K+ experts | [MentorCruise](https://mentorcruise.com/blog/clarityfm-review-and-alternative/) |
| Rocket Lawyer | Legal membership incl. "Ask an Attorney" | $34.99/mo or $149/yr (12 questions) up to $64.99/mo (unlimited); 30-min legal session add-on $149 | Claims 30M+ customers served | [Rocket Lawyer](https://www.rocketlawyer.com/pricing) |
| TurboTax Live | Software + expert help or full service | Assisted $39–$159 federal; Full Service from $89–$129+ | FY2026: TurboTax revenue $5.3B; **Live revenue +37%, now 53% of TurboTax revenue**; 39.0M US units | [Intuit Q4 FY26](https://investors.intuit.com/news-events/press-releases/detail/1320/intuit-reports-fourth-quarter-and-full-year-fiscal-2026-results-sets-fiscal-2027-guidance), [SmartAsset](https://smartasset.com/taxes/turbo-tax-review) |
| Sesame | Cash-pay telehealth | Visits from $34; Sesame Plus membership (price not shown) | 10K+ providers, 1M+ patients | [Sesame](https://sesamecare.com/) |
| Facet | Flat-fee CFP planning | $2,400 / $5,000 / $7,900 per year | 1–4 meetings/yr | [Facet](https://facet.com/pricing/) |
| Betterment Premium | Advisor access on AUM | 0.65%/yr, $100K minimum | | [Betterment](https://www.betterment.com/pricing) |
| Delphi (AI clones) | Creator-pays SaaS | Free / $79 / $299 per month for the expert; audience pricing not published | Lessig, Mark Hyman as showcase minds | [Delphi](https://www.delphi.ai/pricing) |
| Substack | Subscriptions to individual writers | $5/mo minimum; 10% platform cut | 5M paid subscriptions (Mar 2025); 50K earning creators | [Wikipedia](https://en.wikipedia.org/wiki/Substack) |
| Cameo | Per-video from named people | Valuation $1B (2021) → ~$50M (2023); staff 400 → 33 | Personality-priced marketplaces decay fast | [Wikipedia](https://en.wikipedia.org/wiki/Cameo_(website)) |
| Wisdom (audio expert Q&A) | Now redirects to Noom Vibe | Pivoted away from expert Q&A | | [wisdom.audio → noomvibe.com](https://noomvibe.com/) |

Not retrievable this session **[unverified]**: JustAnswer revenue and total users (private company, no disclosure found); questions per JustAnswer member; K Health and HealthTap consumer prices; LegalZoom legal-plan price; IvyWise/Crimson package prices (both sites hide pricing; industry reporting typically puts packages at $4K–$20K+ and hourly at ~$200–$400); Upwork/Fiverr consultation volumes.

**Human-professional price anchors** (for the "$200/hour" comparison): general lawyers $100–$350/hr, Big Law $450–$1,200/hr ([ContractsCounsel](https://www.contractscounsel.com/b/how-much-does-a-lawyer-cost)); Rocket Lawyer 30-min session $149; Facet ≥$200/month equivalent; Sesame urgent visit $34+. Tax-preparer average fee (~$250–$350 per 1040 with state), cash-pay PT visit (~$75–$150), and financial-planner hourly (~$200–$400) are **[unverified]** recollections of NATP/NSA and industry surveys.

---

## 2. Who already asks AI for expert advice, and what goes wrong

### 2a. Usage (US unless noted)

| Domain | Share | Detail | Source |
|---|---|---|---|
| Any chatbot | 49% of adults; 24% daily | ChatGPT 44%, Gemini 24%; "information searching" 42%, medical advice 20%, diet/fitness 20% | [Pew Feb 2026](https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/) |
| Health | 34% of adults | Symptoms 25%, treatments 22%, understanding a diagnosis 22%, lab results 20%, deciding whether to see a doctor 15%; 44% of under-30s; 47% find it very helpful | [Pew Aug 2026](https://www.pewresearch.org/science/2026/08/25/from-diagnoses-to-treatments-why-americans-use-ai-chatbots-for-health/) |
| Health | 32% in past year | 65% cite speed; 19% can't afford care; **41% of users uploaded personal medical records**; 42% of physical-health askers never followed up with a doctor | [KFF Mar 2026](https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/) |
| Health | 25% (~66M adults) | 59% use it before a visit, 56% after; **14% skipped a visit because of AI; 11% got an unsafe recommendation** | [Gallup/West Health](https://news.gallup.com/poll/707789/americans-turning-supplement-healthcare-visits.aspx) |
| Health (ChatGPT) | 200M weekly, 40M daily | >5% of all messages; 7 in 10 outside clinic hours; 580K weekly from "hospital deserts"; 2M/wk on insurance | [OpenAI via Gizmodo](https://gizmodo.com/more-than-40-million-people-use-chatgpt-daily-for-healthcare-advice-openai-claims-2000705509) |
| Finance | 26% | 49% asked in past week; 22% cite affordability vs. humans, 28% "non-judgmental", 12% embarrassed to ask a person; **20% acted without verifying** | [NerdWallet/Harris](https://www.nerdwallet.com/finance/studies/using-ai-for-personal-finances) |
| Finance | 20% of advice-seekers | Gen Z/millennials 25%, boomers 7%; 73% rely on own internet research; only a third use a pro | [Gallup/Edward Jones](https://fortune.com/2026/08/08/financial-advisers-trust-ai-usage-gap-gallup/) |
| Tax | 26% used AI to file 2025 returns (up from 11%) | Adobe poll; separate IPX1031 poll: 1 in 5 plan to use AI, ~46–50% trust it | [CBS](https://www.cbsnews.com/news/can-you-use-ai-for-taxes-chatgpt-claude-irs/), [Spectrum](https://spectrumlocalnews.com/us/snplus/technology/2026/03/27/ai-chatbots-tax-preparation) |
| Tax (Claude) | 8× spike | Tax queries on Claude.ai are 8× the daily average around April 15 | [Anthropic Economic Index](https://www.anthropic.com/research/economic-index-june-2026-report) |
| Legal/finance/health (UK) | 12% / 17% / 19% "always or often rely" | 51% use AI for search; only 34% think it draws on authoritative sources | [Which?](https://www.which.co.uk/policy-and-insight/article/chatgpt-and-gemini-among-ai-tools-giving-risky-consumer-advice-which-finds-aBnBP0l2CE0T) |
| Schoolwork (teens) | 26% (2024, up from 13%) | 54% say OK for research, 18% for essays | [Pew](https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/) |
| ChatGPT overall | 700M WAU, 18B msgs/wk (Jul 2025) | Practical Guidance 29%, Seeking Info 24%, Writing 24%; **49% of messages are "Asking" (advice to inform a decision)**; non-work >70%; how-to advice 8.5%, tutoring 10.2% | [NBER w34255](https://www.nber.org/papers/w34255) |

US legal and career/job-search AI usage rates were not found in a primary source this session **[unverified]**.

### 2b. What goes wrong

| Study | Result | Source |
|---|---|---|
| Saturn "Artificial Authority" (18 models, 121 money questions, 10K responses) | **43% accurate on average; 88% failure on hard multi-step tax/rules questions**; free tiers fail 63%, paid 49%; best model 61% pass | [InvestmentNews](https://www.investmentnews.com/fintech/ai-chatbots-give-wrong-financial-answers-most-of-the-time-study-finds/268267) |
| BMJ Open 2026 (5 chatbots, 50 adversarial health prompts) | 50% problematic (20% highly); every bot fabricated references; median reference completeness 40%; answers "with confidence and certainty, few caveats" | [BMJ Group](https://bmjgroup.com/substantial-amount-of-medical-information-provided-by-popular-chatbots-inaccurate-and-incomplete/) |
| npj Digital Medicine 2026 (222 patient questions, 888 responses) | Problematic 21.6% (Claude) to 43.2% (Llama); unsafe 5–13% | [npj Digit Med](https://www.nature.com/articles/s41746-026-02428-5) |
| JAMA Netw Open 2025 (29 Merck vignettes) | Models drew premature conclusions under limited data, wrong ~80% at early stages **[as reported in press]** | [Medical Xpress](https://medicalxpress.com/news/2026-04-popular-ai-chatbots-confidently-medical.html) |
| Stanford RegLab legal | Hallucination 69–88% on legal queries; worst for lower courts and local law | [Stanford HAI](https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive) |
| Which? UK | ChatGPT 64/100, Perplexity 71/100; wrong ISA limit, wrong travel-insurance rule, cited stale Reddit threads | Which? (above) |
| Real-world harm | Winters v. OpenAI (Jul 2026): ChatGPT told user dizziness was "not dangerous"; pulmonary embolism followed. Seven other suits filed days after the Oct 2025 policy change | [Yahoo](https://tech.yahoo.com/ai/article/openai-sued-over-extremely-dangerous-medical-recommendations-provided-by-chatgpt-190158820.html), [Hooper Lundy](https://hooperlundy.com/openai-restricts-use-of-chatgpt-for-medical-advice/) |

### 2c. Trust: AI vs. a named human, and what moves it

| Finding | Number | Source |
|---|---|---|
| Health info rated "highly accurate" | Provider 65%, health websites 48%, **AI chatbot 18%**, social media 7%; chatbot rated convenient 48%, personalized only 23% | [Pew Oct 2025](https://www.pewresearch.org/science/2026/04/07/users-of-social-media-and-ai-chatbots-for-health-information-are-more-likely-to-say-they-are-convenient-than-accurate/) |
| Confidence in AI for money vs. human adviser | 30% vs. 80%; only 3% "a great deal" | Gallup/Edward Jones (above) |
| Trust chatbots for reliable health info | 29% of adults; 63% not confident in accuracy | [KFF](https://www.kff.org/health-information-trust/volume-05/) |
| Global trust | 66% use AI regularly, 46% willing to trust; **66% rely on output without checking; 56% made mistakes because of it** (48K people, 47 countries) | [KPMG/Melbourne](https://kpmg.com/xx/en/media/press-releases/2025/04/trust-of-ai-remains-a-critical-challenge.html) |
| Citations effect (large preregistered US experiment) | "Reference links and citations significantly increase trust in GenAI, even when those links and citations are incorrect or hallucinated." Uncertainty highlighting lowers trust. | [arXiv 2504.06435](https://arxiv.org/abs/2504.06435) |
| Expert attribution effect (n=285, preregistered) | Identical financial advice labeled "Certified Financial Planner" beat the "AI assistant" label on 9 of 10 outcomes (d=0.20–0.47); mislabeling AI advice as expert raised rated quality by d=0.42 | [arXiv 2608.09019](https://arxiv.org/abs/2608.09019) |
| What predicts trust in ChatGPT | Confidence in its referencing ability was the single strongest correlate of trust | [arXiv 2507.05046](https://arxiv.org/abs/2507.05046) |

Implication for the product: naming the expert and citing their material are the two strongest measured trust levers. The same evidence says users will over-trust confident, cited answers, so the "I don't know, contact the expert" refusal is a safety feature and a trust feature, but the experiment on uncertainty highlighting warns that hedging language reduces trust. Refuse cleanly; don't hedge.

### 2d. OpenAI's Oct 29, 2025 policy change

The updated policy bars "provision of tailored advice that requires a license, such as legal or medical advice, without appropriate involvement by a licensed professional." Reaction split: professionals praised it, developers feared cost and utility loss, and press initially over-reported it as ChatGPT "stopping" medical/legal answers; later reporting confirmed model behavior didn't change ([Legal IT Insider](https://legaltechnology.com/2025/11/03/openai-changes-chatgpts-usage-policy-to-preclude-legal-advice/), [Jimerson](https://www.jimersonfirm.com/blog/2025/11/ai-usage-policy-changes-what-businesses-need-to-know-about-the-new-restrictions-on-legal-advice-from-chatbots/), [OpenTools](https://opentools.ai/news/openai-tightens-usage-policies-a-game-changer-for-ai-guided-professional-advice)). The widely quoted Karan Singhal "not a new change" post is **[unverified]** here. OpenAI then shipped "Health in ChatGPT" (medical records + Apple Health) on July 23, 2026, across free and paid tiers ([SiliconANGLE](https://siliconangle.com/2026/07/23/openai-launches-health-chatgpt-day-lawsuit-seeks-block/)). Read: the platform is moving toward professional involvement as the compliant pattern while simultaneously competing for the health use case with a free product.

---

## 3. Demand segments by trigger

| Segment | Trigger & timing | Frequency / urgency | WTP evidence | Searches today | Why a named expert's agent beats generic AI and a $200/hr human |
|---|---|---|---|---|---|
| **Tax filer with a wrinkle** (1099, side gig, first home, RSU) | Jan–Apr 15; extension Oct | 1 season/yr, 3–10 questions, deadline-driven | TurboTax Live is 53% of a $5.3B business and growing 37%; JustAnswer tax tier $28–$125/mo; 26% already used AI to file | Google, r/tax, TurboTax community, ChatGPT | Generic AI fails 88% of multi-step tax questions and cites stale rules; a human CPA costs a full return fee for a 10-minute question |
| **Injury / rehab patient** | Post-surgery or sports injury; weeks 1–12 | 2–5 questions/week between PT visits; moderate urgency | Sesame visits $34+; 14% skip visits due to AI; 42% want help outside business hours | ChatGPT, YouTube, r/AskDocs | Rehab is protocol-specific and clinician-specific ("what did *my* PT mean by..."); uploading the rehab plan makes the agent answer from the actual plan |
| **College applicant / parent** | Aug–Jan (early/regular), Mar–May (decisions) | Bursty; dozens of questions over 4 months | Consulting packages $4K–$20K+ **[unverified]**; teens' ChatGPT school use doubled to 26% | r/ApplyingToCollege, TikTok (49% of US consumers use TikTok as search), College Confidential | A named counselor's judgment on essays and school lists is what parents pay for; generic AI gives generic essays; hourly counselors are gated to the wealthy |
| **Money question at a life event** (job change, inheritance, 401k rollover) | Event-driven | 1–3 questions; low urgency, high stakes | 26% use AI for money; 22% cite affordability; Facet starts at $2,400/yr; Betterment Premium needs $100K | ChatGPT, Reddit, YouTube | 30% trust AI vs. 80% trust a human adviser; a named CFP's agent borrows the human's trust at chatbot prices |
| **Small-business owner / freelancer** | Formation, first hire, sales tax, contracts | Recurring, weekly-ish | Rocket Lawyer $35–$65/mo; Intro.co $100–$2,000/hr; JustAnswer business tier | Google, r/smallbusiness, ChatGPT | Wants a specific practitioner's playbook, not a survey of the internet; per-session human billing punishes follow-ups |
| **Legal one-off** (lease, ticket, employment, immigration form) | Event-driven; often urgent | 1–5 questions | Rocket Lawyer add-on $149/30 min; lawyers $100–$350/hr | r/legaladvice, Google, ChatGPT | LLM legal hallucination 69–88%, worst on local law; jurisdiction-specific named lawyer's corpus fixes exactly this |
| **Caregiver / patient with chronic condition** | Diagnosis, medication change | Ongoing | 41% already upload medical records to chatbots; 7 in 10 health chats happen after hours | ChatGPT, patient forums | Wants continuity with a known clinician's guidance; privacy concern is highest here (77% worried) |
| **Professionals asking adjacent professionals** (PT asking a CPA, agent asking an attorney) | Ad hoc | Low frequency, high WTP per question | Intro.co per-session model exists for exactly this | LinkedIn, referrals | Cheap first-pass before paying the human; expert's "I don't know" routes to a paid consult |

---

## 4. Willingness to pay and pricing anchors

**Subscriptions dominate; per-item micropayments have repeatedly failed for information.**

| Anchor | Price | Lesson |
|---|---|---|
| ChatGPT Go / Plus / Pro | $8 / $20 / $200 per month; 50M+ paid subs on ~900M WAU (~5–6% conversion); 89% retained after one quarter | $20/mo is the mass-market ceiling for "AI in general" ([dev.to summary of OpenAI Feb 2026 disclosure](https://dev.to/alifar/chatgpt-tops-50-million-consumer-subscribers-clarifying-demand-for-paid-ai-40p3), [Incremys](https://www.incremys.com/en/resources/blog/chatgpt-statistics)) |
| JustAnswer | $5 to try → $28–$125/mo | Users clearly pay $5 to ask one question; they revolt at the surprise recurring charge. The "$5 to ask" instinct is validated; the subscription trap is the FTC case |
| Google Answers (2002–2006) | $2–$200 per question + $0.50 listing; ~100 questions/day at shutdown | Pay-per-question lost to free Yahoo Answers; too little volume ([Wikipedia](https://en.wikipedia.org/wiki/Google_Answers)) |
| Blendle | €0.09–€1.99 per article; 550K users | Pivoted to subscriptions 2019, killed micropayments 2023 ([Wikipedia](https://en.wikipedia.org/wiki/Blendle)) |
| Quora+ / Partner Program | $5/mo; creator payouts ended 2022–2023; Poe pays creators per message (2024) | Paywalled Q&A didn't monetize; Poe's per-message creator payouts are the closest live analog to this product's model ([Wikipedia](https://en.wikipedia.org/wiki/Quora), [Poe docs](https://creator.poe.com/docs/resources/creator-monetization)) |
| Substack | $5/mo minimum; 5M paid subs | People pay ~$5–$10/mo for a *named* person's expertise; that is the pricing shape to copy |
| Szabo's "mental transaction costs" | n/a | Per-message pricing imposes a decision cost on every message that exceeds the cents charged; bundle credits so users stop thinking about it ([Nakamoto Institute](https://nakamotoinstitute.org/library/micropayments-and-mental-transaction-costs/)) |
| Clarity.fm / Intro.co | $2–$30/min; $35–$500 per 15 min | Named-expert time is priced 100–1,000× a chatbot message. There is enormous room between "free ChatGPT" and "$5/min human" |

**Recommended read of the evidence for this product.** "Cheap enough to try" is a $0–$5 first session (JustAnswer, ChatGPT Go, Substack all cluster there). "Expensive enough to trust" is not a price signal; it's the expert's name and the citations (Section 2c). Keep per-message credits invisible inside packs ($5, $10, $20) and a $10–$20/mo subscription tier; never auto-enroll from a trial (the FTC just made that the defining risk in this category). Paid AI tiers beat free tiers on accuracy (49% vs. 63% failure), which supports a "you are paying for a curated, cited corpus" message.

---

## 5. Candidate hirer ICPs, ranked

**1. The seasonal tax filer with one hard question (rank 1).**
- Who: W-2 plus side income / first-time itemizer / RSU holder, age 25–45, already uses TurboTax or FreeTaxUSA.
- Trigger: a form they don't understand, mid-Feb to Apr 15.
- Current alternative: ChatGPT (26% already do this), r/tax, TurboTax Live upsell ($39–$159+), a CPA who won't take a 10-minute client.
- Why switch: generic AI fails 88% of multi-step tax questions; the expert's agent cites a real preparer's own guidance and refuses outside scope; costs cents, not a Live upgrade.
- First-session must-haves: upload a W-2/1099/prior return; answer cites the preparer's material with the specific line; a clean "this needs a human; here's how to book them" path; explicit "verify on your return" line.
- Disqualifiers: anyone whose situation the preparer's corpus doesn't cover (multi-state, foreign income) unless the refusal-and-refer path is strong.
- Rationale for rank: largest verified WTP signal (TurboTax Live +37%, 53% of revenue), sharpest seasonal demand spike (8× on Claude), highest measurable error rate for the free alternative, and a hard deadline that converts.

**2. The rehab patient between PT visits (rank 2).**
- Who: post-op or sports-injury patient, weeks 1–12, insured but visit-limited; or cash-pay.
- Trigger: "is this pain normal," "can I progress this exercise," typically evenings/weekends (7 in 10 health chats are off-hours).
- Current alternative: ChatGPT, YouTube, waiting for the next visit; 14% skip visits because of AI.
- Why switch: the agent answers from *their* PT's rehab plan (upload), in the PT's own protocol language, and defers to the PT on anything not in the plan.
- Must-haves: upload rehab plan/HEP; red-flag escalation ("contact your PT now" for listed symptoms); no diagnosis; message the PT from inside the thread.
- Disqualifiers: acute/emergent presentation; patients without an existing clinician relationship (no corpus to cite).
- Rationale: strongest fit for the "expert's own material + I don't know" design; clinician distribution is natural (the PT hands it to their caseload). Lower WTP per question than tax, but higher frequency and retention across a 12-week course.

**3. The college applicant's parent (rank 3).**
- Who: parent of a junior/senior, household income $80K–$250K, priced out of $5K+ consulting but willing to spend hundreds.
- Trigger: Aug–Jan application season; essay drafts, school list, aid questions.
- Current alternative: r/ApplyingToCollege, TikTok, ChatGPT essay help (which admissions officers penalize), a named counselor's $4K+ package **[pricing unverified]**.
- Why switch: get a *specific* counselor's judgment and rubric on a resume/essay upload for tens of dollars a month; the counselor upsells full packages to the 10% who need them.
- Must-haves: essay/activity-list upload with counselor-rubric feedback; school-fit answers cited to the counselor's writing; strict "no ghostwriting" behavior.
- Disqualifiers: users who want the agent to write the essay.
- Rationale: high seasonal intensity and parent WTP, but the counselor supply side is thin, the corpus is less rule-based than tax, and the "is this cheating" objection needs handling.

**Runner-up:** small-business owners asking a named business attorney or bookkeeper. Rocket Lawyer's $35–$65/mo tier proves the subscription shape, but the buyer's questions sprawl across domains, which strains any single expert's corpus.

**Where to find the first 100 hirers.**
- Tax: r/tax and r/personalfinance megathreads in Feb–Apr; FreeTaxUSA/TurboTax community forums; gig-worker Facebook groups (Uber/DoorDash drivers, Etsy sellers); the preparer's own client list (email "ask my assistant first, free this week").
- Rehab: the PT's own caseload (handout with QR code at discharge); r/physicaltherapy and r/AskDocs; running clubs and CrossFit boxes; ACL-recovery Facebook groups and Discords.
- Admissions: r/ApplyingToCollege and r/CollegeEssays in Sept–Nov; high-school parent Facebook groups; campus visit days; the counselor's webinar audience.
- Community sizes for these subreddits could not be verified this session (Reddit blocks fetches) **[unverified]**.

---

## 6. Counter-evidence: why demand may not materialize

1. **Free ChatGPT is "good enough" for most people, and they say so.** 47% of chatbot health users call it very helpful; 39% of finance users say it helped vs. 29% harmed; only 9% report hitting inaccurate information (NerdWallet). Users don't experience the 43% error rate as an error rate. The pain that drives switching is mostly invisible to the person who has it.
2. **OpenAI is moving up-stack into exactly this.** Health in ChatGPT connects medical records for free; the "licensed professional involvement" carve-out lets OpenAI or a large partner offer clinician-backed answers. A marketplace must win on specific experts, not on "safer AI."
3. **Per-message pricing has a bad track record.** Google Answers, Blendle, and Quora's paywalls all lost to free or to flat subscriptions. Szabo's mental-transaction-cost argument applies literally to "cents per message." The credit meter must be invisible or it will suppress usage.
4. **Trust may not transfer to a clone.** The expert-label experiment shows labels raise ratings, but it measured a "Certified Financial Planner" label, not "an AI trained on CFP Jane Doe's blog." No study found this session measured trust in a named person's AI clone specifically **[gap]**. Cameo (personality-priced marketplace) collapsed from $1B to ~$50M; Wisdom pivoted away from expert Q&A entirely.
5. **"Why not just call the expert?"** For the highest-WTP moments (surgery decision, IRS letter, denied visa), people want a human on the hook, and the agent's "I don't know, contact the expert" will fire precisely then. The agent captures the long tail of small questions, which is high volume but low revenue per user unless the expert converts those into paid consults.
6. **Liability and privacy.** 41% of health askers upload records; 77% worry about privacy; 40% of taxpayers say they would never put financial data into an AI tool. Seven suits were filed against OpenAI within days of the policy change, and the FTC is actively policing this category's billing. A small marketplace carries this risk without OpenAI's legal budget.
7. **JustAnswer's numbers may overstate organic demand.** Its scale was built on a dark-pattern funnel; the FTC complaint suggests much of the revenue came from people who thought they were paying $5 once. The true "will pay monthly for expert answers" base is smaller than JustAnswer's revenue implies.

---

## Items to verify before the ICP doc is final

- JustAnswer revenue, active members, and questions per member (no primary disclosure found).
- US share of adults using AI for legal questions and for job-search/resume help (only UK Which? data found).
- IvyWise/Crimson package prices; IECA average consultant fee.
- NATP/NSA average tax-prep fees; cash-pay PT visit cost; financial-planner hourly rates.
- HealthTap, K Health, LegalZoom legal-plan consumer prices (pages 404/blocked).
- Subreddit sizes for r/tax, r/AskDocs, r/ApplyingToCollege, r/legaladvice.
- Karan Singhal's clarification of the Oct 2025 policy (widely quoted, not confirmed here).
- Any experiment on trust in a *named individual's* AI clone versus a generic expert label.

## Sources

- FTC v. JustAnswer press release: https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription
- JustAnswer About: https://www.justanswer.com/about ; Wallet Hacks review: https://wallethacks.com/justanswer-review/ ; Clark review: https://clark.com/education/justanswer-review/ ; Pearl.com Wikipedia: https://en.wikipedia.org/wiki/Pearl.com
- Intuit Q4 FY2026 results: https://investors.intuit.com/news-events/press-releases/detail/1320/intuit-reports-fourth-quarter-and-full-year-fiscal-2026-results-sets-fiscal-2027-guidance ; TurboTax Live pricing (SmartAsset): https://smartasset.com/taxes/turbo-tax-review
- Intro.co pricing: https://www.growthmentor.com/blog/intro-co-alternatives ; Clarity.fm: https://mentorcruise.com/blog/clarityfm-review-and-alternative/
- Rocket Lawyer pricing: https://www.rocketlawyer.com/pricing ; Sesame: https://sesamecare.com/ ; Facet: https://facet.com/pricing/ ; Betterment: https://www.betterment.com/pricing ; Delphi: https://www.delphi.ai/pricing
- Pew, Americans and AI 2026 (Feb 2026 survey): https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/
- Pew, why Americans use AI chatbots for health (Aug 2026): https://www.pewresearch.org/science/2026/08/25/from-diagnoses-to-treatments-why-americans-use-ai-chatbots-for-health/
- Pew, convenient vs. accurate (Apr 2026): https://www.pewresearch.org/science/2026/04/07/users-of-social-media-and-ai-chatbots-for-health-information-are-more-likely-to-say-they-are-convenient-than-accurate/
- KFF, 1 in 3 adults use AI chatbots for health (Mar 2026): https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/ ; KFF Monitor vol. 5: https://www.kff.org/health-information-trust/volume-05/
- Gallup/West Health: https://news.gallup.com/poll/707789/americans-turning-supplement-healthcare-visits.aspx ; EurekAlert summary: https://www.eurekalert.org/news-releases/1123709
- Gallup/Edward Jones via Fortune: https://fortune.com/2026/08/08/financial-advisers-trust-ai-usage-gap-gallup/
- NerdWallet/Harris AI and personal finance: https://www.nerdwallet.com/finance/studies/using-ai-for-personal-finances
- OpenAI healthcare report via Gizmodo: https://gizmodo.com/more-than-40-million-people-use-chatgpt-daily-for-healthcare-advice-openai-claims-2000705509
- NBER w34255, How People Use ChatGPT: https://www.nber.org/papers/w34255
- Anthropic Economic Index, June 2026: https://www.anthropic.com/research/economic-index-june-2026-report
- Tax AI usage: https://www.cbsnews.com/news/can-you-use-ai-for-taxes-chatgpt-claude-irs/ ; https://spectrumlocalnews.com/us/snplus/technology/2026/03/27/ai-chatbots-tax-preparation
- Which? AI consumer advice: https://www.which.co.uk/policy-and-insight/article/chatgpt-and-gemini-among-ai-tools-giving-risky-consumer-advice-which-finds-aBnBP0l2CE0T
- Saturn Artificial Authority via InvestmentNews: https://www.investmentnews.com/fintech/ai-chatbots-give-wrong-financial-answers-most-of-the-time-study-finds/268267
- BMJ Open chatbot study: https://bmjgroup.com/substantial-amount-of-medical-information-provided-by-popular-chatbots-inaccurate-and-incomplete/ ; npj Digital Medicine: https://www.nature.com/articles/s41746-026-02428-5 ; JAMA Netw Open via Medical Xpress: https://medicalxpress.com/news/2026-04-popular-ai-chatbots-confidently-medical.html
- Stanford RegLab legal hallucinations: https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive
- KPMG/University of Melbourne trust study: https://kpmg.com/xx/en/media/press-releases/2025/04/trust-of-ai-remains-a-critical-challenge.html
- Trust experiments: https://arxiv.org/abs/2504.06435 ; https://arxiv.org/abs/2608.09019 ; https://arxiv.org/abs/2507.05046
- OpenAI Oct 2025 policy: https://legaltechnology.com/2025/11/03/openai-changes-chatgpts-usage-policy-to-preclude-legal-advice/ ; https://www.jimersonfirm.com/blog/2025/11/ai-usage-policy-changes-what-businesses-need-to-know-about-the-new-restrictions-on-legal-advice-from-chatbots/ ; https://opentools.ai/news/openai-tightens-usage-policies-a-game-changer-for-ai-guided-professional-advice ; https://hooperlundy.com/openai-restricts-use-of-chatgpt-for-medical-advice/
- Winters v. OpenAI: https://tech.yahoo.com/ai/article/openai-sued-over-extremely-dangerous-medical-recommendations-provided-by-chatgpt-190158820.html ; Health in ChatGPT: https://siliconangle.com/2026/07/23/openai-launches-health-chatgpt-day-lawsuit-seeks-block/
- ChatGPT paid subscribers: https://dev.to/alifar/chatgpt-tops-50-million-consumer-subscribers-clarifying-demand-for-paid-ai-40p3 ; https://www.incremys.com/en/resources/blog/chatgpt-statistics
- Micropayment history: https://en.wikipedia.org/wiki/Google_Answers ; https://en.wikipedia.org/wiki/Blendle ; https://en.wikipedia.org/wiki/Quora ; https://en.wikipedia.org/wiki/Substack ; https://nakamotoinstitute.org/library/micropayments-and-mental-transaction-costs/ ; Poe creator monetization: https://creator.poe.com/docs/resources/creator-monetization
- Cameo: https://en.wikipedia.org/wiki/Cameo_(website) ; Wisdom redirect: https://noomvibe.com/
- Lawyer rates: https://www.contractscounsel.com/b/how-much-does-a-lawyer-cost
- TikTok as search (Adobe, Jan 2026): https://www.adobe.com/express/learn/blog/using-tiktok-as-a-search-engine ; Pew teens and ChatGPT: https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/
