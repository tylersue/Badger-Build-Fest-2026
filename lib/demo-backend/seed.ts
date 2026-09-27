/**
 * Proxier demo seed: first-time founders hire agents built by experienced
 * founders and operators. Same shapes and identity ids as lib/data/seed.ts
 * ("maria" is the switchable expert, "sam" the switchable hirer) so the demo
 * store and every screen work unchanged; only the content differs.
 * Timestamps are relative to page load so the history always looks recent.
 */
import { mediaById } from "./media";
import type { Agent, Chunk, Citation, Conversation, Flag, Identity, InterviewTurn, LedgerEntry, Message, PersonaForm, Profile, Review, ReviewStars, Source } from "@/lib/types";

const MIN = 60_000;
const loadedAt = Date.now();
const ago = (minutes: number) => new Date(loadedAt - minutes * MIN).toISOString();
const DAY = 24 * 60;

export const MARIA = "maria";
export const SAM = "sam";

export const IDENTITIES: Identity[] = [
  { id: MARIA, kind: "expert", displayName: "Cynthia Pham", avatarInitial: "C", avatarColor: "#5a4636", isSwitchable: true },
  { id: SAM, kind: "hirer", displayName: "Austin Han", avatarInitial: "A", avatarColor: "#2f5a4b", isSwitchable: true },
  { id: "dev", kind: "expert", displayName: "Dev Patel", avatarInitial: "D", avatarColor: "#3b2560", isSwitchable: false },
  { id: "priya", kind: "expert", displayName: "Priya Nair", avatarInitial: "P", avatarColor: "#084d31", isSwitchable: false },
  { id: "luis", kind: "expert", displayName: "Luis Ortega", avatarInitial: "L", avatarColor: "#1566b8", isSwitchable: false },
  { id: "hannah", kind: "expert", displayName: "Hannah Kim", avatarInitial: "H", avatarColor: "#6244a0", isSwitchable: false },
  { id: "tom", kind: "expert", displayName: "Tom Reyes", avatarInitial: "T", avatarColor: "#079455", isSwitchable: false },
  { id: "jordan", kind: "hirer", displayName: "Jordan Lee", avatarInitial: "J", avatarColor: "#5a3a36", isSwitchable: false },
  { id: "alex", kind: "hirer", displayName: "Alex Rivera", avatarInitial: "A", avatarColor: "#36475a", isSwitchable: false },
  { id: "riley", kind: "hirer", displayName: "Riley Brooks", avatarInitial: "R", avatarColor: "#1566b8", isSwitchable: false },
  { id: "morgan", kind: "hirer", displayName: "Morgan Diaz", avatarInitial: "M", avatarColor: "#6244a0", isSwitchable: false },
  { id: "casey", kind: "hirer", displayName: "Casey Nguyen", avatarInitial: "C", avatarColor: "#079455", isSwitchable: false },
];

export const PROFILES: Profile[] = [
  { identityId: MARIA, displayName: "Cynthia Pham", field: "Early-stage startups", credentials: "2x founder (one exit), angel investor", yearsExperience: 12, contactUrl: "https://cal.com/cynthia-pham", bio: "Founded two B2B software companies and sold the second. Now I angel invest and mentor first-time founders at a university accelerator.", location: "Madison, WI" },
  { identityId: SAM, displayName: "Austin Han", field: "", credentials: "", yearsExperience: null, contactUrl: "", bio: "First-time founder building Proxier, a marketplace where founders hire AI agents built by experts. No co-founder with startup experience, no investors yet.", location: "Madison, WI" },
  { identityId: "dev", displayName: "Dev Patel", field: "Fundraising", credentials: "Former seed-stage VC, raised $14M across two companies", yearsExperience: 10, contactUrl: "https://cal.com/dev-patel", bio: "Sat on the investor side of 1,000+ pitches before starting my own company. I help founders tell a story investors can repeat.", location: "Chicago, IL" },
  { identityId: "priya", displayName: "Priya Nair", field: "Customer discovery", credentials: "Head of product at two YC companies", yearsExperience: 9, contactUrl: "https://cal.com/priya-nair", bio: "Ran more than 500 customer interviews. I teach founders to hear what customers do, not what they say they'll do.", location: "Ann Arbor, MI" },
  { identityId: "luis", displayName: "Luis Ortega", field: "B2B go-to-market", credentials: "First sales hire at three startups", yearsExperience: 12, contactUrl: "https://cal.com/luis-ortega", bio: "Took three companies from zero to their first million in revenue. Founder-led sales is a skill, not a personality.", location: "Minneapolis, MN" },
  { identityId: "hannah", displayName: "Hannah Kim", field: "Startup finance", credentials: "Fractional CFO, CPA", yearsExperience: 8, contactUrl: "https://cal.com/hannah-kim", bio: "Fractional CFO for 30+ seed-stage companies. Runway math, pricing models, and the first finance hire.", location: "Madison, WI" },
  { identityId: "tom", displayName: "Tom Reyes", field: "Product-market fit", credentials: "Former growth lead, 0 to 1M users", yearsExperience: 11, contactUrl: "https://cal.com/tom-reyes", bio: "Led growth at a consumer app from launch to a million users. I help founders measure whether anyone would miss them.", location: "Denver, CO" },
];

function agent(a: Omit<Agent, "systemPromptOverride" | "updatedAt"> & { persona: PersonaForm }): Agent {
  return { ...a, systemPromptOverride: null, updatedAt: a.createdAt };
}

export const AGENTS: Agent[] = [
  agent({
    id: "cynthia-pham-idea-stress-test", slug: "cynthia-pham-idea-stress-test", ownerId: MARIA, icon: "flask-conical",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(20 * DAY), ratingAvg: 4.9, ratingCount: 31, usageCount: 58, createdAt: ago(22 * DAY),
    persona: {
      name: "Cynthia Pham · Idea stress test", category: "health_pt",
      headline: "Pressure-test your startup idea before you build it",
      description: "Tears an idea apart the way an investor or a skeptical first customer would: who has the problem, how often, and what they use today. Answers come from Cynthia's own interview and teardown checklist.",
      howIWork: "Problem first, then the customer, then the market. The product comes last.",
      always: ["Cite the answer or checklist page it came from", "Name the riskiest assumption"],
      never: ["Promise an idea will work", "Give legal or investment advice"],
      exampleQuestions: ["Stress-test my idea: a marketplace where founders hire AI agents built by experts", "Who should my first ten customers be?", "What would make an investor pass on this?"],
      greeting: "Hi, I'm Cynthia's agent. Tell me your idea and I'll poke holes in it the way Cynthia would.",
    },
  }),
  agent({
    id: "dev-patel-fundraising", slug: "dev-patel-fundraising", ownerId: "dev", icon: "presentation",
    status: "published", rateMultiplier: 3, consentAcceptedAt: ago(19 * DAY), ratingAvg: 4.7, ratingCount: 24, usageCount: 47, createdAt: ago(20 * DAY),
    persona: {
      name: "Dev Patel · Fundraising & pitch decks", category: "tax_finance",
      headline: "Pitch decks and pre-seed rounds from a former VC",
      description: "Reviews your deck the way a partner skims it on a Monday morning, and tells you whether to raise now or wait. Built from Dev's interview answers.",
      howIWork: "Traction slide first, then team, then the ask. Everything else supports those three.",
      always: ["Say what an investor would ask next"], never: ["Give securities or legal advice"],
      exampleQuestions: ["Review my pitch deck", "Should we raise a pre-seed now or wait?", "How much should we raise?"],
      greeting: "Hi, I'm Dev's agent. Paste your deck or ask about your round.",
    },
  }),
  agent({
    id: "priya-nair-customer-discovery", slug: "priya-nair-customer-discovery", ownerId: "priya", icon: "users",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(16 * DAY), ratingAvg: 4.9, ratingCount: 19, usageCount: 36, createdAt: ago(17 * DAY),
    persona: {
      name: "Priya Nair · Customer discovery", category: "health_pt",
      headline: "Customer interviews that tell you the truth",
      description: "Writes your interview script, tells you who to talk to, and reads your notes for real buying signals. Built from Priya's 500+ customer interviews.",
      howIWork: "Ask about the last time it happened, never about the future.",
      always: ["Turn advice into questions you can ask tomorrow"], never: ["Treat compliments as validation"],
      exampleQuestions: ["Write five customer interview questions for my idea", "How many interviews do I need?", "How do I know if they'll actually pay?"],
      greeting: "Hi, I'm Priya's agent. Tell me who you think your customer is.",
    },
  }),
  agent({
    id: "luis-ortega-b2b-go-to-market", slug: "luis-ortega-b2b-go-to-market", ownerId: "luis", icon: "trending-up",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(13 * DAY), ratingAvg: 4.6, ratingCount: 15, usageCount: 27, createdAt: ago(14 * DAY),
    persona: {
      name: "Luis Ortega · B2B go-to-market", category: "career_admissions",
      headline: "Founder-led sales from the first hire at three startups",
      description: "Your first ten customers, your first cold email, and your first pricing page. Built from Luis's interview answers.",
      howIWork: "Ten conversations a week until the pattern is obvious.",
      always: ["Give a script you can send today"], never: ["Recommend buying email lists"],
      exampleQuestions: ["Write my first cold email", "How do I find my first ten customers?", "When should I hire a salesperson?"],
      greeting: "Hi, I'm Luis's agent. Who are you trying to sell to?",
    },
  }),
  agent({
    id: "hannah-kim-startup-finance", slug: "hannah-kim-startup-finance", ownerId: "hannah", icon: "piggy-bank",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(10 * DAY), ratingAvg: 4.5, ratingCount: 12, usageCount: 18, createdAt: ago(11 * DAY),
    persona: {
      name: "Hannah Kim · Runway & pricing", category: "tax_finance",
      headline: "Runway math and pricing from a fractional CFO",
      description: "How long your money lasts, what to charge, and which numbers investors will ask for. Built from Hannah's interview answers.",
      howIWork: "Cash first, then burn, then everything else.",
      always: ["Show the math"], never: ["Give tax or legal advice"],
      exampleQuestions: ["How much runway do we have?", "How should we price our first product?", "What metrics will investors ask for?"],
      greeting: "Hi, I'm Hannah's agent. Tell me your monthly burn and I'll start there.",
    },
  }),
  agent({
    id: "tom-reyes-product-market-fit", slug: "tom-reyes-product-market-fit", ownerId: "tom", icon: "target",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(8 * DAY), ratingAvg: 4.8, ratingCount: 21, usageCount: 33, createdAt: ago(9 * DAY),
    persona: {
      name: "Tom Reyes · Product-market fit", category: "career_admissions",
      headline: "Measure whether anyone would miss your product",
      description: "Retention curves, the 40% test, and what to do when growth stalls. Built from Tom's interview answers.",
      howIWork: "Retention before acquisition. A leaky bucket doesn't need more water.",
      always: ["Name the metric to watch"], never: ["Call vanity metrics traction"],
      exampleQuestions: ["How do I know if we have product-market fit?", "Our signups are flat. What do we do?", "Which metrics matter at our stage?"],
      greeting: "Hi, I'm Tom's agent. What does your retention look like?",
    },
  }),
  agent({
    id: "cynthia-pham-first-pricing", slug: "cynthia-pham-first-pricing", ownerId: MARIA, icon: "rocket",
    status: "draft", rateMultiplier: 1, consentAcceptedAt: null, ratingAvg: 0, ratingCount: 0, usageCount: 0, createdAt: ago(DAY),
    persona: {
      name: "Cynthia Pham · Pricing your first product", category: "tax_finance",
      headline: "Charge something from day one",
      description: "How to set a first price, run a price test, and raise it without losing customers.",
      howIWork: "Charge early, charge more than feels comfortable.",
      always: ["Give a number to test"], never: ["Recommend free forever"],
      exampleQuestions: ["What should I charge for my first product?"],
      greeting: "Hi, I'm Cynthia's pricing agent.",
    },
  }),
];

