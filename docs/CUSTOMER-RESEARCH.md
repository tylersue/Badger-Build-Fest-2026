# Customer Research: Expert-Grounded AI Advice Marketplace

Prepared 2026-09-26 for the four-person UW-Madison team building the Badger Build Fest 2026 MVP. Synthesizes the eight reports in `.planning/research/customer/` and a 45-claim verification ledger. Corrected ledger values replace the originals throughout. [unverified] marks a fact not confirmed against a primary source; [assumed] marks a modeling input the team chose.

## 1. Executive summary

**Who this is for.** Practicing advisors with no audience and no technical skill: independent educational consultants (IECs), former admissions officers, campus career coaches, and, from January, solo tax preparers. Each fields the same thirty questions all season, unpaid, and sells hours to the few who can pay. On the other side: a student or parent with a document (essay, resume, personal statement, later a W-2) and a deadline, who already tried ChatGPT and got generic or wrong output, and who will not pay $349 for an hour with a human.

**Who it is not for.** Experts who already have an audience (Delphi's market). Anyone who wants the agent to diagnose, prescribe, pick investments, or fill in a tax return line by line. Therapists, financial advisors, immigration paralegals, and veterinarians in year one: AI-therapy bans, Advisers Act recordkeeping, unauthorized-practice rules, and VCPR rules make each a liability story.

**The beachhead.** Career and college-admissions advice, launched on the UW-Madison campus in October 2026. Tax follows in January 2027 with supply recruited during the off-season. PT stays a scope-limited third lane.

**The story in one sentence.** Ask a real expert's AI, built from an interview with them, that cites only their words and refuses the rest, for cents a message.

**Three numbers.**

| Number | What it says | Source |
|---|---|---|
| 57% wrong | Chatbots on standard financial questions; 88% wrong on hard multi-step tax questions (18 models, 10,000+ responses) | Saturn study via IFA Magazine, Sep 14 2026 |
| 372:1 | US students per school counselor, versus ASCA's recommended 250:1 | ASCA, 2024-25 |
| 4.56 cents | Hirer price per message at the default 3x multiplier; expert earns 2.58 cents, platform 0.46 cents | Anthropic pricing, verified 2026-09-26 |

## 2. The two-sided ICP

### Expert ICP, primary: the solo career and admissions advisor

| Field | Detail |
|---|---|
| Who | IEC, former admissions officer, or career coach in solo practice. No license exists in any state (IECA). Sells hours or packages: "many charging just under $140/hour," most multi-year packages about $4,400 (IECA FAQ). Campus variant: SuccessWorks, WSB, and ECS coaches whose drop-ins run 10-3 and whose fair-season queue is the overflow problem |
| Headcount | 8,500-10,000 full-time and 10,000-15,000 part-time IECs (IECA, end-2024); 2,800+ IECA members; 389,500 school and career counselors (BLS 2025); ~40,000 US coaches [assumed from ICF's 122,974 worldwide] |
| Trigger | The August application crunch; a full waitlist; the fifth "can you look at my essay" message of the week; the Oct 6-7 career fairs |
| Uses today | Free intro calls, Kajabi or Teachable courses, webinars, parent Facebook groups, checklists emailed over and over |
| Why switch | Near-zero liability; repetitive, text-answerable questions; rubrics already written; a lead magnet that earns from families who cannot afford a package; a 45-minute interview that costs under a dollar to process |
| Must see in session one | Upload a rubric; a 25-minute interview yields 20+ Q&As; the agent critiques a real uploaded essay against their rubric with a citation; it refuses to predict admission odds and refuses to write the essay; a shareable link; an ownership and delete guarantee |
| Disqualifiers | Already runs a large audience; no written frameworks and unwilling to be interviewed; wants the agent to ghostwrite; UW staff who cannot separate general advice from student records (FERPA) |
| First 20 | WSB Career Engagement Studio (coach emails published), ECS advisors Drew Graf and David Yang (each owns a narrow FAQ), SuccessWorks (36,000+ student contacts in 2025-26), IECA directory filtered to Wisconsin, Badger Bridge alumni flagged "willing to help," former counselors posting AMAs on r/ApplyingIvyLeague |

### Expert ICP, secondary: the seasonal solo tax pro (January launch)

| Field | Detail |
|---|---|
| Who | Enrolled agent, AFSP preparer, or one-partner CPA with 150-600 clients, no employees or one seasonal assistant; age 45-65; outside major metros (70-80% of JustAnswer's experts are, self-reported) |
| Headcount | 886,338 PTIN holders (IRS, Sep 1 2026): 209,076 CPAs, 71,966 EAs, 26,256 attorneys, 72,049 AFSP completers, ~579,000 with none of the three credentials |
| Trigger | April 20 or October 16, when burnout is fresh and the off-season is open |
| Uses today | Email templates, a stale FAQ page, JustAnswer (experts keep 20-50% of the fee [unverified, third-party review]), TaxTwitter, Facebook groups |
| Why switch | Knowledge is codified (IRC, IRS pubs) so cite-only answers work; the off-season is a build window; a marketplace brings the non-clients they turn away |
| Must see | Upload three email templates and an engagement letter; the agent answers a real client email with a citation; it refuses a state-specific question they did not cover; disclaimer wording they accept under Circular 230 section 10.37 |
| Disqualifiers | Big 4 or regional-firm employees (employer IP); zero written material; unwilling to put their name on it |
| First 20 | Richard Dilley Tax Center VITA volunteers (85+, idle April-January; label them "IRS VITA-certified volunteer," not "preparer"), NAEA directory by radius, WICPA Find a CPA with a 1040-NR niche, Madison College VITA, NATP state chapters |

### Hirer ICP, primary: the applicant with a document and a deadline

| Field | Detail |
|---|---|
| Who | UW student in fall recruiting or grad-application season (resume, cover letter, personal statement), or a high-school senior or parent in application season (essay, activities list, school list), household $80K-$250K, priced out of $349 an hour or $3,999-$19,999 packages (Princeton Review) |
| Trigger | A fair in the next 48 hours (Oct 1, 6, 7, 13, 20, Nov 4); a grad deadline (DPT closes Nov 1); early-decision deadlines around Nov 1 [unverified: institution convention, not in the cited Common App report]; regular decision in early January [unverified] |
| Uses today | ChatGPT ("generic AI slop"), r/ApplyingToCollege (~490,000 subscribers), TikTok, a school counselor at 372:1, a drop-in queue |
| Why switch | A named practitioner's rubric applied to their own upload, cited, for cents; strict no-ghostwriting keeps it usable; available at 11 pm |
| Must see | Upload a draft; feedback tied to the expert's framework with the quoted passage; a "this is outside what [Name] covered" refusal that offers the human; a free grant big enough to finish one document review |
| Disqualifiers | Wants the essay written; needs an admission-odds prediction; under 13, or under 18 without parental consent for payment |
| First 100 | QR flyers at the six fall fairs (table through a registered org per UWS 18.11); class Discords and GroupMes via each teammate; McNair scholars (28 a year, first-gen); Graduate School fee-grant audience; r/ApplyingToCollege and r/CollegeEssays in Sept-Nov; high-school parent Facebook groups; the IEC's own webinar list |

### Hirer ICP, secondary: the seasonal tax filer with one hard question (February-April)

| Field | Detail |
|---|---|
| Who | W-2 plus side income, first-time itemizer, or RSU holder, age 25-45, already on TurboTax or FreeTaxUSA; on campus, the 7,000+ international students, most of whom must file Form 8843 even with no income, while "ISS staff are not tax professionals and are not able to review your tax forms before you submit" |
| Trigger | A form they do not understand, mid-February to April 15; Sprintax codes emailed Feb 9 |
| Uses today | ChatGPT (26% of filers used AI for 2025 returns, up from 11%), r/tax, the TurboTax Live upsell, a CPA who will not take a 10-minute client |
| Why switch | Generic AI fails 88% of multi-step tax questions; the agent cites a real preparer's guidance and refuses outside scope; costs cents, not a Live upgrade |
| Must see | Upload a W-2 or 1099; the answer names the line and cites the preparer's material; a "this needs a human, book them here" path; "verify on your return" on every answer |
| Disqualifiers | Multi-state or foreign-income situations the corpus does not cover; anyone wanting the return prepared |
| First 100 | ISS tax-season mailing (ask for one mention), r/tax and r/personalfinance megathreads Feb-Apr, gig-worker Facebook groups, the preparer's own client list ("ask my assistant first, free this week") |

## 3. Segmentation

### Expert segments on the fit axes

Headcounts are BLS OOH 2025 unless noted; fit ratings are judgment calls from the supply report.

| Segment | US headcount | Repetitive Qs | Tacit vs written | Sells knowledge today | Liability | Seasonality | Unpaid Q&A | Reachable in 2 weeks |
|---|---|---|---|---|---|---|---|---|
| IECs, career coaches | 20-25k IECs; 389,500 counselors; ~40k coaches [assumed] | Very high | Medium; checklists written | Yes | Low; no license | Aug-Jan | Intro calls, parent groups | High |
| Tax pros | 886,338 PTIN holders; 650,667 licensed CPAs (NASBA) | Very high | Mostly codified | Yes (JustAnswer core category) | Moderate; Circular 230 | Extreme Jan-Apr, Oct 15 | Heavy off-season | Medium |
| PTs, trainers | 283,700 PTs (4% self-employed, 36% in outpatient offices); 400,000+ PTs and PTAs (APTA) | High | Very high tacit; home programs written | Trainers yes; PTs rarely | Moderate; practice acts | Trainers: January | Patient texts | High (DPT, Rec Well) |
| Financial advisors | 299,400 | High | Medium | Some | Very high (Advisers Act) | Year-end | Moderate | Low |
| Therapists | 533,400 counselors | Medium | Very high tacit | Some | Very high (IL HB 1806) | Low | Moderate | Deferred |
| Veterinarians | 91,100 | Very high | High | Yes (JustAnswer growth category) | High (VCPR) | Low | Heavy | High (UW SVM), deferred |
| Home trades | 440,900 HVAC; 510,600 plumbers | Very high | Nothing written | Rarely | Moderate (safety) | Winter, summer | Constant | Low |
| Lawyers | 863,700 | Extremely high | Process codified | Some | High (UPL) | Policy shocks | Massive | Rejected |

### Hirer segments by trigger

| Segment | Trigger and timing | Frequency, urgency | Willingness-to-pay evidence | Current path |
|---|---|---|---|---|
| College applicant or parent | Aug-Jan applications; Mar-May decisions | Dozens of questions over 4 months | $349 an hour, $3,999-$19,999 packages (Princeton Review); 26% of high-achieving students used an IEC (IECA) | r/ApplyingToCollege, ChatGPT, TikTok, counselor |
| Student in recruiting or grad-app season | Fairs Oct 1-Nov 4; deadlines Oct-Dec | Weekly in season | Rec Well members pay $65-$725 for training; grad fee $75 | Drop-in queue, Handshake, class chats |
| Tax filer with a wrinkle | Jan-Apr 15; October extension | 3-10 questions a season; deadline-driven | TurboTax Live is 53% of $5.3B TurboTax revenue, up 37% (Intuit FY2026); JustAnswer $28-$125 a month | ChatGPT (26%), r/tax, TurboTax Live |
| Rehab patient between visits | Post-op or injury, weeks 1-12 | 2-5 a week | Milwaukee cash-PT clinic $250 initial visit (MKE Physical Therapy); national $100-$250 range [unverified]; "$600 for stretching I found online" (r/HealthInsurance) | ChatGPT, YouTube, waiting |
| Money question at a life event | Job change, inheritance, rollover | 1-3 questions; high stakes | 26% use AI for money; 22% cite affordability (NerdWallet/Harris) | ChatGPT, Reddit |
| Small-business owner | Formation, first hire, sales tax | Weekly-ish | Rocket Lawyer $34.99-$64.99 a month | Google, r/smallbusiness, SBDC |

## 4. Beachhead decision

### Scores

From the categories report (1-5; liability inverted so 5 is safest), re-checked against the ledger.

| Criterion | Career, admissions | Tax | PT, fitness | HVAC, plumbing | Veterinary |
|---|---|---|---|---|---|
| Demand frequency | 3 | 3 | 4 | 4 | 4 |
| Willingness to pay | 5 | 4 | 3 | 3 | 3 |
| Expert supply and reachability (Madison, 2 weeks) | 4 | 3 | 5 | 2 | 4 |
| Async-answerability | 5 | 5 | 3 | 3 | 3 |
| Liability (inverted) | 5 | 2 | 3 | 3 | 3 |
| Demo-ability (4 minutes) | 5 | 4 | 4 | 4 | 4 |
| Seasonality vs late-October launch | 5 | 2 | 4 | 5 | 4 |
| Total | 32 | 23 | 26 | 24 | 25 |

### The disagreement

The supply report ranks the solo tax pro as expert ICP #1: largest credentialed headcount, proven willingness to answer for pay, codified knowledge, an off-season build window. The demand report ranks the tax filer as hirer #1: the largest verified willingness-to-pay signal, the sharpest seasonal spike, the highest measured error rate for the free alternative. The categories report puts admissions first, PT second, tax in January. The PMF report backs admissions first with enrolled agents second.

### Resolution

Tax is the largest and best-fit market. It is not the beachhead, because the MVP launches in the wrong month.

| Consideration | Career, admissions | Tax | PT |
|---|---|---|---|
| Launch timing (late Oct-Nov 2026) | Six campus career fairs Oct 1-Nov 4; DPT deadline Nov 1; grad apps Oct-Dec; early-decision deadlines around Nov 1 [unverified convention] | Trough. Oct 15 extensions just closed; the next spike is late January; Claude tax queries run 8x the daily average around April 15 (Anthropic Economic Index) | Year-round |
| Liability and licensing | None. No license in any state; NACAC and IECA ethics bar writing the essay, which matches a critique-only agent | Circular 230 section 10.37 treats electronic written advice by CPAs, EAs, and attorneys as advice; non-credentialed preparers may publish general information | Wisconsin PT 5.01(2)(h) allows telehealth assessment only in real time; 448.56 requires a referral except for conditioning and injury prevention; an async agent can only be education |
| Campus reachability | Highest for a student team: three career offices publish coach emails; IECA directory | Medium: 85+ VITA volunteers idle until January; EAs via NAEA; CPAs negotiate disclaimers | Highest raw supply (DPT program, Rec Well, OST), narrowest scope |
| Demo-ability | Best: a real uploaded essay, the expert's voice, a visible refusal that is not scary | Strong refusal moment, but a W-2 is dull on stage and tax panic is in March | Relatable, but the refusal dominates |
| Long-run market | Narrowest: 20-25k IECs plus counselors and coaches | Largest: 886k PTIN holders; TurboTax Live is 53% of a $5.3B business | Largest demand pool: "over 230 million people globally" ask ChatGPT health questions weekly (OpenAI, self-reported) |

**Decision.** Beachhead: career and college-admissions advice, launched on the UW-Madison campus in October 2026, with campus career coaches and IECs or former admissions officers as the first experts and students and applicants with a document and a deadline as the first hirers. It wins four of five considerations and loses only on long-run size, the one thing a four-week MVP is not judged on.

**Sequencing.**

| Order | Category | When | What has to be true |
|---|---|---|---|
| 1 | Career and admissions | Now through January 2027 | 12 of the first 20 experts; agents live before the Oct 6-7 fairs |
| 2 | Tax | Supply recruited Oct-Dec; the 1040-NR and Form 8843 agent with an EA live by week 3 as a dry run; demand launch late January 2027 | 5 of the first 20 experts; disclaimer wording accepted by at least one EA |
| 3 | PT and fitness | Sprint: 3 of the first 20, scoped to conditioning and injury-prevention education (the 448.56 exception) via Rec Well trainers and one PT; full launch after malpractice-carrier and scope review | Rehab-plan upload demo works; refusal on diagnosis prompts at 100% |

**What would change it.** If week-1 fake doors show career coaches booking fewer than 10 interviews per 100 sign-ups while EAs book more, flip the expert weighting. If UW policy blocks staff coaches (Regent Policy 25-3, FERPA), go IEC-only. If international students show strong October demand on the 8843 agent, pull the tax launch forward to November. If the fairs produce fewer than 35 activated hirers by Oct 11, campus admissions demand is thinner than the calendar suggests; test r/ApplyingToCollege and parent groups before week 3.

**Stage paragraph.** "We are starting with college and career advice. This year 1,527,328 students filed 10,786,782 Common App applications, about seven each, most of them with a school counselor responsible for 372 students. The ones who can afford it pay a consultant just under $140 an hour, or $349 for a single hour at the Princeton Review, to answer the same questions over and over. We interviewed career coaches and admissions consultants and turned each into an agent that answers only from what they actually said, and refuses the rest. A student uploads her essay, asks 'is my opening too generic,' and gets that expert's answer, cited to that expert's rubric, for under five cents. Application deadlines are weeks away. Nothing here is licensed, so we ship now. Tax is the same product with a different expert, and it launches in January, when 140 million individual returns get filed."

## 5. Evidence the market exists

### Adjacent-product PMF

| Product | Model | Verified numbers | What it proves |
|---|---|---|---|
| Delphi.ai | Expert builds a "digital mind"; pays $0, $79, or $299 a month (1M, 5M, 12M training words) plus a custom "Immortal" tier "for celebrities and public figures" | $16M Series A led by Sequoia (Jess Lee), Jun 24 2025; 2,000+ experts then (self-reported). Matthew Hussey: 2.5M+ questions answered, "millions in recurring revenue" (vendor-reported); $39 a month [unverified]; 15% subscription share [unverified] | Experts will let a clone answer for money and hirers pay for a name. Every cited winner arrived with an audience |
| Personify (personify.fyi) | Same shape; Free and $29 a month Pro | Launched Apr 21 2026; career coach Lucy Gilmour $8,800 in 24 hours, 1,039 conversations in 9 days, users in 94 countries (press release) | A second entrant within 12 months. Still audience-first |
| JustAnswer | Human experts answer paid questions since 2003 | 12,000+ experts, 700 categories, 196 countries; ~4M queries a year; adding 4,000+ experts in 2026 with consumer electronics, veterinary, and finance as growth categories; "16M+ questions" [unverified]. FTC sued the company and CEO Andrew Kurtzig Jan 13 2026 under ROSCA: $1-$5 "join" fee, then $28-$125 a month | 22 years of proof that strangers pay for expert answers; the incumbent's billing is now a legal liability |
| Poe (Quora) | Creator price per message in milli-cents | "Over $100,000 paid out by mid-2026" [unverified] | Per-message pricing is a shipped primitive; payouts are trivial |
| Character.AI | Consumer companions | 20M+ MAU, ~$30M annualized revenue Jul 2025 [unverified, aggregators]; under-18 chat ban Nov 25 2025 | Engagement without monetization; the wrong comp |
| Intro.co | 1:1 video calls | Experts charge $100-$2,000 an hour, $35-$500 per 15 minutes; 30% commission on marketplace bookings, 10% on expert-sourced; lowest listed session $79 [unverified] | The 30/10 split says demand is the scarce side |
| Kajabi | Knowledge commerce | $10B cumulative creator revenue, 100k+ creators (Aug 2025); the average six-figure earner has 309 paying customers (secondary) | "Small audience, real income" is our supply profile |
| Substack | Paid subscriptions to individuals | 5M paid subscriptions (Mar 2025); "writers keep 90%" | Paying a named voice is mainstream |
| Cameo | Celebrity video | $1B valuation in 2021 to a cramdown under $100M in 2024 [headline only] | Novelty access without a repeat need collapses |

**What investors said.** Sequoia's partnering post (Jun 24 2025) backs a "living Library of Alexandria" of verified minds: "what starts as a niche can quickly become the new normal." Jess Lee to Fast Company: "This, today, I think, to a lot of consumers just seems weird. We need to cross the chasm" [unverified: article body not fetched]. Delphi's founder listed four monetization paths on Sequoia's podcast: direct subscriptions, content licensing, brand licensing of verified identities, and search-as-a-service to find the right expert by topic. No clone platform has disclosed aggregate GMV.

### AI usage and trust

| Finding | Number | Source |
|---|---|---|
| US adults using AI chatbots | 49% (33% in 2024); 24% daily | Pew, Feb 2026 |
| Chatbot users asking for medical advice | 20% of users (~10% of all adults) | Pew, Feb 2026 (corrected base) |
| Used chatbots for health information in the past year | 32%; 41% of them uploaded personal medical information; 77% concerned about privacy | KFF, Feb 24-Mar 2 2026 |
| Use AI for personal finance | 26%; 22% cite affordability versus humans; 12% embarrassed to ask a person; 20% acted without verifying | NerdWallet/Harris, Jun 2026 |
| Filers who used AI for 2025 returns | 26%, up from 11% | Adobe via CBS, Mar 2026 |
| Weekly health askers on ChatGPT | "over 230 million people globally" | OpenAI, Jul 23 2026 (self-reported) |
| Chatbot health answers rated highly accurate | 18%, versus 65% own provider, 48% health websites, 7% social media; convenient 48%, personalized 23% | Pew, Apr 2026 |
| Confidence in AI for money decisions | About 3 in 10, versus about 8 in 10 for a human adviser; 3% "a great deal" | Gallup/Edward Jones via Fortune, Aug 2026 |
| Would act on chatbot money guidance without checking | 57% of chatbot-using US adults; 23% already received wrong money information | PensionBee, Sep 17 2026 |
| Rely on AI output without evaluating accuracy | 66%; 56% made mistakes because of it (48,000+ people, 47 countries) | KPMG/University of Melbourne |
| Citations raise trust even when hallucinated; uncertainty highlighting lowers it | Preregistered US-representative experiment | Li and Aral, arXiv 2504.06435 |
| Expert label beats AI label on identical advice | 9 of 10 outcomes, d=0.20-0.47; mislabeling AI as expert raised rated quality d=0.42 (n=285) | arXiv 2608.09019 |

Naming the expert and citing their material are the two strongest measured trust levers. The same evidence says users over-trust confident, cited answers, so the refusal is a safety feature. Refuse cleanly; do not hedge, because hedging lowers trust.

### Voice of customer

Only quotes 1 and 8 (the judge-slide pair) were re-verified against Reddit's RSS. The rest are as archived by the voice-of-customer report (Pullpush, Arctic Shift); upvote counts are [unverified] and omitted.

**Supply: the unpaid help desk**

1. "'Do you have time for a quick tax question?' reads the text message preview... Kill me. Never tell anyone what you do." (r/Accounting, Jan 18 2024) https://www.reddit.com/r/Accounting/comments/199rx6q/
2. "I hate being the tax guy, hate how they have access to my regular phone number and just call me whenever they want with random tax questions." (r/taxpros, Jan 6 2026) https://www.reddit.com/r/taxpros/comments/1q5rab0/
3. "Every person in my life has come to me with PT questions, multiple times at this point. I used to draw up detailed exercise regimens for them and follow up. Exhausting, and they almost never do the regimen." (r/physicaltherapy, Aug 2 2023) https://www.reddit.com/r/physicaltherapy/comments/15fqw35/
4. "family and friends will most likely not take your advice seriously because you aren't their actual PT. They'll take it seriously when there's a monetary value associated with it." (r/physicaltherapy, Aug 3 2025) https://www.reddit.com/r/physicaltherapy/comments/1mgm0cg/
5. "everyone gets one free question. Then I tell them that my rate is $50 per question." (r/nursing, Dec 28 2023) https://www.reddit.com/r/nursing/comments/18stylc/
6. "Had a client run their draft return through ChatGPT and Gemini and spit out a couple demands to change their return that were flat out wrong." (r/Accounting, Apr 21 2026) https://www.reddit.com/r/Accounting/comments/1sr82s5/
7. "It's dirty and it's horrible... My annual salary was worth 2 client packages." (former private college counselor, r/ApplyingIvyLeague, Aug 19 2026) https://www.reddit.com/r/ApplyingIvyLeague/comments/1vsljo2/

**Demand: burned by free, priced out of paid**

8. "Chatgpt calculated my taxes, for a fairly simple return. It made major mistakes... It used 2024 standard deduction, not 2025." (r/tax, Feb 12 2026) https://www.reddit.com/r/tax/comments/1r30mmv/
9. "it gave me 3 different calculated numbers over 3 different responses... ChatGPT will often make incorrect assumptions about your tax situation instead of asking clarifying questions." (r/tax, Jan 14 2026) https://www.reddit.com/r/tax/comments/1qd2jcj/
10. "it keeps giving me generic AI slop instead of stuff tailored to my passions????" (r/ApplyingToCollege, Oct 2 2025) https://www.reddit.com/r/ApplyingToCollege/comments/1nvsvfj/
11. "They told me that I can keep dreaming if I can't afford their prices." (r/ApplyingToCollege, Apr 5 2023) https://www.reddit.com/r/ApplyingToCollege/comments/12cmheq/
12. "I've only done 2 sessions but it's already cost me almost $600 even though each session is basically them telling me to do stretching I've already found online." (r/HealthInsurance, Apr 2 2025) https://www.reddit.com/r/HealthInsurance/comments/1jpo97g/
13. "Why do you guys always tell your customers it's only going to charge them $5 and then proceed to try and charge them anywhere between $66-$90?" (top question to a JustAnswer expert, r/IAmA, Jan 7 2026) https://www.reddit.com/r/IAmA/comments/1q6lb72/

**Clone sentiment: knowledge yes, persona no**

14. "Clones explicitly saying 'I'm not always right' made users more comfortable engaging deeply." (SaaStr, on 1M clone conversations) https://www.saastr.com/the-real-learnings-from-1000000-ai-conversations-with-clones-of-brian-halligan-lenny-rachitsky-keith-rabois-and-jason-lemkin/
15. "he has absolutely zero credentials to be giving nutrition, fitness, sobriety, or relationship advice... He's a charlatan that is now available in AI." (r/QueerEye on Karamo Brown's clone app, Apr 24 2026; 1.6 stars on Google Play on Sep 26 2026) https://www.reddit.com/r/QueerEye/comments/1sutmby/

Read-through: hostility attaches to persona (celebrity, parasocial, no credentials). Acceptance attaches to knowledge (trustworthy source, obviously a bot, admits limits, specific to my situation). Do not say "clone."

### Their words vs our words

| They say | We tend to say | Use in copy |
|---|---|---|
| "Can I pick your brain?" / "quick question" | knowledge capture, interview flow | "Stop giving it away at parties. Answer it once." |
| "the tax guy" / "my PT" | expert agent, digital mind | "Ask [Name]'s tax guy" |
| "ChatGPT said" / "generic AI slop" | generic LLM, ungrounded generation | "Not ChatGPT. Their actual answers." |
| "confidently wrong" | hallucination | "Cites what they said. Refuses what they never said." |
| "$5 was totally worth it" / "$200 a visit" | credits, multiplier, margin | "Cents per message, no membership" |
| "membership scam" / "no way to cancel" | subscription, recurring billing | "Pay per message. Nothing renews." |
| "skin in the game" | monetization, pricing power | "Set your rate. Paid questions get real answers." |
| "trading time for money" | scale, leverage | "Your knowledge answers while you sleep" |
| "obviously a bot... trained on a trustworthy source" | RAG, grounding, citations | "Every answer links to the expert's own words" |
| "icky" / "parasocial" / "black mirror" | digital clone, avatar | Never "clone." Say "answers from [Name]'s notes." |

## 6. Why now

| Date | Tailwind | Verified detail | Status |
|---|---|---|---|
| Jun 24 2025 | Delphi raises a $16M Series A led by Sequoia | 2,000+ experts (self-reported) | Confirmed |
| Aug 1 2025 | Illinois HB 1806 signed, the first AI-therapy ban | Public Act 104-0054 | Confirmed; corrected from ~Aug 5 |
| Oct 29 2025 | OpenAI usage policy bars "provision of tailored advice that requires a license, such as legal or medical advice, without appropriate involvement by a licensed professional" | A liability measure; model behavior did not change | Confirmed |
| Jan 13 2026 | FTC sues JustAnswer and its CEO under ROSCA | $1-$5 join fee, then $28-$125 a month | Confirmed; the reported AU$10M Australian fine has no source and is dropped |
| Mar 2026 | New York SB 7263 advanced by the Senate | Bars chatbot responses that constitute unauthorized practice of a licensed profession; private right of action | Confirmed via Holland & Knight |
| Apr 21 2026 | Personify launches | $8,800 in 24 hours for one coach (self-reported) | Confirmed as press release |
| Apr 2025 reintroduced; Jun 18 2026 committee | NO FAKES Act, S.1367 | Federal digital-replica right with a licensing framework; statutory damages $5,000 per unauthorized replica, $25,000 per work for compliant providers, $750,000 cap for non-compliant | Reintroduction corrected to Apr 2025; the Jun 18 2026 unanimous committee vote is [unverified] |
| Jul 2025 to Sep 2026 | Accuracy studies | TaxCalcBench: "less than a third" of federal returns computed correctly. Stanford RegLab: 69-88% legal hallucination, at least 75% on a court's core holding. Bean et al.: LLMs alone 94.9% correct, people using them under 34.5% (n=1,298). BMJ Open (Apr 2026): 50% of health answers problematic. Saturn (Sep 14 2026): 57% wrong on standard money questions, 88% on complex, best model 39% wrong | Confirmed |
| Sep 1 2026 | Anthropic cancels the planned Sonnet 5 price rise | $2 in, $10 out per MTok stays; cache reads $0.20; constant-capability inference fell ~10x a year 2021-2024 (a16z), 9x-900x by threshold (Epoch AI) | Confirmed |
| Sep 23-24 2026 | OpenAI hires Patreon's co-founder for a creator division | Headlines only | [unverified] |
| Oct 26 2026 | Enterprise custom-GPT creation ends | Per OpenAI's FAQ; the PMF report's Sep 25 date is wrong | Confirmed |
| Dec 11 2026 | Custom GPTs retire; approved deferrals to Feb 11 2027 | The GPT Store builder revenue program "still testing with US based users... not currently accepting additional builders" [unverified: help article removed]; ~$0.03 per conversation [unverified] | Retirement confirmed |

Double-edged: OpenAI shipped Health in ChatGPT on Jul 23 2026 across free and paid tiers and is moving into creator monetization. It validates the category and is the largest platform threat.

## 7. Competitive positioning

### Hirer alternatives

| Alternative | Price | Speed | Who stands behind the answer | What it cannot do |
|---|---|---|---|---|
| Free ChatGPT, Gemini, Claude | $0 (paid $8-$200 a month) | Instant | No one; "a tendency towards overconfidence, irrespective of their actual accuracy" (Stanford) | Compute a third of federal returns; say who is answering |
| Perplexity | Free; Pro $20 a month | Instant | Web pages, not a person | Apply a practitioner's method to your document; citation generation hallucinates 14-95% across 13 models (GhostCite) |
| JustAnswer | $1-$5 join, then $28-$125 a month | 36 minutes to an answer in Clark.com's test (secondary) | A licensed human; the platform's trust is damaged | Cents per question; a persistent relationship with one named expert |
| Reddit | Free | Hours to days | Anonymous crowd | Verify who is answering; handle private documents |
| Paid human, hourly | Tax: base 1040 $280 CPA, $228 EA, $182 an hour (NATP 2025 via Accounting Today); $317 with state (via Ramsey). Counseling: $349 an hour, $3,999-$19,999 packages (Princeton Review). Intro.co $100-$2,000 an hour | Days to schedule | Full professional liability | Be available at 11 pm; be worth booking for a two-minute question |
| Delphi minds | Creator-set subscription | Instant | Named creator | Help you find an expert you have never heard of |
| Custom GPTs | Free | Instant | OpenAI brand | Exist after Dec 11 2026 |
| TurboTax Live | Expert Assist $39-$209; Full Service from $89 (secondary) | Same day in season | Intuit | Anything outside tax or outside 5 AM-9 PM PT, Jan 5-Apr 20 |
| Telehealth | Doctor On Demand $99 per 15 minutes | Minutes to days | Licensed MD | Cents-per-message coaching from your own PT's protocol |

The only rows with a named, accountable human are expensive and scheduled. The only cheap, instant rows are anonymous or generic. No row is cheap, instant, and names a credentialed practitioner whose own material is the sole source.

### Expert alternatives

| Path | Upfront effort | Cost to expert | Revenue evidence | Audience required |
|---|---|---|---|---|
| YouTube, blog | Months | $0 | Ads only after 1,000 subscribers and 4,000 watch hours | Yes |
| Course (Teachable, Kajabi) | 40-160 hours per finished hour (secondary) | $39-$499 a month | Kajabi average ~$37,000 a year, thin top tail (secondary) | Yes |
| Newsletter (Substack) | Weeks to a cadence | 10% of revenue | Median ~$4,000 a year [unverified] | Yes |
| JustAnswer expert | Application | $0 | Keeps 20-50% of the fee [unverified] | No; sells hours forever |
| Intro, Clarity calls | Profile | Intro 30% or 10%; Clarity 15% [unverified] | Linear in hours | Helps a lot |
| AI clone (Delphi, Coachvox, BuddyPro) | Upload a content library (1M-12M training words) | Delphi $79-$299 a month; Coachvox $996 a year plus 10% [unverified] | Delphi's flagship: 2.5M+ conversations | Yes, structurally |
| Build a GPT | Under an hour | ChatGPT Go $8 a month | Pilot-only revenue program; retires Dec 11 2026 | Yes |
| Us | One 45-minute interview | $0 upfront; build metered at raw cost (20-74 credits) | 1x-5x multiplier; keeps 85% of the markup | No |

Every path that needs no audience sells the expert's hours. Every path that builds an asset assumes distribution. Nobody offers an asset without an audience.

### Positioning map

X axis: who supplies the demand (left, the expert brings the audience; right, the platform brings hirers). Y axis: accountability (bottom, generic model or anonymous crowd; top, a named practitioner whose own material is the source). Upper-left: Delphi, Coachvox, BuddyPro, courses, newsletters. Upper-right: JustAnswer, Intro, TurboTax Live, telehealth, all human-time, scheduled or subscription. Lower-right: ChatGPT, Perplexity, Reddit, YouTube. Lower-left: custom GPTs and unknown-creator Poe bots. We are the only AI product in the upper-right quadrant. Clone tools can move right only by becoming a marketplace; frontier labs can move up only by naming a human, which is not their business.

### Differentiators ranked by defensibility

| Rank | Differentiator | Who could copy | Speed | Why they will not soon |
|---|---|---|---|---|
| 1 | Experts-without-audience discovery: the platform brings hirers | JustAnswer; Delphi (open Discover as a marketplace) | 6-12 months; 3-6 months | Cannibalizes JustAnswer's subscription under an FTC complaint; Delphi must reprice from SaaS-plus-share to usage |
| 2 | Interview-first tacit-knowledge capture | Any clone platform or OpenAI | 1-3 months; the interviewer is a prompt | The data exhaust is the moat: which interview questions, per category, produce chunks that get retrieved and rated well |
| 3 | Citation-grounded refusal | Anyone | Weeks | Engagement-priced platforms lose money when the bot says "my expert hasn't covered that"; cost-based credits make refusal cheap for us |
| 4 | Transparent cost-based credits (1 credit = 1 cent) | Anyone | Weeks | Incumbents' margins live in the opacity; Poe's stated intent is to "cover all model inference costs" inside a subscription |
| 5 | Self-only clones | Anyone | A day | A trust signal, not a pitch line |

### Why not ChatGPT

1. On our exact tasks, frontier models are measurably wrong and do not know it: under a third of federal returns correct (TaxCalcBench); 69-88% legal hallucination with overconfidence (Stanford). Our agent answers only from the named expert's chunks, shows the chunk, and refuses otherwise.
2. The problem is the human-model interaction: LLMs alone 94.9% correct, people using them under 34.5%, no better than control (Bean et al.). An interview-built agent carries the practitioner's own questions ("did you get a 1099-K?") because the interview captured how the expert works.
3. People already pay for a name and distrust the nameless answer: 18% of chatbot health users rate answers highly accurate versus 65% for their own provider (Pew). We show a name, credentials, and the exact paragraph.

### Why not hire the human

1. The human is priced for the hour and most questions are two minutes long: $182 an hour for tax advice, $349 for a counseling hour, $99 for 15 telehealth minutes. This is not a substitute for the $317 return; it answers the fifty questions you would never book an hour for.
2. The human is not available when the question happens: TurboTax Live runs 5 AM-9 PM PT in season only; Intro sells 15-minute blocks at $35-$500. The agent is the expert's method at 11 pm in September, and it hands you to the human at the edge of what she told it.
3. Hiring the human is what the agent is for: the cheapest way to learn whether this practitioner thinks the way you need, and for the expert a lead-qualified funnel that answers the repetitive 80% so paid hours go to the hard 20%.

### Category name candidates

| Candidate | Shelf | Verdict |
|---|---|---|
| Expert agent marketplace | Marketplaces | "Agent" is crowded and vague |
| Ask-an-expert, AI-answered | JustAnswer's | Recommended: hirers search by problem, and the incumbent is under FTC fire |
| Digital mind or clone marketplace | Delphi's | Signals creators with audiences, the opposite of the wedge |
| Practitioner-grounded AI | Vertical AI | Names the differentiator, not the marketplace |
| Micro-consulting marketplace | Clarity, Intro | Implies human time |

Working category name: expert-grounded AI advice marketplace. Pitch line: "Ask a real expert's AI. Pay by the message." Do not use "Badger," "Wisconsin," or the motion W in the product name without brand office approval.

## 8. Unit economics and pricing constants

Prices verified 2026-09-26 on Anthropic's pricing page: Claude Sonnet 5 $2 in and $10 out per MTok, cache write $2.50, cache read $0.20; Haiku 4.5 $1 and $5; the planned Sep 1 2026 rise to $3/$15 "will not occur." Voyage voyage-4-lite embeddings $0.02 per MTok with 200M free (Voyage pricing page; negligible). Token counts are design assumptions; the 4.7+ tokenizer yields ~30% more tokens than earlier models, so verify with count_tokens once the prompt exists.

### Cost per message (Sonnet 5)

cost = cached_in x $0.20/M + uncached_in x $2/M + out x $10/M + guard, where guard is a Haiku 4.5 scope check (~800 in, 20 out) at 0.09 cents.

| Case | Tokens | Model cost | With guard |
|---|---|---|---|
| Typical, system prompt cached | 1,500 cached + 5,000 uncached in (3,000 chunks, 2,000 history), 400 out | 1.43 cents | 1.52 cents |
| Typical, no cache | 6,500 in, 400 out | 1.70 cents | 1.79 cents |
| Typical, system and history cached | | 1.07 cents | 1.16 cents |
| Heavy, system cached | 6,000 chunks, 8,000 history, 6,000-token upload, 1,200 out | 5.23 cents | 5.32 cents |

Worked: 1,500 x $0.20/M + 5,000 x $2/M + 400 x $10/M = $0.0003 + $0.0100 + $0.0040 = $0.0143. Caching the system prompt saves 16% for a one-time 0.375-cent write shared across every hirer of that agent. Constants: RAW_TYPICAL = 1.52 cents, RAW_HEAVY = 5.32 cents. Haiku 4.5 cannot cache a 1,500-token prompt (4,096 minimum) and is the wrong tier for answers under an expert's name.

### Build cost

| Step | Formula | Cost |
|---|---|---|
| 40-turn interview, uncached | 275,000 in x $2/M + 4,800 out x $10/M | $0.598 |
| Same, prefix cached | 263,000 x $0.20/M + 12,000 x $2.50/M + 4,800 x $10/M | $0.131 |
| Chunking (Haiku, 40 calls) | 40 x (600 x $1/M + 100 x $5/M) | $0.044 |
| Persona draft (Sonnet) | 10,000 x $2/M + 800 x $10/M | $0.028 |
| Embeddings, interview plus 50-page PDF | ~70,000 x $0.02/M | $0.001 |
| Optional PDF chunk titling (Haiku) | 40,000 x $1/M + 4,800 x $5/M | $0.064 |
| Total | | $0.20-$0.74 (20-74 credits) |

### Hirer price by multiplier (price = raw x m)

| Multiplier | Per message | 10-message session | 10 heavy messages | Versus alternatives |
|---|---|---|---|---|
| 1x | 1.52 cents | 15 cents | 53 cents | Pro-bono setting |
| 2x | 3.04 cents | 30 cents | $1.06 | |
| 3x (default) | 4.56 cents | 46 cents | $1.60 | 1.6% of JustAnswer's $28 cheapest month; 0.58% of Intro's $79 lowest session [price unverified] |
| 5x (cap) | 7.60 cents | 76 cents | $2.66 | Under 3% of a JustAnswer month |

The product does not compete on price. It competes with "did not ask anyone."

### Expert earnings (margin = raw x (m - 1); expert = 0.85 x margin; platform = 0.15 x margin)

| Multiplier | Expert per message | Platform per message | Platform share of gross |
|---|---|---|---|
| 2x | 1.29 cents | 0.23 cents | 7.5% |
| 3x | 2.58 cents | 0.46 cents | 10.0% |
| 5x | 5.17 cents | 0.91 cents | 12.0% |

Messages per month to reach a target (N = target / expert per message):

| Target | 2x | 3x | 5x |
|---|---|---|---|
| $100 | 7,740 | 3,870 | 1,935 |
| $500 | 38,700 | 19,350 | 9,675 |
| $2,000 | 154,800 | 77,400 | 38,700 |

At MVP volumes an expert earns tens of dollars, not hundreds. The MVP proves the metering loop, not an income. The number that impresses is the split: 85% of the markup to the expert, versus JustAnswer's undisclosed majority and the GPT Store's undisclosed formula. Because raw cost falls roughly 10x a year and cost-plus pricing indexes the business to a deflating input, the first post-MVP pricing move is session passes (99 credits for 20 messages: raw 30 cents, expert 58 cents, platform 10 cents), which price the expert's judgment rather than the tokens.

### Platform economics

platform share of gross = 0.15 x (m - 1) / m. Every credit spent at 3x costs the platform 90% of face in cash. Ten free messages at 3x cost 41 cents of real money and take 90 paid messages to recoup. Fixed cost ~$46 a month (Supabase Pro $25, Vercel Pro $20) [assumed]. Tiers at 1:1 credits net $4.60, $9.20, and $23.00 on $10, $20, and $50 at 60% utilization [assumed], so ten $10 subscribers cover the servers. Bonus credits go underwater.

### Recommended MVP constants

The unit-economics and campus reports disagreed on grants (200 versus 300 hirer credits) and the default multiplier (3x versus 2x). Resolution: the cost-derived base plus the behavioral bonuses.

| Constant | Value | Why |
|---|---|---|
| Chat, guard, embeddings | Sonnet 5, Haiku 4.5, voyage-4-lite | Opus 5.5 doubles cost for no demo gain |
| RAW_TYPICAL, RAW_HEAVY | 1.5, 5.3 cents | Placeholder until an agent has 50 real messages |
| Multiplier | 1x-5x, integer steps, default 3x | 3x gives 10% of gross; 2x only 7.5% |
| Platform margin share s | 0.15 | Delphi and Clarity anchor at 15% of gross [unverified]; ours is 15% of margin, 1.5-2x thinner |
| Ledger unit, display | Milli-credits; one decimal ("4.6 credits") | Whole-credit rounding is a hidden 30% markup |
| New hirer grant | 200 credits on wisc.edu verification, +200 first document upload, +200 per referral who sends 5 messages, cap 600 | 200 covers 10 heavy messages at 3x; the cap forces the "buy credits" prompt inside the sprint |
| New expert grant | 500 on signup, +500 on passing QA at publish ("Founding Expert"), +500 per referred expert who publishes | 500 covers the build 7x plus 250 sandbox messages |
| Entitlement check | balance >= max(10 credits, 2 x the agent's listed typical price); charge after the call | A heavy message at 5x is 26.6 credits |
| Tiers (mocked) | $10, $20, $50 for 1,000, 2,000, 5,000 credits; packs 500 for $5, 2,000 for $20 | 1:1; nothing auto-renews from a trial |

## 9. Market sizing

### Supply-side bottom-up (US)

| Segment | Count | Source |
|---|---|---|
| Lawyers | 863,700 | BLS OOH 2025 |
| Accountants and auditors | 1,595,200 | BLS |
| Personal financial advisors | 299,400 | BLS |
| Physical therapists | 283,700 | BLS |
| Dietitians and nutritionists | 86,300 | BLS |
| School and career counselors | 389,500 | BLS |
| Mental-health and substance-abuse counselors | 533,400 | BLS |
| Non-credentialed tax preparers | ~579,000 | IRS PTIN holders minus CPAs, EAs, attorneys (AFSP completers inside; credentials overlap) |
| US coaches | ~40,000 | ICF 122,974 worldwide x ~35% North America [assumed] |
| Pool | 4,670,200 | |

| Step | Value | Basis |
|---|---|---|
| Independent share | 20% [assumed] | Blend of salaried counselors and solo practitioners |
| Independent advice professionals | ~934,000 | 4.67M x 20% |
| GMV per active agent per month | $200 [assumed] | JustAnswer "general" experts average $614 a month with humans answering (self-reported); no-audience experts start lower |
| Supply TAM | ~$2.24B GMV a year | 934,000 x $200 x 12 |
| SAM | ~$56M GMV a year | Low-liability domains ~25% of the pool [assumed] x 20% x 10% five-year adoption [assumed] = ~23,000 experts x $200 x 12 |
| SOM, three years, one beachhead | ~$1.8M GMV a year | 1,000 experts x $150 x 12 [assumed] |

### Demand-side check (the binding constraint)

| Step | Value | Basis |
|---|---|---|
| US adults | ~262M [not fetched] | Census |
| Use AI chatbots | ~128M | Pew 49% |
| Chatbot users asking medical advice | ~26M | Pew 20% of users (the PMF report's 52M used the wrong base) |
| Have one question a year worth paying a named expert for | ~26M | 10% of adults [assumed] |
| Convert to paying | 1.3M | 5% [assumed] |
| ARPU | $8 a month [assumed] | Between Poe per-message and Hussey's reported $39 a month [unverified] |
| Demand TAM | ~$125M GMV a year | 1.3M x $96 |

The supply TAM needs ~23M monthly payers, 9% of US adults, which no analog has reached. Present as $0.1-$2.2B GMV with a ~$0.5B central case [assumed]; say plainly that supply is abundant and demand must be proven. Upside beyond per-message: "book the human" referral fees and B2B licensing to firms, schools, and clinics.

### Top-down, with skepticism

| Figure | Source | Caveat |
|---|---|---|
| Coaching profession $5.34B, 122,974 practitioners | ICF 2025 | Credible, self-reported survey |
| TurboTax $5.3B on 39.0M units; Live 53% of revenue, up 37% | Intuit FY2026 | Best single proof that people pay for expert help inside software |
| Creator economy $250B to $480B by 2027 | Goldman Sachs 2023 | Ad-supported video dominates; not our market |
| AI agents $7.84B to $52.62B by 2030 | MarketsandMarkets | Enterprise automation; irrelevant |

## 10. Validation plan (four weeks)

| Week | Activity | Output |
|---|---|---|
| 1 (Sep 28-Oct 4) | 15 expert and 15 hirer interviews; fake-door pages live; 5-question consumer survey on "an AI version of a named professional"; book ECS, one PT, one VITA or EA interview; Personal Finance Career Night Oct 1 | Interview notes, waitlist counts, survey baseline |
| 2 (Oct 5-11) | Concierge test with real money; publish the WSB or SuccessWorks agent before the Oct 6-7 fairs | Paid conversion, return rate, message depth |
| 3 (Oct 12-18) | Alpha with five experts on the real product; Sean Ellis survey after the second session; 1040-NR and 8843 agent live | Activation, citation and refusal accuracy |
| 4 (Oct 19-25) | Metrics roll-up, two LOIs (a counseling office, a tax practice), pitch rehearsal | Traction slide |

### Expert interview script (past behavior only, no pitching)

1. Walk me through the last time someone asked you a question outside a paid engagement. What did you do?
2. How many of those do you get in a normal week, and through which channel?
3. What did your last new client pay, and how did they find you?
4. Tell me about the last request you ignored or declined because it was not worth your time.
5. What have you already tried for repeat questions (FAQ, templates, a blog, ChatGPT)? What happened?
6. What was the last thing you paid for to get clients or save time, and how much?
7. Which questions do you refuse to answer without a formal engagement, and why?
8. If a client acted on a wrong answer given under your name, what would happen to you?
9. Have you recorded yourself explaining your method (video, podcast, slides)? Who owns it?
10. Who else do you know who deals with this?

Close with a commitment, not an opinion: "Can I book 45 minutes next week to interview you on camera?"

### Hirer interview script

1. Tell me about the last time you had an essay, resume, tax, or rehab question you could not answer yourself. What did you do first?
2. What did you type into Google or ChatGPT, and what came back?
3. Did you pay anyone? How much, and how did you decide?
4. What made you doubt the free answer?
5. Have you ever paid a subscription for advice (JustAnswer, a coach, Substack)? What happened next?
6. How did you find the person you finally trusted?
7. How long between the question and an answer you acted on?
8. What documents did you need someone to look at?
9. The last time you paid for advice online, what happened right after you paid?
10. Who else do you know who had this problem recently?

### Fake-door test

Two pages per category. Expert side: "Your expertise, answering while you sleep." Hirer side: "Ask [Name]'s AI. Cited. Cents per answer." Drive 300-500 visitors to each via campus lists, subreddits, LinkedIn, and $100-$200 of ads.

| Signal | Threshold | Basis |
|---|---|---|
| Email sign-up rate | Under 3% weak; 5-10% real; over 10% strong | Unbounce cross-industry median 6.6% (2024) |
| Second action (book an interview, reserve with $1) | 2%+ of visitors is strong | Commitment beats opinion |
| Expert side | 10+ booked interviews per 100 sign-ups | Interview willingness is the supply gate |

### Concierge test

Three experts answer as "the agent" over WhatsApp or Telegram, citing their own notes, at $0.50 a message or $5 for 10 via a payment link. Ten hirers per expert for seven days. Thresholds: 30%+ of trial hirers pay; 25%+ return within seven days; refunds under 5%; median 6+ messages per paid session. Log every question the expert could not answer from their own knowledge: that is the refusal set and the next interview's agenda.

### Sean Ellis test

After a hirer's second session: "How would you feel if you could no longer use this?" 40%+ "very disappointed" indicates fit (Superhuman went from 22% to 58% in three quarters by segmenting to the users who loved it). Collect 40+ responses; segment by category and by expert.

### Cold-start tactics

- Supply-first: 14 of 17 marketplaces in Lenny Rachitsky's study went supply-first; top supply levers were direct sales (~60%) and referrals (~33%); winners used 2-3 levers, constrained to one city or category; paid marketing rarely worked early.
- Atomic network: five experts in one niche and 50 hirers in one campus community (Andrew Chen). Our twist: our experts have no audience, so supply does not bring demand. Demand must come from word of mouth inside one community plus SEO on the long-tail questions the agents already answer.
- Single-player value: the interview produces a shareable expert FAQ the expert wants even with zero marketplace demand.

### MVP metric thresholds

| Metric | Week-4 target | Benchmark |
|---|---|---|
| Expert activation (interview started to agent published) | 60%+ | Median activation 25%, SaaS 30% (Lenny survey) |
| Hirer activation (opens chat to first paid message) | 15%+ | Marketplaces have the lowest activation rates |
| Trial-to-paid (mocked purchase click) | 20%+ | BuddyPro claims 36% [self-reported] |
| Hirer 7-day return | 25%+ | Consumer transactional: 30% good, 50% great (Lenny) |
| Expert 30-day retention (adds content or reviews flagged answers) | 50%+ | None public |
| Messages per paid session | 6+ | Delphi reports voice users 5x more retentive (self-reported) |
| Citation coverage; correct out-of-scope refusal | 90%+ each on a 50-question eval | BMJ Open: 50% of generic health answers problematic |
| Refunds or disputes | Under 5% | JustAnswer's complaint volume |
| Supply funnel: contacted, booked, interviewed, published, first paid use | 60 / 40 / 90 / 70% | Campus report targets |

### Kill criteria

| Risk | Evidence against us | Kill signal | Positive signal |
|---|---|---|---|
| Experts will not invest the time | Delphi's winners ingested millions of words; Personify trains on existing content | Under 30% of interested experts finish a 45-minute interview, or interview-only agents cannot answer half of real questions | Experts referring experts unprompted; asking to add material |
| Hirers will not pay after free ChatGPT | Character.AI ~$2 per MAU a year [unverified]; Poe payouts trivial; the GPT Store never paid broadly | Concierge trial-to-paid under 10%; 7-day return under 15% | Follow-up questions in the same session; requests for new domains |
| Regulated domains | IL HB 1806, NY SB 7263, OpenAI's own policy | No licensed professional accepts liability for their agent's answers even with review tools | A licensed expert asks for a review queue rather than declining |
| Accuracy and sycophancy | BMJ Open 50% problematic; RAG over interviews still hallucinates | Citation grounding under 85%, or experts reject over 20% of sampled answers | Refusals that convert into "book the human" bookings |
| Novelty decay | Cameo collapsed when repeat purchase never appeared | No hirer uses the product twice in four weeks | Hirers returning with a second problem |
| Platform risk | OpenAI creator division [unverified]; Delphi and Personify free tiers | A platform launches per-message paid clones with verification before we reach 100 experts | Experts who tried Delphi or Personify choose us for the interview and the refusal |
| Two-sided cold start | Our experts have no audience | Cost to acquire a paying hirer exceeds 12 months of ARPU | Word-of-mouth share of new hirers above 30% |

## 11. Go-to-market on campus

Scale: 51,822 students in Fall 2025 (37,198 undergraduate), 504,072 living alumni; ISS serves more than 7,000 international students. Badger Build Fest 2026 runs Sept 26-27 at Morgridge Hall with 119 participants (live counter) and $11,750 in prizes; the 2025 edition ran Nov 15-16, so confirm with TEL (sandra.bradley@wisc.edu) which edition the sprint targets.

### Four-week acquisition plan

Start Sept 28. "Activated hirer" means a verified email plus 5 metered messages. Targets are cumulative.

| Week | Experts interviewed | Agents published | Activated hirers | Focus |
|---|---|---|---|---|
| 1 (Sep 28-Oct 4) | 6 | 3 | 10 | Book ECS advisors, one OST or independent PT, one VITA volunteer or EA. Oct 1 Personal Finance Career Night with a QR flyer |
| 2 (Oct 5-11) | 12 | 8 | 35 | Fairs Oct 6 (Communications, Gordon Dining) and Oct 7 (Inclusive Community, Union South): "Ask a WSB coach for free" QR. DPT students via Meet Me Monday (Mondays 10-noon) |
| 3 (Oct 12-18) | 17 | 13 | 65 | Virtual Business Fair Oct 13. Grad-app push: McNair and the Graduate School fee-grant audience. 1040-NR and 8843 agent with an EA |
| 4 (Oct 19-25) | 20+ | 18+ | 100+ | Second virtual fair Oct 20. Referral loop on. Expert earnings statements |

Expert mix across the 20: 12 career and admissions, 5 tax, 3 PT and fitness. Throughput: 20 x 45 minutes = 15 founder-hours; two teammates own supply, two own demand and product. Each interview should yield 40-80 Q&A pairs; publish when the agent answers 10 held-out questions with citations.

### Named channels and orgs

| Channel | Contact | Use |
|---|---|---|
| WSB Career Engagement Studio, 3290 Grainger Hall | Director Jamie Mickelson; coaches at firstname.lastname@wisc.edu | First published agent before Oct 6 |
| Engineering Career Services | ecs@engr.wisc.edu; Drew Graf (co-ops), David Yang (internships) | "One advisor, one topic" agents |
| SuccessWorks (L&S) | SuccessWorks@wisc.edu | Overflow for the Handshake and resume tier |
| UW DPT program | Amy Schubert, schubert@pt.wisc.edu; Meet Me Monday | Faculty and third-year students under faculty review |
| Orthopedic & Spine Therapy (11 clinics, "No Referral Needed") | ostpt.com | Named-clinician PT agent |
| UW Rec Well | hello@recwell.wisc.edu | Trainers as experts; members as hirers |
| Richard Dilley Tax Center (VITA) | Clare Dahl, Dahl.Clare@danecounty.gov | 85+ IRS-certified volunteers, idle until January |
| NAEA directory; WICPA Find a CPA | taxexperts.naea.org; wicpa.org | Solo EAs; CPAs with a 1040-NR niche |
| Wisconsin SBDC | sbdc@wsb.wisc.edu | Small-business triage agent |
| Transcend UW; Entrepreneurship Hub | transcenduw.com; Draper TIF deadline Nov 15 | Registered-org sponsorship for tabling; alumni mentors as experts |
| Badger Bridge (WAA) | uwalumni.com | Alumni flagged "willing to help" |
| After the sprint | gBETA Madison (free, equity-free, seven weeks); StartingBlock | Next step |

### Cold-email scripts

PT clinic owner:

> Subject: Your clinic's most-asked questions, answered by you, 24/7
>
> Hi Dr. ___, I'm a UW-Madison student on a four-person team building a marketplace where practitioners publish an AI agent built entirely from a 45-minute interview with you. Yours would answer only from what you told us, cite you by name, and refuse anything outside your material. It's education, not evaluation: no diagnosis, no plan of care, and a referral prompt to your clinic on every session. You set the price multiplier and keep the margin; we meter usage and show you the split. We're recruiting 20 founding Madison experts before Oct 25 and would like you to be the first PT. Would a 45-minute interview at your clinic, any weekday, work? [Name], [phone], [wisc.edu email]

Career coach:

> Subject: Overflow for drop-in hours, Oct 6-7 fairs
>
> Hi ___, drop-ins run 10-3 and the fairs are Oct 6-7. We're four UW students building a tool that turns a 45-minute interview with you into a named agent that answers the first-tier questions (Handshake, resume format, fair prep) 24/7, citing only what you said and declining anything else. No student records are involved; it's your general advice, on the record. We'd like you to be one of 20 founding experts, publish before Oct 6, and put a QR code at your fair table so students can try it while they queue. Fifteen minutes to see a demo this week? [Name]

### Credit incentives

Constants are in section 8. Purchases are mocked, so credits are behavioral signals: the share of hirers who hit the free cap and click "buy" is the willingness-to-pay metric. Experts see the split on every message and get a weekly earnings email and a permanent "Founding Expert" badge.

### Wisconsin and campus regulatory notes

| Area | Rule | Implication |
|---|---|---|
| PT | Wis. Stat. 448.56: written referral required except for services related to athletic activities, conditioning, or injury prevention, and previously diagnosed conditions. PT 5.01(2)(h): telehealth assessment only in real time. 448.985: practice occurs where the patient is located. 448.51(1e): "P.T." and "D.P.T." are protected titles | An async text agent cannot be evaluation or treatment. Position as conditioning and injury-prevention education; block diagnosis and plan-of-care language; verify licenses on DSPS before displaying credentials; disclaim for non-Wisconsin users |
| Tax | A PTIN is required only to prepare returns for compensation; Circular 230 governs attorneys, CPAs, and EAs; Oregon, Maryland, New York, and California license preparers; Wisconsin has no equivalent [unverified by absence] | General tax education is not return preparation; do not fill in a return line by line from an upload; label VITA volunteers "IRS VITA-certified volunteer" |
| FERPA | UW counts career advisors as school officials and prohibits FERPA data in generative AI tools it has not reviewed | Interview advisors about general knowledge only; never ingest student records; hirer uploads are the hirer's own consented data; minors need parental consent |
| Campus commerce | UWS 18.11(8) bars selling or soliciting on university lands without permission or registered-org sponsorship; UWS 18.08(9) bans posting outside approved boards; Regent Policy 25-3 bars staff from using UW IT for private gain | Table through Transcend UW; interview staff on their own time and devices; get IP terms in writing before accepting university money |
| Brand | brand.wisc.edu | No "Wisconsin," "Badger," or motion W in the product name without approval |

## 12. Pitch narrative (four minutes)

**Problem (30 seconds).** "AI gets standard financial questions wrong 57% of the time, and 57% of Americans who use chatbots for money would act on the answer without checking." (Saturn, Sep 14 2026; PensionBee, Sep 17 2026.) Half of US adults use chatbots; a quarter use them daily. Only 18% of people who ask a chatbot about their health rate the answers highly accurate, versus 65% for their own provider. The human alternative costs $182 an hour for tax advice or $349 for an hour of college counseling, and the school counselor has 372 students.

**Why now (30 seconds).** Oct 29 2025: OpenAI's policy bars tailored licensed advice "without appropriate involvement by a licensed professional." Dec 11 2026: custom GPTs retire, and the GPT Store never broadly paid builders. Sonnet 5 at $2 per million input tokens and $0.20 cache reads makes a per-expert agent cost a cent and a half a message. Delphi ($16M from Sequoia) and Personify proved experts with audiences will do this; the ones without an audience have nowhere to go.

**The wedge (30 seconds).** College and career advice first: no license anywhere, a document to upload, a hard deadline, and the experts are on this campus. Tax in January, when 26% of filers will ask AI and some will get last year's standard deduction.

**Demo beats (90 seconds).**

| Beat | What the audience sees | Story point |
|---|---|---|
| 1 | A 60-second clip of a career coach being interviewed; the knowledge map fills in | Experts without content can build this |
| 2 | A student asks "is my opening too generic?" and gets the coach's answer with the quoted passage | Named, cited |
| 3 | The student uploads a real personal statement; feedback tied to the coach's rubric | Personalization from the hirer's own document |
| 4 | "What are my odds at Michigan?" triggers "That's outside what [Name] covered. Book her here." | Refusal is the trust feature |
| 5 | Expert dashboard: credits earned per message, the split, and the unanswered-question list that seeds the next interview | The metering loop and the data asset |

**Business model (one sentence).** Hirers pay cents per message at raw model cost times the expert's 1x-5x multiplier; the expert keeps 85% of the markup and we keep 15%, so we only make money when the expert does.

**What four weeks can credibly show.** 20 experts interviewed and 18 published; 100 activated hirers; concierge or mocked-purchase conversion; a Sean Ellis score; citation and refusal accuracy on a 50-question eval; two LOIs.

**The ask.** The build-fest prize, ten introductions to counselors and enrolled agents, and a small pre-seed to run a tax-season pilot in January 2027.

**Three one-liners.**
- JustAnswer without the subscription trap, ChatGPT without the guessing.
- Every expert gets an agent; every agent cites its sources and admits what it does not know.
- Ask a real expert's AI. Pay by the message.

**Strongest objection: "Why doesn't OpenAI do this?"** OpenAI is retreating from tailored licensed advice by policy and retiring the product that would host this. Its creator push follows Patreon's playbook, which needs an existing audience. Our supply is people with expertise and no audience; our product is refusal plus citation under a verified name; our data asset is the map of unanswered questions per domain.

## 13. What we still don't know

### Primary-research gaps

| Gap | Why it matters | Week-one action |
|---|---|---|
| No survey of licensed professionals' willingness to build an AI version of themselves | The supply thesis rests on it | 15 expert interviews; ask question 9 and close with the on-camera booking |
| No survey of consumer interest in an AI version of a named professional | The n=285 experiment tested an expert label, not "AI trained on Jane Doe" | 5-question survey to 100+ students at the Oct 1 event and in class chats |
| No measured unpaid Q&A hours per week for any segment | Sizes the "answer it once" pain | Interview question 2 |
| Cash-pay PT visit price and IEC fee distribution | Comparators on the pricing slide | Call five Madison clinics; pull ten IEC sites from the directory |
| Subreddit sizes (r/tax, r/AskDocs, r/UWMadison, r/madisonwi) | Channel sizing | Check from a logged-in browser |
| JustAnswer revenue, active members, expert payout terms | The incumbent's true organic demand | Not resolvable; present as unknown |
| Whether UW staff coaches can participate at all | Beachhead supply | Ask one WSB coach and the Registrar's FERPA office |
| Whether the Nov 1 early-decision convention drives reachable demand | Beachhead timing | Count fair-QR activations by Oct 11 |

### Verification ledger summary

45 claims checked: 32 confirmed, 8 corrected, 5 unverified, 0 refuted.

| ID | Old value | Corrected value |
|---|---|---|
| C03 | IEC rates $140-$230 an hour; packages $850-$10,000 | "Many charging just under $140/hour"; most multi-year packages ~$4,400; no $230, $850, or $10,000 on the IECA page |
| C06 | PensionBee: ~60% of people would follow AI money advice without verifying | 57% of the 1,000 US adults who use chatbots for personal finance; 23% already received wrong information |
| C07 | Pew: 20% of US adults use chatbots for medical advice | 20% of chatbot users (~10% of adults) |
| C09 | Enterprise GPT creation ends Sep 25 2026; revenue-program quote; $0.03 per conversation | Oct 26 2026; retirement Dec 11 2026; deferrals Feb 11 2027; revenue-program status and the $0.03 figure unverified |
| C10 | NO FAKES reintroduced May 2026; cleared Senate Judiciary unanimously Jun 18 2026 | S.1367 reintroduced Apr 2025; damages $5,000, $25,000, $750,000 cap; the Jun 18 2026 vote unverified |
| C18 | JustAnswer typical $65 a month; Australia AU$10M fine Jul 2026 | $65 is secondary and anecdotal; no source for the Australian fine, dropped |
| C35 | Illinois HB 1806 signed ~Aug 5 2025; PA AG sued Character.AI May 5 2026 | Signed Aug 1 2025 (Public Act 104-0054); the PA suit is unverified |
| C45 | ISS "cannot review completed forms"; every F-1/J-1 must file 8843; 118 participants | "are not able to review your tax forms before you submit"; "most" F and J students; 119 participants |

Unverified and carried with markers: C04 (Nov 1 and early-January deadlines), C20 (JustAnswer expert per-answer pay), C22 (Clarity.fm 15%, Coachvox 10%), C28 (KFF trust figures; not used), C43 (national cash-PT price range). Two report-level conflicts also resolved from the ledger: Personify exists at personify.fyi with a $29 a month Pro tier (the competitive report could not find it; the PMF report listed $79), and the pitch's take rate is the product spec (15% of margin, 10% of gross at 3x), not the PMF report's "experts keep 70%."

## 14. Sources

**Supply headcounts and pay**
- IRS PTIN statistics: https://www.irs.gov/tax-professionals/return-preparer-office-federal-tax-return-preparer-statistics
- NASBA: https://nasba.org/licensure/how-many-cpas/
- BLS OOH: https://www.bls.gov/ooh/healthcare/physical-therapists.htm ; https://www.bls.gov/ooh/legal/lawyers.htm ; https://www.bls.gov/ooh/business-and-financial/accountants-and-auditors.htm ; https://www.bls.gov/ooh/business-and-financial/personal-financial-advisors.htm ; https://www.bls.gov/ooh/healthcare/dietitians-and-nutritionists.htm ; https://www.bls.gov/ooh/community-and-social-service/school-and-career-counselors.htm ; https://www.bls.gov/ooh/community-and-social-service/substance-abuse-behavioral-disorder-and-mental-health-counselors.htm ; https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm ; https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm ; https://www.bls.gov/ooh/healthcare/veterinarians.htm
- APTA, Dec 10 2025: https://www.apta.org/contentassets/f33dfdc9971b475ea5c78fa68862cb09/press-release-demographics-income-reports-121025.pdf
- IECA FAQ: https://www.iecaonline.com/news-publications/ieca-news-center/faqs-on-the-independent-educational-consulting-profession/
- ICF 2025: https://coachingfederation.org/research/global-coaching-study
- ASCA: https://www.schoolcounselor.org/About-School-Counseling/School-Counselor-Roles-Ratios
- NATP 2025 fees: https://www.accountingtoday.com/news/what-do-tax-preparers-charge ; https://www.ramseysolutions.com/taxes/how-much-does-a-tax-pro-cost

**Demand, usage, and trust**
- Common App 2025-26: https://commonapp.org/files/DAR/deadline-updates/2025-26/Common-App-End-of-Season-Report_25-26.pdf
- Pew, Feb 2026 survey: https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/
- Pew, Apr 2026: https://www.pewresearch.org/science/2026/04/07/users-of-social-media-and-ai-chatbots-for-health-information-are-more-likely-to-say-they-are-convenient-than-accurate/
- KFF: https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/
- NerdWallet/Harris: https://www.nerdwallet.com/finance/studies/using-ai-for-personal-finances
- Gallup/Edward Jones via Fortune: https://fortune.com/2026/08/08/financial-advisers-trust-ai-usage-gap-gallup/
- PensionBee: https://www.pensionbee.com/us/research-and-insights/2026-ai-and-your-money-report
- KPMG/Melbourne: https://kpmg.com/xx/en/media/press-releases/2025/04/trust-of-ai-remains-a-critical-challenge.html
- Adobe via CBS: https://www.cbsnews.com/news/can-you-use-ai-for-taxes-chatgpt-claude-irs/
- OpenAI, ChatGPT Health: https://openai.com/index/introducing-chatgpt-health/
- Intuit FY2026: https://investors.intuit.com/news-events/press-releases/detail/1320/intuit-reports-fourth-quarter-and-full-year-fiscal-2026-results-sets-fiscal-2027-guidance
- IRS 2026 filing season: https://www.irs.gov/newsroom/filing-season-statistics-for-week-ending-april-17-2026
- Anthropic Economic Index: https://www.anthropic.com/research/economic-index-june-2026-report

**Accuracy and trust experiments**
- Saturn via IFA Magazine: https://ifamagazine.com/chatgpt-and-claude-get-financial-advice-wrong-57-of-the-time/
- TaxCalcBench: https://arxiv.org/abs/2507.16126
- Stanford RegLab: https://hai.stanford.edu/news/hallucinating-law-legal-mistakes-large-language-models-are-pervasive
- Bean et al.: https://arxiv.org/abs/2504.18919
- Li and Aral: https://arxiv.org/abs/2504.06435
- Expert-label experiment: https://arxiv.org/abs/2608.09019
- GhostCite: https://arxiv.org/abs/2602.06718
- BMJ Open: https://bmjgroup.com/substantial-amount-of-medical-information-provided-by-popular-chatbots-inaccurate-and-incomplete/

**Adjacent products and competitors**
- Delphi: https://www.delphi.ai/blog/delphi-raises-16m-series-a-from-sequoia ; https://www.delphi.ai/blog/how-matthew-hussey-scaled-his-expertise ; https://www.delphi.ai/pricing ; https://sequoiacap.com/article/partnering-with-delphi-meet-your-heroes
- Personify: https://natlawreview.com/press-releases/personify-launches-platform-lets-professionals-clone-themselves-ai ; https://personify.fyi/
- FTC v. JustAnswer: https://www.ftc.gov/news-events/news/press-releases/2026/01/ftc-sues-justanswer-deceiving-consumers-enrolling-costly-recurring-monthly-subscription
- JustAnswer: https://www.prnewswire.com/news-releases/justanswer-plans-to-add-4-000-new-experts-in-2026-as-demand-for-online-professional-help-in-consumer-electronics-finance-and-veterinary-care-surges-302666791.html ; https://www.justanswer.com/about ; https://wallethacks.com/justanswer-review/ ; https://clark.com/education/justanswer-review/
- Intro.co: https://intro.co/experts
- Clarity.fm via MentorCruise: https://mentorcruise.com/blog/clarityfm-review-and-alternative/
- Coachvox: https://coachvox.ai/charge-for-ai/ ; BuddyPro: https://buddypro.ai/
- Substack: https://substack.com/about ; Kajabi: https://finance.yahoo.com/news/10b-creator-revenue-climbing-kajabi-130000846.html
- Poe: https://creator.poe.com/docs/server-bots/poe-bot-monetization-api-documentation
- Princeton Review: https://www.princetonreview.com/college-admissions/college-counseling
- TurboTax Live: https://turbotax.intuit.com/personal-taxes/online/live/ ; Doctor On Demand: https://doctorondemand.com/how-it-works/
- Cameo: https://en.wikipedia.org/wiki/Cameo_(website)
- SaaStr: https://www.saastr.com/the-real-learnings-from-1000000-ai-conversations-with-clones-of-brian-halligan-lenny-rachitsky-keith-rabois-and-jason-lemkin/
- MKE Physical Therapy: https://www.mkephysicaltherapy.com/how-much-does-cash-pay-physical-therapy-cost/

**Policy and regulation**
- OpenAI policy via Legal IT Insider: https://legaltechnology.com/2025/11/03/openai-changes-chatgpts-usage-policy-to-preclude-legal-advice/
- Custom GPT retirement FAQ: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq
- NO FAKES Act: https://en.wikipedia.org/wiki/NO_FAKES_Act
- Illinois HB 1806: https://www.ilga.gov/Legislation/BillStatus?DocNum=1806&GAID=18&DocTypeID=HB&SessionID=114
- New York SB 7263: https://www.hklaw.com/en/insights/publications/2026/03/new-york-bill-would-create-liability-for-chatbot-proprietors
- Circular 230: https://www.irs.gov/pub/irs-pdf/pcir230.pdf ; PTIN: https://www.irs.gov/tax-professionals/ptin-requirements-for-tax-return-preparers
- Wisconsin PT law: https://docs.legis.wisconsin.gov/statutes/statutes/448/iii/56 ; https://docs.legis.wisconsin.gov/statutes/statutes/448/xi/985 ; https://docs.legis.wisconsin.gov/code/admin_code/pt/5/01 ; https://docs.legis.wisconsin.gov/statutes/statutes/440/i/094
- UW FERPA and AI: https://registrar.wisc.edu/ferpa-and-artificial-intelligence-ai/ ; 34 CFR 99.31: https://www.law.cornell.edu/cfr/text/34/99.31
- UWS 18.11: https://docs.legis.wisconsin.gov/code/admin_code/uws/18/11 ; UWS 18.08: https://docs.legis.wisconsin.gov/code/admin_code/uws/18/08 ; Regent Policy 25-3: https://www.wisconsin.edu/regents/policies/acceptable-use-of-information-technology-resources/ ; brand: https://brand.wisc.edu/

**Pricing and unit economics**
- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing ; caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Voyage: https://docs.voyageai.com/docs/pricing
- a16z: https://a16z.com/llmflation-llm-inference-cost/ ; Epoch AI: https://epoch.ai/data-insights/llm-inference-price-trends
- Supabase: https://supabase.com/pricing ; Vercel: https://vercel.com/pricing

**Campus**
- UW facts: https://www.wisc.edu/about/facts/ ; ISS: https://iss.wisc.edu/employment-taxes/taxes/ ; https://iss.wisc.edu/about/
- SuccessWorks: https://successworks.wisc.edu/ ; WSB: https://business.wisc.edu/undergraduate/careers/ ; ECS: https://ecs.wisc.edu/contact/staff/ ; fairs: https://careers.wisc.edu/
- DPT: https://www.med.wisc.edu/education/physical-therapy-program/how-to-apply/ ; Rec Well: https://recwell.wisc.edu/training/ ; OST: https://www.ostpt.com/
- VITA: https://dane.extension.wisc.edu/2026/05/15/richard-dilley-tax-center-providing-access-to-free-volunteer-income-tax-assistance-vita-2026/ ; NAEA: https://taxexperts.naea.org/ ; WICPA: https://www.wicpa.org/ ; SBDC: https://sbdc.wisc.edu/
- Transcend UW: https://www.transcenduw.com/ ; Entrepreneurship Hub: https://entrepreneurship.wisc.edu/programs/ ; Badger Build Fest 2026: https://badger-build-fest-2026.devpost.com/ ; gBETA: https://www.gener8tor.com/gbeta/madison
- Comparables: https://www.thecrimson.com/article/2004/2/9/hundreds-register-for-new-facebook-website/ ; https://techcrunch.com/2022/10/04/fizz-app-college-stanford-social/ ; https://en.wikipedia.org/wiki/EatStreet

**Validation method**
- Lenny Rachitsky: https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace ; https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate ; https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29
- Superhuman PMF engine: https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/
- Unbounce: https://unbounce.com/conversion-benchmark-report/

**Voice of customer**
- Reddit threads, URLs inline in section 5 (archived via Pullpush and Arctic Shift); RSS verification of the judge-slide pair: https://www.reddit.com/r/tax/comments/1r30mmv/.rss