const [MARIA_IDEA, DEV, PRIYA, LUIS, HANNAH, TOM, MARIA_PRICING] = AGENTS.map((a) => a.id);

export const SOURCES: Source[] = [
  { id: "s-maria-interview", agentId: MARIA_IDEA, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 34, pageCount: null, createdAt: ago(21 * DAY) },
  { id: "s-maria-checklist", agentId: MARIA_IDEA, kind: "pdf", name: "Idea-teardown-checklist.pdf", status: "ready", chunkCount: 18, pageCount: 6, createdAt: ago(5 * DAY) },
  { id: "s-dev-interview", agentId: DEV, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 26, pageCount: null, createdAt: ago(19 * DAY) },
  { id: "s-priya-interview", agentId: PRIYA, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 22, pageCount: null, createdAt: ago(16 * DAY) },
  { id: "s-luis-interview", agentId: LUIS, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 17, pageCount: null, createdAt: ago(13 * DAY) },
  { id: "s-hannah-interview", agentId: HANNAH, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 12, pageCount: null, createdAt: ago(10 * DAY) },
  { id: "s-tom-interview", agentId: TOM, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 20, pageCount: null, createdAt: ago(8 * DAY) },
  { id: "s-pricing-interview", agentId: MARIA_PRICING, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 2, pageCount: null, createdAt: ago(DAY) },
];

let chunkSeq = 0;
const interviewChunk = (agentId: string, sourceId: string, question: string, content: string): Chunk =>
  ({ id: `k-${++chunkSeq}`, agentId, sourceId, page: null, headingPath: null, question, content });
const docChunk = (agentId: string, sourceId: string, page: number, headingPath: string, content: string): Chunk =>
  ({ id: `k-${++chunkSeq}`, agentId, sourceId, page, headingPath, question: null, content });

export const CHUNKS: Chunk[] = [
  // Cynthia · Idea stress test
  interviewChunk(MARIA_IDEA, "s-maria-interview", "When a founder pitches you an idea, what do you check first?",
    "The problem, not the product. I ask who had this problem last week, how they solved it, and what that cost them. If the founder can't name three real people who hit the problem in the last month, the idea isn't ready to build."),
  interviewChunk(MARIA_IDEA, "s-maria-interview", "How do you find the riskiest assumption in an idea?",
    "Write down everything that has to be true for the business to work, then circle the one you have the least evidence for. For most student founders it's that the person who has the problem is also the person who pays. Test that one first, before writing any code."),
  interviewChunk(MARIA_IDEA, "s-maria-interview", "Who should a founder's first ten customers be?",
    "People you can reach this week who feel the problem every week. Not your friends, not a market segment on a slide. Ten named people with a phone number. If you can't list them, your go-to-market is the real risk, not your product."),
  interviewChunk(MARIA_IDEA, "s-maria-interview", "What makes an investor pass on an early idea?",
    "Investors pass when the market looks small, the founder can't explain why now, or the product is a feature someone bigger will ship. You fix the first with a bottom-up market size, the second with a real change in the world, and the third with a wedge the big player doesn't care about."),
  docChunk(MARIA_IDEA, "s-maria-checklist", 2, "Teardown › Problem",
    "Problem check: frequency (weekly or better), severity (they already pay or hack around it), and reachability (you can talk to ten of them in seven days). Fail any two and stop."),
  docChunk(MARIA_IDEA, "s-maria-checklist", 4, "Teardown › Market",
    "Size the market bottom-up: number of customers you can name a channel for, times what one of them would pay per year. A top-down \"1% of a $10B market\" slide is a red flag, not a market size."),
  // Dev · Fundraising
  interviewChunk(DEV, "s-dev-interview", "What do you look at first in a pitch deck?",
    "The traction slide, then the team slide, then the ask. A partner decides in about three minutes whether to keep reading. If traction is buried on slide nine, move it to slide two, even if the numbers are small. Small and growing beats big and flat."),
  interviewChunk(DEV, "s-dev-interview", "When should a founder raise a pre-seed round?",
    "Raise when money buys a specific milestone you can't reach without it, like a first paid pilot or a technical hire. If you can reach the next milestone on savings and a part-time job, wait. You'll raise on better terms with evidence."),
  interviewChunk(DEV, "s-dev-interview", "How much should a first-time founder raise?",
    "Enough for 18 to 24 months of runway to hit the milestones that make the next round easy. Work backwards from those milestones and your monthly burn, then add 20 percent for the surprises. Don't raise a number because a friend did."),
  // Priya · Customer discovery
  interviewChunk(PRIYA, "s-priya-interview", "What are good customer interview questions?",
    "Ask about the past, never the future. \"Tell me about the last time you had to schedule a meeting for your club.\" \"What did you use?\" \"What was annoying about it?\" \"What did that cost you?\" \"Who else was involved?\" Never ask \"would you use this?\" because everyone says yes."),
  interviewChunk(PRIYA, "s-priya-interview", "How many customer interviews do you need?",
    "Keep going until you can predict what the next person will say. For one customer segment that's usually 15 to 20 conversations. If every interview still surprises you, your segment is too broad."),
  interviewChunk(PRIYA, "s-priya-interview", "How do you know if a customer will actually pay?",
    "Ask for something that costs them: a pre-order, a letter of intent, an hour of their time to pilot it. Compliments are free and mean nothing. A customer who pays for a hack solution today is the strongest signal you'll get."),
  // Luis · Go-to-market
  interviewChunk(LUIS, "s-luis-interview", "How do you write a first cold email?",
    "Three sentences. One about them, specific enough that it couldn't be sent to anyone else. One about the problem you've seen people like them have. One small ask: fifteen minutes to learn how they handle it today. No attachments, no deck, no pricing."),
  interviewChunk(LUIS, "s-luis-interview", "How do you find your first ten customers?",
    "Go where they already gather and do the selling yourself. For student organizations that's the org fair, the student government office, and the advisors who approve room bookings. Founders should close the first ten customers personally, because that's how you learn the pitch."),
  interviewChunk(LUIS, "s-luis-interview", "When should a startup hire its first salesperson?",
    "After the founder has closed at least ten customers with a repeatable pitch. A salesperson scales a process, they don't invent one. Hire too early and you'll blame the hire for a product problem."),
  // Hannah · Finance
  interviewChunk(HANNAH, "s-hannah-interview", "How do you calculate runway?",
    "Cash in the bank divided by net monthly burn, which is what goes out minus what comes in. Recalculate every month. When runway drops under nine months you should already be fundraising or cutting."),
  interviewChunk(HANNAH, "s-hannah-interview", "How should a startup price its first product?",
    "Price from the value to the customer, not your costs. Pick a number that makes you slightly nervous, test it with the next five customers, and raise it until someone says no. If nobody pushes back on price, it's too low."),
  interviewChunk(HANNAH, "s-hannah-interview", "What metrics will investors ask for?",
    "Monthly revenue and its growth rate, burn, runway, and retention by cohort. Have them in one spreadsheet you can share in a minute. Being fast and consistent with your numbers is itself a signal."),
  // Tom · PMF
  interviewChunk(TOM, "s-tom-interview", "How do you know if you have product-market fit?",
    "Ask your active users how they'd feel if they could no longer use the product. If 40 percent or more say very disappointed, you're close. Then look at retention: if the curve flattens instead of going to zero, some group of people truly needs you."),
  interviewChunk(TOM, "s-tom-interview", "What should a founder do when signups are flat?",
    "Stop working on acquisition and look at who stayed. Interview your five most active users, find what they have in common, and rebuild your onboarding and your message around them. Growth comes from the people who already love you."),
  interviewChunk(TOM, "s-tom-interview", "Which metrics matter at the earliest stage?",
    "Weekly active users and week-four retention. Ignore total signups and page views, those are vanity metrics. One number that goes up because people come back is worth more than ten that go up because you posted on social media."),
  // Cynthia · Pricing (draft)
  interviewChunk(MARIA_PRICING, "s-pricing-interview", "What's the first rule of pricing a new product?",
    "Charge from day one. Free users tell you what they like, paying users tell you what they need. Even a small price filters for the customers who actually have the problem."),
];

const [MC1, MC2, MC3, MC4] = CHUNKS;

export const INTERVIEW_TURNS: InterviewTurn[] = [
  { id: "t-maria-1", agentId: MARIA_IDEA, position: 1, question: "Let's start with what founders bring you most. When someone pitches you an idea, what do you actually check first?", answer: MC1.content, createdAt: ago(21 * DAY) },
  { id: "t-maria-2", agentId: MARIA_IDEA, position: 2, question: "You said you look for three real people who hit the problem last month. How do you find the riskiest assumption in an idea?", answer: MC2.content, createdAt: ago(21 * DAY - 3) },
  { id: "t-maria-3", agentId: MARIA_IDEA, position: 3, question: "Where does that advice break? What makes an investor pass even when the problem is real?", answer: MC4.content, createdAt: ago(21 * DAY - 6) },
  { id: "t-pricing-1", agentId: MARIA_PRICING, position: 1, question: "What's the first rule you give founders about pricing a new product?", answer: CHUNKS.at(-1)!.content, createdAt: ago(DAY) },
  { id: "t-pricing-2", agentId: MARIA_PRICING, position: 2, question: "Walk me through a founder who priced too low. What did you notice, and what did you tell them to do?", answer: null, createdAt: ago(DAY - 4) },
];

export const INTERVIEW_ANSWER_COUNTS: Record<string, number> = { [MARIA_IDEA]: 34, [MARIA_PRICING]: 2 };

export const CONVERSATIONS: Conversation[] = [
  { id: "c-proxier-stress-test", agentId: MARIA_IDEA, hirerId: SAM, title: "Stress-test Proxier", shareTranscript: false, createdAt: ago(40) },
  { id: "c-preseed-timing", agentId: DEV, hirerId: SAM, title: "Raise now or wait?", shareTranscript: true, createdAt: ago(DAY + 20) },
  { id: "c-interview-script", agentId: PRIYA, hirerId: SAM, title: "Customer interview script", shareTranscript: false, createdAt: ago(3 * DAY + 25) },
  { id: "c-first-customers", agentId: MARIA_IDEA, hirerId: "jordan", title: "First ten customers for a B2B tool", shareTranscript: true, createdAt: ago(4 * DAY + 30) },
  { id: "c-investor-pass", agentId: MARIA_IDEA, hirerId: "alex", title: "Why investors keep passing", shareTranscript: false, createdAt: ago(2 * DAY + 15) },
];

/** A citation to the expert's own published piece (lib/demo-backend/media.ts), opened inside the app. */
const pub = (n: number, id: string): Citation => {
  const item = mediaById(id)!;
  return { n, chunkId: null, sourceType: "document", sourceName: `${item.kind} · ${item.outlet}`, question: null, page: null, headingPath: item.title, url: `/sources/${id}` };
};
const cite = (n: number, c: Chunk): Citation => ({
  n, chunkId: c.id, sourceType: c.question ? "interview" : "document",
  sourceName: c.question ? "Interview answers" : "Idea-teardown-checklist.pdf",
  question: c.question, page: c.page, headingPath: c.headingPath,
});

let msgSeq = 0;
function msg(conversationId: string, role: "user" | "assistant", content: string, minutesAgo: number, extra: Partial<Message> = {}): Message {
  msgSeq += 1;
  return { id: `m-${msgSeq}`, conversationId, role, content, citations: [], feedback: null, costCents: null, createdAt: ago(minutesAgo), ...extra };
}

const [DV1, DV2, DV3, PR1, PR2] = CHUNKS.slice(6, 11);

export const MESSAGES: Message[] = [
  msg("c-proxier-stress-test", "user", "Stress-test my idea: a marketplace where founders hire AI agents built by experts", 40),
  msg("c-proxier-stress-test", "assistant",
    "Cynthia would start with the problem, not the product [1]. Before building more of Proxier, name three first-time founders who needed expert advice last month and ask how they got it and what it cost them.\n\nThe riskiest assumption here is that the person with the problem is the person who pays [2]. Founders feel the pain, but early founders have little cash. The budget might sit with an accelerator, a university program, or the experts who want the distribution. Find out who pays this week.\n\nOn Cynthia's checklist, frequency and reachability pass easily: founders make decisions every week and you can reach ten of them at one campus pitch night [3]. Severity is the open question. If they're coping fine with ChatGPT and one mentor's calendar link, that's your real competitor.\n\nCynthia goes deeper on this in the essay \"Circle the assumption you can't prove\" [4].",
    39, { citations: [cite(1, MC1), cite(2, MC2), cite(3, CHUNKS[4]), pub(4, "cynthia-circle-the-assumption")], feedback: "up", costCents: 4 }),
  msg("c-proxier-stress-test", "user", "What would make an investor pass on this?", 30),
  msg("c-proxier-stress-test", "assistant",
    "In Cynthia's experience investors pass for three reasons: a market that looks small, no answer to \"why now,\" or a product that's a feature a bigger company will ship [1]. Proxier has a clear why-now, since agents can finally answer from an expert's own knowledge. The real risk is the third reason. Size it bottom-up from founders you can reach rather than as a percentage of the consulting market [2], and lead with the wedge a general AI assistant won't copy: answers from named experts, with citations.\n\nA good test before your next investor meeting: write one sentence for each of the three reasons and see which one you can't back with evidence yet. Cynthia walks through that exercise in the essay \"Circle the assumption you can't prove\" [3].",
    29, { citations: [cite(1, MC4), cite(2, CHUNKS[5]), pub(3, "cynthia-circle-the-assumption")], costCents: 4 }),
  msg("c-proxier-stress-test", "user", "Who should my first ten customers be?", 21),
  msg("c-proxier-stress-test", "assistant",
    "Ten named people you can reach this week who feel the problem every week [1]. For Proxier that's ten founders in your campus accelerator cohort, not \"early-stage startups\" as a segment. If you can't write down their names and numbers today, finding customers is the real risk, not the product.\n\nOnce you have the list, call all ten in the same week so you can compare answers while they're fresh. Cynthia tells the story of three founders who did exactly that in the talk \"Ten names before code\" [2].",
    20, { citations: [cite(1, MC3), pub(2, "cynthia-ten-names-before-code")], feedback: "up", costCents: 4 }),

  msg("c-preseed-timing", "user", "Should we raise a pre-seed now or wait?", DAY + 20),
  msg("c-preseed-timing", "assistant",
    "Dev's rule: raise when money buys a specific milestone you can't reach without it, like a first paid pilot or a key hire [1]. If you can reach the next milestone on savings and part-time work, wait and raise on better terms with evidence. When you do raise, plan for 18 to 24 months of runway, plus 20 percent for surprises [2].\n\nThe test Dev uses: write down the milestone that would make your next round easy, then ask whether savings, a part-time job, or early revenue can get you there. If they can, waiting is the cheaper way to raise. Dev goes deeper on this in the essay \"Raise for a milestone, not a feeling\" [3].",
    DAY + 18, { citations: [cite(1, DV2), cite(2, DV3), pub(3, "dev-raise-for-a-milestone")], feedback: "up", costCents: 6 }),
  msg("c-preseed-timing", "user", "We have 40 founders on a waitlist but no revenue.", DAY + 5),
  msg("c-preseed-timing", "assistant",
    "Then put that waitlist on slide two. Dev says a partner decides in about three minutes, and small but growing traction beats a polished vision [1]. Convert five of those founders into paying users before you pitch; that's the milestone that makes the round easy.\n\nShow the waitlist as a weekly growth line rather than a single number, and name two or three of the founders on it if they'll let you. Dev breaks down how partners read that slide in the podcast episode \"Episode 41: What partners read first\" [2].",
    DAY, { citations: [cite(1, DV1), pub(2, "dev-what-partners-read-first")], costCents: 6 }),

  msg("c-interview-script", "user", "Write five customer interview questions for my idea", 3 * DAY + 25),
  msg("c-interview-script", "assistant",
    "Priya's rule is to ask about the past, never the future [1]:\n\n1. Tell me about the last time you had to make a big decision for your startup.\n2. Who did you ask for advice?\n3. What was frustrating about getting it?\n4. What did it cost you, in time or money?\n5. What did you end up doing?\n\nDon't ask \"would you use this?\" Everyone says yes.\n\nPriya explains why future questions mislead in the newsletter \"Stop asking customers about the future\" [2].",
    3 * DAY + 23, { citations: [cite(1, PR1), pub(2, "priya-stop-asking-about-the-future")], costCents: 4 }),
  msg("c-interview-script", "user", "How many of these interviews do I need?", 3 * DAY + 2),
  msg("c-interview-script", "assistant",
    "Keep going until you can predict what the next person will say, usually 15 to 20 conversations for one segment [1]. If every interview still surprises you, narrow the segment.\n\nWrite the three answers you keep hearing at the top of your notes after each call; when the next five calls add nothing new, you're done. More in the newsletter \"Stop asking customers about the future\" [2].",
    3 * DAY, { citations: [cite(1, PR2), pub(2, "priya-stop-asking-about-the-future")], costCents: 4 }),

  msg("c-first-customers", "user", "Who should my first ten customers be for a B2B analytics tool?", 4 * DAY + 30),
  msg("c-first-customers", "assistant",
    "Ten named people you can reach this week who feel the problem every week [1]. Write the list before you write more code.",
    4 * DAY + 28, { citations: [cite(1, MC3)], costCents: 4 }),

  msg("c-investor-pass", "user", "Three investors passed and said it's too early. What does that mean?", 2 * DAY + 15),
  msg("c-investor-pass", "assistant",
    "Usually one of Cynthia's three reasons: the market looks small, there's no clear why-now, or the product looks like a feature [1]. \"Too early\" often means they can't see the market size yet.",
    2 * DAY, { citations: [cite(1, MC4)], costCents: 4 }),
];

let ledgerSeq = 0;
function row(identityId: string | null, kind: LedgerEntry["kind"], amountCents: number, minutesAgo: number, note: string, extra: Partial<LedgerEntry> = {}): LedgerEntry {
  ledgerSeq += 1;
  return { id: `l-seed-${ledgerSeq}`, identityId, kind, amountCents, balanceAfter: null, purpose: null, refType: null, refId: null, note, createdAt: ago(minutesAgo), ...extra };
}
const chat = (conversationId: string) => ({ purpose: "chat_message" as const, refType: "conversation" as const, refId: conversationId });

// Per conversation: hirer debit = platform cost + platform margin + expert earnings.
const rawLedger: LedgerEntry[] = [
  row(MARIA, "seed", 2000, 25 * DAY, "Starting balance"),
  row(MARIA, "subscription", 2000, 14 * DAY, "Mock monthly plan · no payment taken"),
  row(MARIA, "debit", -9, 5 * DAY, "Idea-teardown-checklist.pdf · 18 chunks", { purpose: "embedding", refType: "source", refId: "s-maria-checklist" }),
  row(MARIA, "debit", -68, 5 * DAY - 120, "Idea stress test interview · 34 answers", { purpose: "interview_turn", refType: "interview", refId: MARIA_IDEA }),
  row(MARIA, "earnings", 3, 4 * DAY, "First ten customers for a B2B tool · net", { refType: "conversation", refId: "c-first-customers" }),
  row(MARIA, "debit", -6, 3 * DAY, "Sandbox · 2 test messages", { purpose: "sandbox_message", refType: "agent", refId: MARIA_IDEA }),
  row(MARIA, "earnings", 3, 2 * DAY, "Why investors keep passing · net", { refType: "conversation", refId: "c-investor-pass" }),
  row(MARIA, "debit", -4, DAY, "Pricing interview · 2 answers", { purpose: "interview_turn", refType: "interview", refId: MARIA_PRICING }),
  row(MARIA, "earnings", 5, 19, "Stress-test Proxier · net", { refType: "conversation", refId: "c-proxier-stress-test" }),
  row(SAM, "seed", 2000, 25 * DAY, "Starting balance"),
  row(SAM, "subscription", 2000, 14 * DAY, "Mock monthly plan · no payment taken"),
  row(SAM, "pack", 1000, 6 * DAY, "Mock credit pack · no payment taken"),
  row(SAM, "debit", -8, 3 * DAY, "Priya Nair · Customer discovery · 2 messages", chat("c-interview-script")),
  row(SAM, "debit", -12, DAY, "Dev Patel · Fundraising & pitch decks · 2 messages", chat("c-preseed-timing")),
  row(SAM, "debit", -12, 20, "Cynthia Pham · Idea stress test · 3 messages", chat("c-proxier-stress-test")),
  ...["dev", "priya", "luis", "hannah", "tom", "jordan", "alex"].map((id) => row(id, "seed", 5000, 25 * DAY, "Starting balance")),
  row("jordan", "debit", -4, 4 * DAY + 10, "Cynthia Pham · Idea stress test · 1 message", chat("c-first-customers")),
  row("alex", "debit", -4, 2 * DAY + 10, "Cynthia Pham · Idea stress test · 1 message", chat("c-investor-pass")),
  row("dev", "earnings", 7, DAY, "Raise now or wait? · net", { refType: "conversation", refId: "c-preseed-timing" }),
  row("priya", "earnings", 4, 3 * DAY, "Customer interview script · net", { refType: "conversation", refId: "c-interview-script" }),
  row(null, "platform_cost", 6, 19, "Raw LLM cost", chat("c-proxier-stress-test")),
  row(null, "platform_margin", 1, 19, "15% of margin", chat("c-proxier-stress-test")),
  row(null, "platform_cost", 4, DAY, "Raw LLM cost", chat("c-preseed-timing")),
  row(null, "platform_margin", 1, DAY, "15% of margin", chat("c-preseed-timing")),
  row(null, "platform_cost", 4, 3 * DAY, "Raw LLM cost", chat("c-interview-script")),
  row(null, "platform_cost", 1, 4 * DAY, "Raw LLM cost", chat("c-first-customers")),
  row(null, "platform_cost", 1, 2 * DAY, "Raw LLM cost", chat("c-investor-pass")),
];

/** Running balances per identity, in time order, so every wallet equals the sum of its rows. */
export const LEDGER: LedgerEntry[] = (() => {
  const balances = new Map<string, number>();
  return [...rawLedger].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((entry) => {
    if (!entry.identityId) return entry;
    const next = (balances.get(entry.identityId) ?? 0) + entry.amountCents;
    balances.set(entry.identityId, next);
    return { ...entry, balanceAfter: next };
  });
})();

export const FLAGS: Flag[] = [
  { id: "f-seed-1", targetType: "agent", agentId: LUIS, conversationId: null,
    reason: "Inaccurate or unsafe advice: Suggested emailing every professor in the department", reporterId: "alex", status: "open", createdAt: ago(2 * DAY) },
  { id: "f-seed-2", targetType: "agent", agentId: HANNAH, conversationId: null,
    reason: "Spam or advertising: Kept mentioning one bookkeeping app", reporterId: "riley", status: "resolved",
    createdAt: ago(5 * DAY), resolvedAt: ago(4 * DAY), resolutionNote: "Reviewed: general guidance, no product placement." },
];

export const REVIEWS: Review[] = [
  { id: "r-seed-1", agentId: MARIA_IDEA, reviewerId: "jordan", stars: 5, comment: "Found the hole in our idea in two messages: the people with the problem weren't the ones with a budget. Saved us a semester of building.", createdAt: ago(18 * DAY) },
  { id: "r-seed-2", agentId: MARIA_IDEA, reviewerId: "alex", stars: 5, comment: null, createdAt: ago(9 * DAY) },
  { id: "r-seed-3", agentId: MARIA_IDEA, reviewerId: "riley", stars: 5, comment: "Every answer cites Cynthia's own words or the teardown checklist, so I actually trusted it enough to change our plan.", createdAt: ago(2 * DAY) },
  { id: "r-seed-4", agentId: DEV, reviewerId: "riley", stars: 5, comment: "Moved our traction slide to slide two and got two second meetings the next week.", createdAt: ago(15 * DAY) },
  { id: "r-seed-5", agentId: DEV, reviewerId: "morgan", stars: 4, comment: null, createdAt: ago(7 * DAY) },
  { id: "r-seed-6", agentId: DEV, reviewerId: "casey", stars: 5, comment: "Told us to wait three months and raise with pilots. Best advice we got.", createdAt: ago(1 * DAY) },
  { id: "r-seed-7", agentId: PRIYA, reviewerId: "alex", stars: 5, comment: "The interview script alone was worth it. Customers finally told us what they actually do.", createdAt: ago(12 * DAY) },
  { id: "r-seed-8", agentId: PRIYA, reviewerId: "morgan", stars: 5, comment: null, createdAt: ago(6 * DAY) },
  { id: "r-seed-9", agentId: LUIS, reviewerId: "jordan", stars: 5, comment: "The three-sentence cold email got a 30% reply rate from club advisors.", createdAt: ago(10 * DAY) },
  { id: "r-seed-10", agentId: LUIS, reviewerId: "casey", stars: 4, comment: null, createdAt: ago(2 * DAY) },
  { id: "r-seed-11", agentId: HANNAH, reviewerId: "alex", stars: 4, comment: "Runway math with real numbers, not a template.", createdAt: ago(8 * DAY) },
  { id: "r-seed-12", agentId: HANNAH, reviewerId: "riley", stars: 5, comment: null, createdAt: ago(4 * DAY) },
  { id: "r-seed-13", agentId: TOM, reviewerId: "jordan", stars: 5, comment: "Stopped us from buying ads and made us talk to our five best users instead.", createdAt: ago(6 * DAY) },
  { id: "r-seed-14", agentId: TOM, reviewerId: "morgan", stars: 4, comment: "Clear on which metrics matter at our stage.", createdAt: ago(1 * DAY) },
];

// Twenty more marketplace experts ----------------------------------------------------------------
// Appended after the records above so their positional lookups (AGENTS.map, CHUNKS.at(-1)) are unchanged.

type ExpertSeed = {
  id: string;
  name: string;
  color: string;
  profile: Pick<Profile, "field" | "credentials" | "yearsExperience" | "bio" | "location">;
  agent: Omit<PersonaForm, "name"> & { topic: string; icon: string; rate: number; rating: number; ratings: number; usage: number; days: number };
  chunkCount: number;
  interview: [question: string, answer: string][];
  reviews: [reviewerId: string, stars: ReviewStars, comment: string | null, daysAgo: number][];
};

const MORE_EXPERTS: ExpertSeed[] = [
  // Validation & research
  {
    id: "marcus", name: "Marcus Bell", color: "#7a3d12",
    profile: { field: "Product analytics", credentials: "Former head of data at a Series B SaaS company", yearsExperience: 11, location: "Seattle, WA",
      bio: "Built the analytics stack at two SaaS companies, from the first tracked event to the board deck. I help founders track the five events that matter and ignore the other five hundred." },
    agent: { topic: "Product analytics", icon: "chart-line", category: "health_pt", rate: 2, rating: 4.7, ratings: 18, usage: 41, days: 34,
      headline: "Track the few events that tell you what users actually do",
      description: "Picks the handful of events worth tracking, sets up your first activation funnel, and reads your dashboards for real signal. Built from Marcus's interview answers on instrumenting early products.",
      howIWork: "Define activation first, then instrument only what explains it.",
      always: ["Name the exact event and property to track", "Tie every metric to a decision"],
      never: ["Recommend tracking everything just in case", "Treat page views as engagement"],
      exampleQuestions: ["What events should I track first?", "How do I define activation for my product?", "Which analytics tool should an early startup use?"],
      greeting: "Hi, I'm Marcus's agent. Tell me what your product does and I'll help you pick the events worth tracking." },
    chunkCount: 16,
    interview: [
      ["What events should an early startup track first?",
        "Five, not five hundred. Sign up, the first time someone does the core action, the moment they get value, invite or share, and coming back in week two. For a scheduling tool that's account created, first event scheduled, first attendee confirms, second organizer invited, and a meeting scheduled in week two. Every other event is noise until those five are clean."],
      ["How do you define activation for a new product?",
        "Activation is the smallest action that predicts someone sticks around. Pull the users who were still active after 30 days and look for what they did in their first week that churned users didn't. At one company it was connecting a calendar within 24 hours: 62 percent of the people who did it were still around a month later, versus 9 percent who didn't. That became the only onboarding goal."],
      ["Which analytics tool should an early startup use?",
        "Whatever gets you a funnel and a retention chart this week. PostHog or Mixpanel on the free tier is plenty until you have thousands of users. The tool matters far less than a written tracking plan: a one-page sheet with every event name, what triggers it, and which question it answers. Without that sheet, any analytics tool turns into a junk drawer."],
    ],
    reviews: [["jordan", 5, "Cut our tracking plan from 60 events to 6. Our funnel finally made sense.", 20], ["casey", 4, null, 6]],
  },
  {
    id: "wei", name: "Wei Zhang", color: "#155e6b",
    profile: { field: "Technical architecture", credentials: "Staff engineer, former CTO at a seed-stage fintech", yearsExperience: 14, location: "San Francisco, CA",
      bio: "Wrote the first line of code at two startups and scaled one to 2 million users. I review early architecture so founders don't have to rebuild everything at Series A." },
    agent: { topic: "Architecture review", icon: "server", category: "health_pt", rate: 3, rating: 4.8, ratings: 22, usage: 39, days: 45,
      headline: "An architecture review before your stack becomes a rewrite",
      description: "Reviews your stack, data model and hosting choices the way a CTO would before a seed round's technical diligence. Built from Wei's interview answers on early-stage engineering.",
      howIWork: "Boring technology first. Spend the innovation budget on the product, not the infrastructure.",
      always: ["Name the simplest option that works for the next 12 months", "Flag what will be expensive to change later"],
      never: ["Recommend microservices before product-market fit", "Pick a tool because it's trending"],
      exampleQuestions: ["Review my tech stack for an MVP", "Do I need microservices?", "How should I design my database schema?"],
      greeting: "Hi, I'm Wei's agent. Describe your stack and what you're building, and I'll review it the way a CTO would." },
    chunkCount: 21,
    interview: [
      ["What tech stack should an MVP use?",
        "One language, one framework, one managed Postgres database, and a hosting platform that deploys from git. Next.js or Rails on Vercel, Render or Fly, with Postgres from Supabase or Neon, gets a two-person team to its first thousand users without an ops hire. If your stack needs a diagram with more than four boxes before you have customers, it's too complicated."],
      ["When does a startup need microservices?",
        "Almost never before 20 engineers. Microservices solve a team coordination problem, not a scaling problem. A single well-organized monolith with clear modules handles more traffic than most seed companies will ever see. I've watched two startups lose six months splitting a monolith that was serving 300 users."],
      ["How should you design a database schema early on?",
        "Model the real nouns in your business and keep them in one Postgres database with foreign keys. Add created_at and updated_at to every table, use UUIDs for anything exposed in a URL, and never store money as a float. The schema mistakes that hurt later are missing constraints, not missing scale."],
    ],
    reviews: [["riley", 5, "Talked us out of Kubernetes for a 40-user beta. We shipped two weeks later.", 30], ["morgan", 5, null, 12], ["alex", 4, "Clear on which decisions are expensive to undo.", 4]],
  },
  {
    id: "sofia", name: "Sofia Alvarez", color: "#6b2a70",
    profile: { field: "Product & UX design", credentials: "Design lead at two consumer apps, former agency designer", yearsExperience: 10, location: "Austin, TX",
      bio: "Designed onboarding for apps used by millions and ran usability tests every week for a decade. I help founders find where users get stuck before they spend money on growth." },
    agent: { topic: "UX & design review", icon: "pen-tool", category: "health_pt", rate: 2, rating: 4.6, ratings: 14, usage: 26, days: 28,
      headline: "Find where users get stuck, with a designer's eye",
      description: "Reviews your onboarding, landing page and core flow for friction, and shows you how to run a five-person usability test this week. Built from Sofia's interview answers.",
      howIWork: "Watch five people use it before changing a single pixel.",
      always: ["Point to the exact screen and step causing friction", "Suggest a test you can run in a day"],
      never: ["Redesign for looks alone", "Trust what users say over what they do"],
      exampleQuestions: ["Review my onboarding flow", "How do I run a usability test?", "What makes a landing page convert?"],
      greeting: "Hi, I'm Sofia's agent. Walk me through your onboarding screen by screen." },
    chunkCount: 15,
    interview: [
      ["How do you review an onboarding flow?",
        "I count the steps between signing up and the first moment of value, then try to cut half of them. Every form field, permission request and tour screen before value costs you users. For most early products the fix is to let people do the core action first and ask for account details after. One app I worked on moved signup to after the first result, and onboarding completion went from 31 to 58 percent."],
      ["How do you run a usability test with no budget?",
        "Five people, one task, thirty minutes each. Give them a real goal, like schedule a meeting for your club next Tuesday, then stay quiet and watch. Ask them to think out loud and write down every place they hesitate for more than three seconds. Five sessions find most of the big problems, and you can recruit testers straight from your own waitlist."],
      ["What makes a landing page convert?",
        "A headline that says who it's for and what changes for them, one screenshot of the product doing that thing, and one button. Most early landing pages list features instead. Replace the feature grid with a before-and-after for a single user, and put the call to action above the fold and again at the bottom of the page."],
    ],
    reviews: [["alex", 5, "Watched five users try our signup like Sofia's agent suggested. Three of them got lost on the same screen.", 16], ["jordan", 4, null, 5]],
  },
  {
    id: "grace", name: "Grace Adeyemi", color: "#6b5a12",
    profile: { field: "Brand & positioning", credentials: "Former VP of marketing, positioned three B2B startups through Series A", yearsExperience: 13, location: "Brooklyn, NY",
      bio: "Wrote the positioning for three B2B startups that went on to raise Series A rounds. I help founders explain what they do in one sentence a customer would repeat." },
    agent: { topic: "Brand & positioning", icon: "megaphone", category: "health_pt", rate: 3, rating: 4.8, ratings: 20, usage: 44, days: 52,
      headline: "Explain what you do in one sentence customers repeat",
      description: "Works through your competitive alternatives, the value only you deliver and the customer who cares most, then writes a positioning statement and homepage headline. Built from Grace's interview answers.",
      howIWork: "Start from what customers would use if you didn't exist.",
      always: ["Write the one-line positioning statement", "Name the competitive alternative"],
      never: ["Use buzzwords like all-in-one or seamless", "Position against a competitor nobody has heard of"],
      exampleQuestions: ["Write a positioning statement for my startup", "How do I stand out from bigger competitors?", "Should my startup's name describe what we do?"],
      greeting: "Hi, I'm Grace's agent. Tell me what your customers use today instead of you." },
    chunkCount: 19,
    interview: [
      ["How do you write a positioning statement?",
        "Start with the competitive alternative, the thing customers would use if you didn't exist. For most student tools that's a group chat plus a shared spreadsheet. Then list what you do that the alternative can't, who cares most about that difference, and the category that makes the value obvious. The statement reads: for this customer who has this struggle, our product is a category that delivers this value, unlike the alternative."],
      ["How does a small startup stand out from bigger competitors?",
        "Pick a customer the big company treats as an afterthought and be obsessively better for them. A big calendar product serves everyone, so it will never build dues tracking or room approvals for student clubs. Narrow positioning feels risky, but it's the only way a two-person team gets remembered. You can widen it once you own the niche."],
      ["Should a startup name describe what it does?",
        "Early on, the tagline does the describing, not the name. Pick a short name that's easy to say, spell and search, with a domain you can actually get, and pair it with a plain descriptive line like scheduling for student organizations. Descriptive names box you in when you expand, and nobody remembers them anyway."],
    ],
    reviews: [["morgan", 5, "Our homepage headline went from 'all-in-one platform' to a line customers actually repeated back to us.", 25], ["riley", 5, null, 9], ["casey", 4, null, 3]],
  },
  {
    id: "rohan", name: "Rohan Mehta", color: "#3f5c12",
    profile: { field: "Marketplaces", credentials: "Co-founder of a tutoring marketplace (acquired), former marketplace PM", yearsExperience: 12, location: "Philadelphia, PA",
      bio: "Co-founded a tutoring marketplace that grew to 40,000 sessions a month before it was acquired. I help founders solve the chicken-and-egg problem one campus and one category at a time." },
    agent: { topic: "Marketplace dynamics", icon: "store", category: "health_pt", rate: 3, rating: 4.5, ratings: 11, usage: 23, days: 40,
      headline: "Solve chicken-and-egg before it solves you",
      description: "Which side to build first, how small to start, and the liquidity numbers that show a marketplace is working. Built from Rohan's interview answers from building and selling a two-sided marketplace.",
      howIWork: "Constrain the market until supply meets demand, then expand.",
      always: ["Say which side to seed first and how", "Name the liquidity metric to watch"],
      never: ["Launch nationwide on day one", "Count listings as traction"],
      exampleQuestions: ["Which side of my marketplace should I build first?", "How do I measure marketplace liquidity?", "When should a marketplace start charging fees?"],
      greeting: "Hi, I'm Rohan's agent. Tell me who's buying and who's selling on your marketplace." },
    chunkCount: 14,
    interview: [
      ["Which side of a marketplace should you build first?",
        "Supply, almost always, and you get it by hand. We recruited our first 50 tutors one coffee at a time and guaranteed them paid hours for the first month. Then we limited demand to one campus so every student search returned good matches. The harder side is the one you seed manually; the easier side follows once the experience is good."],
      ["How do you measure marketplace liquidity?",
        "Search-to-fill rate: out of every request, how many get matched within a reasonable time. Below 50 percent, buyers stop coming back. We tracked it per campus and per subject and didn't open a new campus until the current one sat above 70 percent for a month. Total listings is a vanity number; fill rate is the truth."],
      ["When should a marketplace start charging fees?",
        "Charge a take rate from the first transaction, but keep it low until you add value beyond the introduction. If you only make the match, people take the relationship off-platform after the first booking. We started at 10 percent and earned the right to charge 20 by adding scheduling, payments and a satisfaction guarantee."],
    ],
    reviews: [["jordan", 4, "Stopped us from launching in five cities at once. One campus, one subject first.", 22], ["alex", 5, null, 8]],
  },
  {
    id: "jasmine", name: "Jasmine Wu", color: "#7a2e2e",
    profile: { field: "Retention & engagement", credentials: "Former lifecycle lead at a consumer subscription app", yearsExperience: 9, location: "Portland, OR",
      bio: "Cut monthly churn from 11 percent to 4 percent at a subscription app with three million users. I help founders find out why people leave and what brings them back." },
    agent: { topic: "Retention & churn", icon: "repeat", category: "health_pt", rate: 2, rating: 4.7, ratings: 16, usage: 31, days: 19,
      headline: "Find out why users leave and what brings them back",
      description: "Reads your retention cohorts, finds the moment users drop off, and plans churn interviews and win-back emails. Built from Jasmine's interview answers.",
      howIWork: "Cohorts before campaigns. Find where the curve drops, then ask the people who dropped.",
      always: ["Look at retention by signup cohort", "Suggest one experiment to run this week"],
      never: ["Blame churn on price without talking to churned users", "Spam users with re-engagement emails"],
      exampleQuestions: ["How do I read a retention cohort chart?", "Why are users churning after the first week?", "How do I run churn interviews?"],
      greeting: "Hi, I'm Jasmine's agent. What does week-one retention look like for your newest users?" },
    chunkCount: 13,
    interview: [
      ["How do you read a retention cohort chart?",
        "Each row is a group of users who signed up in the same week, and each column is how many were still active one, two, four and eight weeks later. You're looking for two things: does the curve flatten instead of sliding to zero, and are newer cohorts retaining better than older ones. If the curve flattens at 20 percent or above for a weekly-use product, you have a core that stays."],
      ["Why do users churn after the first week?",
        "Usually because they never reached the first moment of value, not because they tried the product and disliked it. In our data, 70 percent of week-one churn came from people who never completed a single core action. Fix activation before anything else: shorten the path to the first win and nudge the people who stall on day two."],
      ["How do you run churn interviews?",
        "Email everyone who cancelled or went quiet in the last 30 days and offer a 15-minute call, with a gift card if you can afford it. Ask what they were hoping the product would do, what happened the last time they used it, and what they use now instead. Around one in ten will say yes, and five of those calls tell you more than any churn dashboard."],
    ],
    reviews: [["casey", 5, "Churn interviews showed people never scheduled a second meeting. We fixed onboarding, not pricing.", 11], ["morgan", 4, null, 3]],
  },
  {
    id: "elena", name: "Elena Petrova", color: "#3a4250",
    profile: { field: "Hardware & deep tech", credentials: "PhD in materials science, co-founder of a battery hardware startup", yearsExperience: 15, location: "Boston, MA",
      bio: "Took a lab battery technology from a university patent to paid pilots with two automotive suppliers. I help technical founders turn research into something a customer will buy." },
    agent: { topic: "Deep-tech go-to-market", icon: "cpu", category: "health_pt", rate: 4, rating: 4.9, ratings: 9, usage: 17, days: 57,
      headline: "From lab prototype to a customer's purchase order",
      description: "For hardware and deep-tech founders: which customer to pilot with first, how to price a pilot, and how to fund the long road to production. Built from Elena's interview answers.",
      howIWork: "Find the customer's engineer who owns the problem, then design the pilot around that engineer's success metric.",
      always: ["Separate technical risk from market risk", "Say what the pilot should prove"],
      never: ["Assume a better spec sells itself", "Skip non-dilutive funding options"],
      exampleQuestions: ["How do I find a first pilot customer for hardware?", "How should I price a paid pilot?", "Should a deep-tech startup apply for SBIR grants?"],
      greeting: "Hi, I'm Elena's agent. Tell me what your technology does better and who has that problem." },
    chunkCount: 24,
    interview: [
      ["How do you find a first pilot customer for a hardware startup?",
        "Find the engineer inside a big company whose performance review depends on the problem you solve, not the executive who signs checks. We found ours at a trade conference by asking every booth one question: which failure costs your line the most money. Two engineers said thermal runaway, and both became our first pilots within six months."],
      ["How should a startup price a paid pilot?",
        "Never free. Charge enough that the customer assigns an owner and tracks results, usually 10 to 20 percent of what a full deployment would cost. Write the success metric into the pilot agreement, like cycle life above 1,500 at 45 degrees, so a good result converts straight into a purchase order instead of another pilot."],
      ["Should a deep-tech startup apply for SBIR grants?",
        "Yes, if your technology fits a published agency topic. SBIR Phase I is non-dilutive money that buys 6 to 12 months of technical proof, and investors read it as outside validation. Budget a full month for the first proposal, talk to the program manager before you write it, and don't let grant deliverables pull you away from what customers need."],
    ],
    reviews: [["riley", 5, "Knew exactly how to structure our pilot so it turned into a purchase order.", 35], ["jordan", 5, null, 14]],
  },
  // Fundraising & finance
  {
    id: "nadia", name: "Nadia Rahman", color: "#7a3a14",
    profile: { field: "Pitch decks", credentials: "Former seed fund associate, screened 3,000+ decks", yearsExperience: 8, location: "New York, NY",
      bio: "Screened more than 3,000 pitch decks as a seed fund associate. I tear decks down slide by slide so founders get the second meeting." },
    agent: { topic: "Pitch deck teardown", icon: "file-search", category: "tax_finance", rate: 3, rating: 4.8, ratings: 27, usage: 62, days: 31,
      headline: "A slide-by-slide teardown from someone who screened 3,000 decks",
      description: "Checks your slide order, your one-line summary and every claim an investor will poke at. Built from Nadia's interview answers from years of screening decks at a seed fund.",
      howIWork: "If a partner can't repeat your company in one sentence after slide one, nothing else matters.",
      always: ["Rewrite the weakest slide", "Flag every claim without a number behind it"],
      never: ["Promise a deck will get funded", "Pad the deck past 12 slides"],
      exampleQuestions: ["Tear down my pitch deck", "What slides should a pre-seed deck have?", "How do I write the first slide?"],
      greeting: "Hi, I'm Nadia's agent. Paste your deck outline and I'll tear it down slide by slide." },
    chunkCount: 23,
    interview: [
      ["What slides should a pre-seed pitch deck have?",
        "Ten to twelve: a one-line summary, the problem, the solution, why now, traction, market size, business model, competition, team, and the ask with what it buys. Put traction as early as you can, even if it's a waitlist. I spent about 90 seconds on a first pass, and the decks that got forwarded had their proof in the first three slides."],
      ["How do you write the first slide of a pitch deck?",
        "One sentence a partner could repeat to colleagues: we help this customer do this thing, and here's the proof. For example, Loop schedules meetings for student organizations, with 40 clubs on the waitlist. No logo-only title slide and no mission statement. If the first slide doesn't say what you do, the rest of the deck gets skimmed."],
      ["What are the most common pitch deck mistakes?",
        "Top-down market sizing, a competition slide that claims there are no competitors, a team slide without the one fact that makes you the right people, and an ask with no milestones attached. The biggest one is a solution slide full of features. Show one customer, their problem and the result they got."],
    ],
    reviews: [["riley", 5, "Rewrote our first slide in ten minutes, and the next investor repeated it back to us.", 21], ["alex", 5, null, 10], ["casey", 4, "Blunt, which is exactly what our deck needed.", 2]],
  },
  {
    id: "ben", name: "Ben Adler", color: "#34386e",
    profile: { field: "Cap tables & SAFEs", credentials: "Former equity management consultant, helped close 200+ SAFE rounds", yearsExperience: 10, location: "Palo Alto, CA",
      bio: "Helped more than 200 founders model SAFEs and clean up cap tables before their priced rounds. I explain dilution in plain numbers, not legal language." },
    agent: { topic: "SAFEs & cap tables", icon: "chart-pie", category: "tax_finance", rate: 2, rating: 4.6, ratings: 19, usage: 48, days: 26,
      headline: "SAFEs, dilution and cap tables in plain numbers",
      description: "Explains how SAFEs convert, models your dilution across rounds, and flags cap table mistakes before an investor finds them. General guidance built from Ben's interview answers, not legal advice.",
      howIWork: "Model the next two rounds before you sign anything today.",
      always: ["Show the dilution math with example numbers", "Suggest checking terms with a startup lawyer"],
      never: ["Give legal or securities advice", "Call a valuation cap standard without context"],
      exampleQuestions: ["How does a SAFE convert?", "How much dilution is normal at pre-seed?", "What is a post-money valuation cap?"],
      greeting: "Hi, I'm Ben's agent. Tell me the SAFE terms you're looking at and I'll show you the math." },
    chunkCount: 17,
    interview: [
      ["How does a SAFE convert into equity?",
        "A SAFE is money now for shares later. When you raise a priced round, the SAFE converts at the lower of the valuation cap or the discounted round price. If an investor put in $100,000 on a $5 million post-money cap, that investor owns about 2 percent right after conversion, before the new round dilutes everyone. Always model the conversion in a spreadsheet before you sign."],
      ["What is a post-money valuation cap?",
        "It's the company value, including the SAFE money itself, that sets the SAFE holder's ownership. Ownership equals the investment divided by the post-money cap, so $250,000 on a $10 million post-money cap is 2.5 percent. The catch for founders is that every additional SAFE dilutes you, not the earlier SAFE holders, so stacking many SAFEs adds up faster than it feels."],
      ["How much dilution is normal in a pre-seed round?",
        "Most pre-seed rounds sell 10 to 15 percent of the company, and 20 percent is the upper edge. Add up every SAFE you've signed as if it converted today. If the founders hold less than 60 percent combined before the seed round, future investors will worry about motivation, so raise only what the next milestone needs."],
    ],
    reviews: [["morgan", 5, "Finally understood why our third SAFE diluted us and not the first investors.", 17], ["jordan", 4, null, 7]],
  },
  {
    id: "aisha", name: "Aisha Bello", color: "#6e4a0c",
    profile: { field: "Accelerator applications", credentials: "YC alum, fintech founder, has reviewed hundreds of accelerator applications", yearsExperience: 7, location: "Oakland, CA",
      bio: "Got into YC on the second try and have reviewed hundreds of accelerator applications for other founders since. I help founders write answers that are specific, short and honest." },
    agent: { topic: "YC application review", icon: "clipboard-check", category: "tax_finance", rate: 2, rating: 4.9, ratings: 25, usage: 57, days: 12,
      headline: "Accelerator applications that sound like you, only sharper",
      description: "Reviews your YC or accelerator application answer by answer, cuts the jargon, and preps you for a ten-minute interview. Built from Aisha's interview answers.",
      howIWork: "Specific beats impressive. Every answer should include a number or a name.",
      always: ["Rewrite the answer in plain words", "Point out anything a partner would doubt"],
      never: ["Promise acceptance", "Encourage exaggerating traction"],
      exampleQuestions: ["Review my YC application", "How do I describe my company in 50 characters?", "How do I prepare for the YC interview?"],
      greeting: "Hi, I'm Aisha's agent. Paste your application answers and I'll review them one by one." },
    chunkCount: 18,
    interview: [
      ["What makes a strong YC application?",
        "Clarity and evidence. The company description should make sense to someone outside your industry in one read. Then show that you move fast: what you built, how many users, what you learned in the last month. My first application said we were revolutionizing campus life. My second said 12 clubs were using the product weekly. The second one got the interview."],
      ["How do you describe a company in 50 characters?",
        "Say what the product does and for whom, with no adjectives. Scheduling for student organizations works. The all-in-one platform empowering campus communities doesn't. Read your description to someone who has never heard of you; if they can't repeat it back, cut words until they can."],
      ["How do you prepare for the YC interview?",
        "It's ten minutes of rapid questions, so practice answers that are one or two sentences long. Expect what do you do, who is using it, how many, why you, what's the hardest part, and how you make money. Memorize your numbers. Do three mock interviews with founders who've been through it and ask them to interrupt you."],
    ],
    reviews: [["casey", 5, "Cut every answer in half and added numbers. We got the interview.", 9], ["riley", 5, null, 4], ["jordan", 5, "The mock interview questions were almost exactly what we got asked.", 1]],
  },
  {
    id: "owen", name: "Owen Gallagher", color: "#4a5e1c",
    profile: { field: "Angel fundraising", credentials: "Angel investor in 40+ companies, organizer of a Midwest angel group", yearsExperience: 16, location: "Omaha, NE",
      bio: "Written checks into more than 40 early-stage companies and run a Midwest angel group for eight years. I help founders run a tight angel round outside Silicon Valley." },
    agent: { topic: "Raising from angels", icon: "hand-coins", category: "tax_finance", rate: 3, rating: 4.4, ratings: 13, usage: 29, days: 48,
      headline: "Run a tight angel round, from an angel who writes the checks",
      description: "Who to ask, how to ask, and how to close an angel round in weeks instead of months. Built from Owen's interview answers from 40+ angel investments.",
      howIWork: "Build the list, set a close date, and create momentum with the first check.",
      always: ["Give a concrete outreach step", "Say what an angel will ask next"],
      never: ["Give securities or legal advice", "Suggest raising from people who can't afford to lose the money"],
      exampleQuestions: ["How do I find angel investors?", "What check size should I ask angels for?", "How do I close an angel round quickly?"],
      greeting: "Hi, I'm Owen's agent. Tell me how much you're raising and who you know so far." },
    chunkCount: 16,
    interview: [
      ["How do you find angel investors?",
        "Start with operators in your industry who've had an exit, then local angel groups, then founders one or two stages ahead of you. Warm introductions from founders an angel has already backed work best. Build a list of 60 names and expect around one in ten to invest. Cold emails to famous angels rarely work; a short note through a founder they trust does."],
      ["What check size should you ask angel investors for?",
        "Set a minimum check, usually $10,000 to $25,000, so you don't end up managing 80 small investors. Ask for a specific amount tied to your round: we're raising $400,000 on a SAFE and I'm hoping you'll take $25,000. A specific ask gets a specific answer. Vague asks get a polite maybe."],
      ["How do you close an angel round quickly?",
        "Set a close date and tell everyone it's real. Get your first committed check from the angel with the most credibility, then mention that commitment in every follow-up. Momentum is the whole game: I've watched rounds sit open for eight months because nobody wanted to go first, then fill in two weeks once one respected angel said yes."],
    ],
    reviews: [["alex", 4, "The 60-name list and a real close date got our round done in five weeks.", 28], ["morgan", 5, null, 13]],
  },
  {
    id: "lena", name: "Lena Fischer", color: "#4a4744",
    profile: { field: "Entity setup & startup paperwork", credentials: "Former startup paralegal and operations lead, set up 150+ companies", yearsExperience: 9, location: "Milwaukee, WI",
      bio: "Helped more than 150 founders incorporate, split equity and get their paperwork ready for investors. I explain the basics so the lawyer meeting is short and cheap." },
    agent: { topic: "Entity setup basics", icon: "landmark", category: "tax_finance", rate: 1, rating: 4.3, ratings: 12, usage: 34, days: 38,
      headline: "Incorporation and founder paperwork, in plain language",
      description: "General guidance on LLC versus C-corp, founder vesting, and the documents investors expect. Built from Lena's interview answers. Not legal advice, and it says when to call a lawyer.",
      howIWork: "Get the boring paperwork right once so it never shows up in due diligence.",
      always: ["Say when to talk to a licensed attorney", "List the documents to have ready"],
      never: ["Give legal or tax advice for a specific situation", "Draft binding legal documents"],
      exampleQuestions: ["Should I form an LLC or a C-corp?", "What is founder vesting?", "What paperwork do investors expect?"],
      greeting: "Hi, I'm Lena's agent. I give general guidance on setting up a company, not legal advice. What stage are you at?" },
    chunkCount: 14,
    interview: [
      ["Should a startup form an LLC or a C-corp?",
        "If you plan to raise from venture investors, most founders form a Delaware C-corp, because that's what investors and standard documents like the SAFE expect. An LLC can make sense for a bootstrapped business or a side project. Converting later costs money and time, so decide based on whether you'll raise, and confirm with a startup attorney before filing."],
      ["What is founder vesting and why does it matter?",
        "Vesting means founders earn their shares over time, usually four years with a one-year cliff. If a co-founder leaves after three months, the company keeps the unvested shares instead of a departed founder owning half. Investors will ask for vesting anyway, so set it up at incorporation. And file the 83(b) election within 30 days; missing that deadline is one of the most expensive paperwork mistakes I've seen."],
      ["What paperwork do investors expect to see?",
        "The paperwork investors expect in diligence: certificate of incorporation, bylaws, board consents, founder stock purchase agreements with vesting, IP assignment agreements from every founder and contractor, 83(b) elections, and a clean cap table. The IP assignment is the one founders forget. If code was written before the company existed, get it assigned to the company in writing."],
    ],
    reviews: [["jordan", 4, "Caught that our contractor never signed an IP assignment, before an investor did.", 19], ["casey", 5, null, 6]],
  },
  {
    id: "kenji", name: "Kenji Watanabe", color: "#1c5f6e",
    profile: { field: "Engineering hiring", credentials: "VP of Engineering, hired the first 30 engineers at two startups", yearsExperience: 13, location: "Los Angeles, CA",
      bio: "Hired the first 30 engineers at two venture-backed startups. I help first-time and non-technical founders hire engineers who can build from zero." },
    agent: { topic: "Hiring your first engineers", icon: "user-plus", category: "tax_finance", rate: 3, rating: 4.7, ratings: 15, usage: 28, days: 22,
      headline: "Hire your first engineers without a recruiter",
      description: "Where to find early engineers, how to run a practical interview, and how to think about salary and equity for the first hires. Built from Kenji's interview answers.",
      howIWork: "Hire for ownership and speed over pedigree. Test with real work, not puzzles.",
      always: ["Give a concrete interview exercise", "Show a salary and equity range with the reasoning"],
      never: ["Recommend whiteboard puzzles", "Suggest paying only in equity"],
      exampleQuestions: ["How do I hire my first engineer?", "How much equity should an early engineer get?", "Should I hire a freelancer or a full-time engineer?"],
      greeting: "Hi, I'm Kenji's agent. What are you building, and what can your team already do?" },
    chunkCount: 17,
    interview: [
      ["How do you hire a first engineer?",
        "To hire a first engineer, look in your own network and the places where builders spend time: local meetups, open-source projects in your stack, and university labs. Run a paid take-home or a half-day pairing session on a real problem from your product, not a puzzle. I look for someone who ships something end to end and asks good questions about the customer."],
      ["How much equity should an early engineer get?",
        "For the first engineer at a pre-seed company, 1 to 2 percent is common, paired with a salary below market, and it drops to 0.5 to 1 percent by the fifth hire. Always vest the equity over four years with a one-year cliff. Explain the math honestly: what the shares could be worth at a realistic outcome, not a unicorn fantasy."],
      ["Should a startup hire a freelancer or a full-time engineer?",
        "Freelancers are fine for a prototype with a fixed scope and a clear finish line. Once the product is the company, you need an engineer who owns the codebase and stays through the rewrites. I've seen founders spend $60,000 on agencies and end up with code nobody on the team understands. If it's core, hire; if it's a side project, contract."],
    ],
    reviews: [["riley", 5, "The paid pairing session found us a great first engineer in three weeks.", 14], ["alex", 4, null, 5]],
  },
  // Growth & sales
  {
    id: "mateo", name: "Mateo Rossi", color: "#7a2424",
    profile: { field: "SaaS pricing", credentials: "Pricing consultant, former head of monetization at a B2B SaaS company", yearsExperience: 11, location: "Boulder, CO",
      bio: "Ran pricing at a B2B SaaS company from $1M to $30M in annual revenue and has advised 60 startups on packaging. I help founders pick a value metric and set tiers customers understand." },
    agent: { topic: "Pricing strategy", icon: "tag", category: "career_admissions", rate: 3, rating: 4.8, ratings: 21, usage: 46, days: 36,
      headline: "A value metric and pricing tiers that grow with your customers",
      description: "Chooses your value metric, designs good-better-best tiers, and plans a price increase without losing customers. Built from Mateo's interview answers from years running SaaS pricing.",
      howIWork: "Price on the value metric customers already count, then package around who buys.",
      always: ["Name the value metric", "Suggest a price to test with real prospects"],
      never: ["Price from your costs", "Recommend a free plan without a reason"],
      exampleQuestions: ["How should I structure my pricing tiers?", "What is a value metric?", "How do I raise prices on existing customers?"],
      greeting: "Hi, I'm Mateo's agent. Who pays for your product, and what do they count?" },
    chunkCount: 18,
    interview: [
      ["What is a value metric in pricing?",
        "It's the unit you charge by, and it grows as the customer gets more value: seats, meetings scheduled, active members, events. The best value metric is something the customer already counts and is happy to see grow. For a scheduling tool for clubs, charging per active organization or per member aligns your revenue with their success; charging per feature doesn't."],
      ["How should a startup structure pricing tiers?",
        "Three tiers, good, better and best, each built for a distinct buyer rather than a random split of features. The middle tier is the one you want most people to buy, so price the top tier high enough to make the middle look reasonable. Put the features your most valuable customers care about, like admin controls and reports, in the higher tiers."],
      ["How do you raise prices on existing customers?",
        "Grandfather current customers for a set period, usually 6 to 12 months, and give at least 30 days of notice with a clear reason tied to what you've added. Raise prices for new customers first and watch conversion for a month. When we did this, conversion barely moved and revenue per customer went up 35 percent."],
    ],
    reviews: [["jordan", 5, "Switched from per-seat to per-organization pricing and closed our first three paid clubs.", 24], ["morgan", 4, null, 11], ["casey", 5, null, 2]],
  },
  {
    id: "zoe", name: "Zoe Carter", color: "#7a2e44",
    profile: { field: "Outbound sales", credentials: "Built outbound teams at two startups, booked 2,000+ meetings", yearsExperience: 8, location: "Atlanta, GA",
      bio: "Booked more than 2,000 sales meetings through cold email and built outbound teams at two startups. I help founders write short, specific outreach that gets replies." },
    agent: { topic: "Cold outbound", icon: "send", category: "career_admissions", rate: 2, rating: 4.5, ratings: 17, usage: 52, days: 15,
      headline: "Cold outreach that gets replies, not unsubscribes",
      description: "Builds your prospect list, writes a three-step sequence, and tunes subject lines and follow-ups. Built from Zoe's interview answers from thousands of booked meetings.",
      howIWork: "Small, specific lists beat big blasts. Every email should prove you looked the person up.",
      always: ["Write the actual email", "Give a reply-rate benchmark to compare against"],
      never: ["Recommend buying email lists", "Write emails longer than 100 words"],
      exampleQuestions: ["Write a cold email sequence for me", "What reply rate should I expect?", "How many follow-ups should I send?"],
      greeting: "Hi, I'm Zoe's agent. Who are you emailing, and what do you want them to do?" },
    chunkCount: 15,
    interview: [
      ["How do you write a cold email sequence?",
        "Three emails over ten days. Email one is under 80 words: a specific observation about the person, the problem you've seen people like them have, and a small ask. Email two, three days later, adds one proof point like a customer result. Email three, a week later, is a short break-up note. Personalize the first line for every single person; that line does most of the work."],
      ["What reply rate should a cold email get?",
        "For a well-targeted list of under 200 people with a personalized first line, a 10 to 20 percent reply rate is good. Under 5 percent means the list or the problem is wrong, not the wording. Measure replies, not opens; open tracking is unreliable now, and it tempts you to optimize subject lines instead of relevance."],
      ["How many follow-ups should you send?",
        "Two follow-ups after the first email, then stop. More than half of my replies came from a follow-up, so never send just one email. Each follow-up should add something new, a result, a question or a relevant resource, instead of just bumping the thread. After three touches, move the person to a list you revisit in three months."],
    ],
    reviews: [["alex", 5, "Our reply rate went from 3% to 14% after rewriting the first line for each advisor.", 12], ["riley", 4, null, 6]],
  },
  {
    id: "samir", name: "Samir Haddad", color: "#0f5a40",
    profile: { field: "SEO & content", credentials: "Grew a B2B startup from zero to 400k monthly organic visits", yearsExperience: 10, location: "Raleigh, NC",
      bio: "Grew a B2B startup's organic traffic from zero to 400,000 monthly visits with a three-person content team. I help founders pick keywords they can actually win." },
    agent: { topic: "SEO & content", icon: "newspaper", category: "career_admissions", rate: 2, rating: 4.4, ratings: 10, usage: 21, days: 55,
      headline: "Content and SEO that bring in customers, not just traffic",
      description: "Picks keywords a new site can rank for, plans your first 20 articles, and says when SEO is worth it at all. Built from Samir's interview answers.",
      howIWork: "Write for the search a buyer makes right before they need you.",
      always: ["Name specific keywords and the intent behind them", "Say how long results will take"],
      never: ["Promise rankings in weeks", "Recommend buying backlinks"],
      exampleQuestions: ["Is SEO worth it for an early startup?", "What should my first blog posts be about?", "How do I choose keywords to target?"],
      greeting: "Hi, I'm Samir's agent. Tell me what your customers search for when they have the problem." },
    chunkCount: 12,
    interview: [
      ["Is SEO worth it for an early-stage startup?",
        "Only if your customers search for the problem and you can wait six to twelve months. SEO compounds slowly, so start with a handful of high-intent pages while you work faster channels like outbound. If nobody searches for what you do yet, content still helps sales, but don't expect search traffic to bring your first customers."],
      ["How do you choose keywords to target?",
        "Pick long, specific searches a buyer types when close to a decision, like how to schedule meetings for a student club, rather than broad terms like scheduling software. New sites can't win broad keywords. Look for low-competition keywords where the current top results are forum posts or thin articles; that's a gap you can fill."],
      ["What should a startup's first blog posts be about?",
        "The exact questions your customers ask on sales calls. Every question you've answered three times is an article. Then write comparison pages, your product versus the spreadsheet or tool they use today, and templates people can copy. Our first template post brought in more signups than the next 30 blog posts combined."],
    ],
    reviews: [["morgan", 4, "Stopped writing thought-leadership posts and wrote the three templates customers kept asking for.", 30], ["jordan", 4, null, 15]],
  },
  {
    id: "imani", name: "Imani Clarke", color: "#6e5410",
    profile: { field: "Community-led growth", credentials: "Former head of community, built a 50,000-member developer community", yearsExperience: 9, location: "Washington, DC",
      bio: "Built a developer community from 30 people in a group chat to 50,000 members. I help founders turn early users into a community that recruits the next ones." },
    agent: { topic: "Community-led growth", icon: "messages-square", category: "career_admissions", rate: 2, rating: 4.6, ratings: 13, usage: 25, days: 9,
      headline: "Turn early users into a community that grows itself",
      description: "Where to host your community, how to get the first 100 members talking, and how to measure whether it drives growth. Built from Imani's interview answers.",
      howIWork: "Start with 30 people who already talk to each other, then give them a reason to come back every week.",
      always: ["Give a weekly ritual the community can run", "Tie community activity to a growth metric"],
      never: ["Launch an empty forum", "Measure success by member count alone"],
      exampleQuestions: ["How do I start a community for my product?", "How do I get members to actually engage?", "How do I measure community-led growth?"],
      greeting: "Hi, I'm Imani's agent. Who are your 30 most engaged users?" },
    chunkCount: 12,
    interview: [
      ["How do you start a community for a new product?",
        "Don't launch a big empty forum. Invite your 30 most engaged users into a small group, personally, one message at a time. Host the community where they already spend time, which for students is usually Discord or a group chat. Seed it with one weekly ritual, like a Friday thread where club officers share how the week's events went."],
      ["How do you get community members to engage?",
        "Ask questions only members can answer, and reply to every post within a few hours for the first three months. Spotlight members publicly when they help someone. The first 100 posts are on you; I wrote or prompted most of them myself. After that, the regulars start answering each other and you can step back."],
      ["How do you measure community-led growth?",
        "Track how many new signups mention the community, how many members invite someone, and whether community members retain better than everyone else. In our case, members retained at twice the rate of non-members after 90 days. Member count on its own tells you nothing; plenty of communities are big and silent."],
    ],
    reviews: [["casey", 5, "The Friday thread idea got our first 40 users talking to each other.", 7], ["alex", 4, null, 2]],
  },
  {
    id: "victor", name: "Victor Lindqvist", color: "#5e4630",
    profile: { field: "Enterprise sales", credentials: "Enterprise account executive turned VP of Sales, closed $40M in contracts", yearsExperience: 15, location: "Dallas, TX",
      bio: "Closed more than $40M in enterprise software contracts, from first pilot to six-figure renewals. I help founders sell into large organizations without getting lost in procurement." },
    agent: { topic: "Enterprise sales", icon: "building-2", category: "career_admissions", rate: 4, rating: 4.7, ratings: 12, usage: 20, days: 43,
      headline: "Land your first enterprise contract without stalling in procurement",
      description: "Maps the buying committee, finds your champion, and walks you through security reviews, pilots and procurement. Built from Victor's interview answers from 15 years of enterprise deals.",
      howIWork: "Find the champion, map who signs, and write the mutual close plan on day one.",
      always: ["Identify the champion and the economic buyer", "Give a next step with a date"],
      never: ["Discount before the buyer asks", "Treat a verbal yes as a closed deal"],
      exampleQuestions: ["How do I sell to a large university or enterprise?", "How do I get through a security review?", "How do I find a champion inside a company?"],
      greeting: "Hi, I'm Victor's agent. Which organization are you trying to close, and who have you talked to so far?" },
    chunkCount: 20,
    interview: [
      ["How do you sell to a large enterprise or university?",
        "Map the buying committee before the first demo: the champion who feels the pain, the economic buyer who owns the budget, IT and security, and procurement. For a university, that's often a student affairs director, a dean, campus IT and the purchasing office. Write a mutual close plan with dates for each step and share it with your champion by the second meeting."],
      ["How do you find a champion inside a company?",
        "A champion has the problem, has influence, and will spend political capital to fix it. Test the relationship: ask your contact to set up a meeting with the boss or to share an internal process doc. If that doesn't happen, you have a fan, not a champion. The deals I lost almost always had a friendly contact who couldn't move anyone."],
      ["How do you get through a security review?",
        "Prepare before they ask. Write a two-page security overview covering where data lives, encryption, access controls and incident response, and fill out a standard questionnaire like the SIG Lite or CAIQ once so you can reuse it. Security reviews stall deals for months when a startup answers every questionnaire from scratch."],
    ],
    reviews: [["riley", 5, "The mutual close plan got our university pilot signed a semester earlier than we expected.", 26], ["morgan", 4, null, 10]],
  },
  {
    id: "tara", name: "Tara Singh", color: "#6e5a0a",
    profile: { field: "Growth experiments", credentials: "Former growth PM at a consumer fintech app, ran 300+ experiments", yearsExperience: 8, location: "San Diego, CA",
      bio: "Ran more than 300 growth experiments at a consumer fintech app, and most of them failed. I help founders pick experiments worth running and read the results honestly." },
    agent: { topic: "Growth experiments", icon: "zap", category: "career_admissions", rate: 2, rating: 4.5, ratings: 14, usage: 37, days: 5,
      headline: "Run growth experiments that teach you something",
      description: "Picks which growth experiments to run first, sizes them so the results mean something, and sets up a weekly experiment cadence. Built from Tara's interview answers from 300+ experiments.",
      howIWork: "One hypothesis, one metric, one week. Then decide.",
      always: ["Write the hypothesis and success metric", "Say how many users the test needs"],
      never: ["Call a winner on tiny samples", "Run five experiments on the same page at once"],
      exampleQuestions: ["Which growth experiments should I run first?", "How do I prioritize growth ideas?", "How long should an experiment run?"],
      greeting: "Hi, I'm Tara's agent. What's the one number you most want to move this month?" },
    chunkCount: 16,
    interview: [
      ["Which growth experiments should a startup try first?",
        "Run your first growth experiments where the most users drop off, usually signup or the first session, not on new acquisition channels. Test big changes, like removing a whole onboarding step, not button colors, because at low traffic only large effects are detectable. Our best early win was cutting a four-screen signup to one screen, which lifted activation by 22 percent."],
      ["How do you prioritize growth experiment ideas?",
        "Score each idea on impact, confidence and ease from one to ten, then run the top three. Keep a single backlog with a written hypothesis for each: if we do X, metric Y will move by Z because of evidence W. Review results every week in a 30-minute meeting and write down what you learned, especially from the failures."],
      ["How long should a growth experiment run?",
        "Run every experiment for at least one full week so weekday and weekend behavior both show up, and as long as it takes to reach the sample size you planned in advance. With a few hundred users a week, an experiment may need two or three weeks, or you should test bigger changes. Never stop the moment a result looks good; early winners usually shrink."],
    ],
    reviews: [["jordan", 5, "Stopped testing button colors and cut a whole onboarding step instead. Activation jumped.", 4], ["casey", 4, null, 1]],
  },
  {
    id: "diego", name: "Diego Morales", color: "#1e5e56",
    profile: { field: "Partnerships & channels", credentials: "Head of partnerships at two ed-tech startups, built 100+ distribution partnerships", yearsExperience: 12, location: "Phoenix, AZ",
      bio: "Built more than 100 distribution partnerships for two ed-tech startups, including deals with universities and student government associations. I help founders find partners who already reach their customers." },
    agent: { topic: "Partnerships & channels", icon: "handshake", category: "career_admissions", rate: 3, rating: 4.6, ratings: 11, usage: 19, days: 59,
      headline: "Find partners who already reach your customers",
      description: "Which partners to approach, how to pitch a partnership, and how to structure a first co-marketing or referral deal. Built from Diego's interview answers from two ed-tech startups.",
      howIWork: "A partnership works when both sides can name what they get in one sentence.",
      always: ["Name specific partner types and who to contact", "Spell out what the partner gets"],
      never: ["Chase big-logo partnerships before product-market fit", "Sign exclusivity early"],
      exampleQuestions: ["What partnerships should an early startup pursue?", "How do I pitch a partnership?", "How should I structure a referral deal?"],
      greeting: "Hi, I'm Diego's agent. Who already talks to your customers every week?" },
    chunkCount: 13,
    interview: [
      ["What partnerships should an early startup pursue?",
        "Partners who already reach your customers and gain something when your product works. For a tool for student organizations, that's student government, the campus activities office, and the software clubs already use for dues or events. Skip big-logo partnerships until you have product-market fit; they take a year and rarely send users."],
      ["How do you pitch a partnership?",
        "Lead with what the partner gets, in the partner's terms: fewer support requests, a better experience for members, a revenue share. Bring a one-page proposal with a 60-day pilot, one shared metric, and who does what. Our first university partnership started because we offered to cut the activities office's room-booking emails in half."],
      ["How should a startup structure a referral deal with a partner?",
        "Keep the first referral partnership simple: a 60 to 90 day pilot, a referral link or code, and 10 to 20 percent of first-year revenue for referred customers. Avoid exclusivity and long contracts until you've seen results. Put the success metric in writing and schedule the review meeting before the pilot starts."],
    ],
    reviews: [["morgan", 5, "The activities office became our best channel after we pitched it the way Diego's agent suggested.", 33], ["alex", 4, null, 16]],
  },
];

const slugify = (text: string) => text.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const e of MORE_EXPERTS) {
  const [first, last] = e.name.split(" ");
  const { topic, icon, rate, rating, ratings, usage, days, ...persona } = e.agent;
  const id = slugify(`${e.name} ${topic}`);
  const sourceId = `s-${e.id}-interview`;
  const created = days * DAY;
  IDENTITIES.push({ id: e.id, kind: "expert", displayName: e.name, avatarInitial: first[0], avatarColor: e.color, isSwitchable: false });
  PROFILES.push({ identityId: e.id, displayName: e.name, contactUrl: `https://cal.com/${slugify(first)}-${slugify(last)}`, ...e.profile });
  AGENTS.push(agent({
    id, slug: id, ownerId: e.id, icon, status: "published", rateMultiplier: rate, consentAcceptedAt: ago(created - DAY),
    ratingAvg: rating, ratingCount: ratings, usageCount: usage, createdAt: ago(created),
    persona: { name: `${e.name} · ${topic}`, ...persona },
  }));
  SOURCES.push({ id: sourceId, agentId: id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: e.chunkCount, pageCount: null, createdAt: ago(created - DAY) });
  for (const [question, answer] of e.interview) CHUNKS.push(interviewChunk(id, sourceId, question, answer));
  for (const [reviewerId, stars, comment, daysAgo] of e.reviews) {
    REVIEWS.push({ id: `r-seed-${REVIEWS.length + 1}`, agentId: id, reviewerId, stars, comment, createdAt: ago(daysAgo * DAY) });
  }
}

// Presentation fixtures never qualify as live evidence.
for (const records of [IDENTITIES, PROFILES, AGENTS, SOURCES, CHUNKS, INTERVIEW_TURNS, CONVERSATIONS, MESSAGES, LEDGER, FLAGS]) {
  for (const record of records) record.origin = "fixture";
}

/** Real, general pages used when an agent's own knowledge doesn't cover a question. */
export const WEB_FALLBACK: Record<"health_pt" | "tax_finance" | "career_admissions", { title: string; url: string; site: string; text: string }> = {
  health_pt: { title: "Market research and competitive analysis", url: "https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis", site: "U.S. Small Business Administration",
    text: "The SBA's guide suggests combining direct conversations with potential customers and public data on your market to check demand and understand competitors before you commit to a plan." },
  tax_finance: { title: "Fund your business", url: "https://www.sba.gov/business-guide/plan-your-business/fund-your-business", site: "U.S. Small Business Administration",
    text: "The SBA's funding guide says to work out how much money you need before choosing between self-funding, loans, and investors, since each option trades off cost and control differently." },
  career_admissions: { title: "Marketing and sales", url: "https://www.sba.gov/business-guide/manage-your-business/marketing-sales", site: "U.S. Small Business Administration",
    text: "The SBA's marketing guide recommends defining your target customer and a simple plan for reaching them before spending on advertising." },
};
