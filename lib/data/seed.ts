/**
 * Placeholder content for the presentation MVP (D-03). Nobody audits these
 * numbers; they only need to be internally consistent:
 * - every wallet balance is the sum of that identity's ledger rows
 *   (Maria and Sam end at exactly 5,000 credits, D-09);
 * - per conversation, hirer debit = platform cost + platform margin + expert earnings.
 * Timestamps are relative to page load so the history always looks recent.
 */
import type { Agent, Chunk, Citation, Conversation, Flag, Identity, InterviewTurn, LedgerEntry, Message, PersonaForm, Profile, Source } from "@/lib/types";

const MIN = 60_000;
const loadedAt = Date.now();
const ago = (minutes: number) => new Date(loadedAt - minutes * MIN).toISOString();
const DAY = 24 * 60;

export const MARIA = "maria";
export const SAM = "sam";

export const IDENTITIES: Identity[] = [
  { id: MARIA, kind: "expert", displayName: "Maria Chen", avatarInitial: "M", avatarColor: "#5a4636", isSwitchable: true },
  { id: SAM, kind: "hirer", displayName: "Sam Okafor", avatarInitial: "S", avatarColor: "#2f5a4b", isSwitchable: true },
  { id: "dev", kind: "expert", displayName: "Dev Patel", avatarInitial: "D", avatarColor: "#3b2560", isSwitchable: false },
  { id: "priya", kind: "expert", displayName: "Priya Nair", avatarInitial: "P", avatarColor: "#084d31", isSwitchable: false },
  { id: "luis", kind: "expert", displayName: "Luis Ortega", avatarInitial: "L", avatarColor: "#1566b8", isSwitchable: false },
  { id: "hannah", kind: "expert", displayName: "Hannah Kim", avatarInitial: "H", avatarColor: "#6244a0", isSwitchable: false },
  { id: "tom", kind: "expert", displayName: "Tom Reyes", avatarInitial: "T", avatarColor: "#079455", isSwitchable: false },
  { id: "jordan", kind: "hirer", displayName: "Jordan Lee", avatarInitial: "J", avatarColor: "#5a3a36", isSwitchable: false },
  { id: "alex", kind: "hirer", displayName: "Alex Rivera", avatarInitial: "A", avatarColor: "#36475a", isSwitchable: false },
];

export const PROFILES: Profile[] = [
  { identityId: MARIA, displayName: "Maria Chen", field: "Physical therapy", credentials: "DPT, OCS", yearsExperience: 15, contactUrl: "https://cal.com/maria-chen", bio: "Fifteen years in outpatient ortho. I run a small practice in Madison and teach a rehab elective.", location: "Madison, WI" },
  { identityId: SAM, displayName: "Sam Okafor", field: "", credentials: "", yearsExperience: null, contactUrl: "", bio: "Freelance designer. Hires experts when a search engine is not enough.", location: "Milwaukee, WI" },
  { identityId: "dev", displayName: "Dev Patel", field: "Tax preparation", credentials: "Enrolled Agent (IRS)", yearsExperience: 11, contactUrl: "https://cal.com/dev-patel", bio: "Prepares returns for 300+ freelancers a year, mostly designers, writers and developers.", location: "Chicago, IL" },
  { identityId: "priya", displayName: "Priya Nair", field: "College admissions", credentials: "Former admissions reader, M.Ed.", yearsExperience: 9, contactUrl: "https://cal.com/priya-nair", bio: "Read applications for a Big Ten admissions office for five years before going independent.", location: "Ann Arbor, MI" },
  { identityId: "luis", displayName: "Luis Ortega", field: "Strength coaching", credentials: "CSCS", yearsExperience: 12, contactUrl: "https://cal.com/luis-ortega", bio: "Coaches busy adults with old injuries. Believes the best program is the one you finish.", location: "Minneapolis, MN" },
  { identityId: "hannah", displayName: "Hannah Kim", field: "Personal finance", credentials: "CFP", yearsExperience: 7, contactUrl: "https://cal.com/hannah-kim", bio: "Works with people in their first five years of full-time work.", location: "Madison, WI" },
  { identityId: "tom", displayName: "Tom Reyes", field: "Career coaching", credentials: "Former technical recruiter", yearsExperience: 14, contactUrl: "https://cal.com/tom-reyes", bio: "Screened thousands of resumes as a recruiter; now helps candidates get past that screen.", location: "Denver, CO" },
];

function agent(a: Omit<Agent, "systemPromptOverride" | "updatedAt"> & { persona: PersonaForm }): Agent {
  return { ...a, systemPromptOverride: null, updatedAt: a.createdAt };
}

export const AGENTS: Agent[] = [
  agent({
    id: "maria-chen-physical-therapy", slug: "maria-chen-physical-therapy", ownerId: MARIA, icon: "activity",
    status: "published", rateMultiplier: 2, consentAcceptedAt: ago(20 * DAY), ratingAvg: 4.8, ratingCount: 23, usageCount: 41, createdAt: ago(22 * DAY),
    persona: {
      name: "Maria Chen · Physical therapy", category: "health_pt",
      headline: "Post-op rehab and return-to-running plans",
      description: "Post-op knee and shoulder rehab, return-to-running plans, what to do when a flare-up hits. Answers come from Maria's own interview and clinic notes.",
      howIWork: "Pattern first, then the test, then the plan.",
      always: ["Cite the answer or page it came from", "Say when something needs an in-person visit"],
      never: ["Diagnose", "Recommend medication doses"],
      exampleQuestions: ["My knee is swollen three weeks after an ACL repair. Normal?", "How do I get back to running without wrecking my shins again?", "What does a good week of shoulder rehab look like?"],
      greeting: "Hi, I'm Maria's agent. Ask me about rehab after surgery or getting back to running.",
    },
  }),
  agent({
    id: "dev-patel-tax-for-freelancers", slug: "dev-patel-tax-for-freelancers", ownerId: "dev", icon: "calculator",
    status: "published", rateMultiplier: 1.5, consentAcceptedAt: ago(18 * DAY), ratingAvg: 4.6, ratingCount: 41, usageCount: 88, createdAt: ago(19 * DAY),
    persona: {
      name: "Dev Patel · Tax for freelancers", category: "tax_finance",
      headline: "Quarterly estimates and 1099 questions, answered plainly",
      description: "Quarterly estimates, home-office deductions, and the 1099 questions nobody answers plainly.",
      howIWork: "Start from last year's return, then the safe-harbor rule, then this year's numbers.",
      always: ["Name the form or rule the answer rests on"], never: ["File or sign anything for you", "Guess at state-specific rules"],
      exampleQuestions: ["How much should I pay for my Q3 estimate?", "Can I deduct my home office if I also work at a café?", "Do I need to send 1099s to my subcontractors?"],
      greeting: "Hi, I'm Dev's agent. Ask me about freelancer taxes.",
    },
  }),
  agent({
    id: "priya-nair-college-admissions", slug: "priya-nair-college-admissions", ownerId: "priya", icon: "graduation-cap",
    status: "published", rateMultiplier: 1.5, consentAcceptedAt: ago(15 * DAY), ratingAvg: 4.9, ratingCount: 12, usageCount: 27, createdAt: ago(16 * DAY),
    persona: {
      name: "Priya Nair · College admissions", category: "career_admissions",
      headline: "Essays and school lists from a former admissions reader",
      description: "Essay strategy, school lists that make sense, and how to talk about a bad semester.",
      howIWork: "Read it the way a tired reader at 11pm would, then fix the first paragraph.",
      always: ["Point to the sentence that needs work"], never: ["Write the essay for you"],
      exampleQuestions: ["Is my college essay opening too slow?", "How many reach schools should be on my list?", "How do I explain a bad semester?"],
      greeting: "Hi, I'm Priya's agent. Paste an essay or ask about your list.",
    },
  }),
  agent({
    id: "luis-ortega-strength-coaching", slug: "luis-ortega-strength-coaching", ownerId: "luis", icon: "heart-pulse",
    status: "published", rateMultiplier: 1, consentAcceptedAt: ago(12 * DAY), ratingAvg: 4.7, ratingCount: 18, usageCount: 33, createdAt: ago(13 * DAY),
    persona: {
      name: "Luis Ortega · Strength coaching", category: "health_pt",
      headline: "Strength programs for busy adults with old injuries",
      description: "Programming for busy adults, deload weeks, and training around old injuries.",
      howIWork: "Three sessions a week, one main lift each, and a plan for the bad weeks.",
      always: ["Give a regression for every exercise"], never: ["Program through sharp pain"],
      exampleQuestions: ["What does a three-day beginner program look like?", "When should I take a deload week?", "Can I squat with an old meniscus tear?"],
      greeting: "Hi, I'm Luis's agent. Ask me about training around a busy week.",
    },
  }),
  agent({
    id: "hannah-kim-first-job-finances", slug: "hannah-kim-first-job-finances", ownerId: "hannah", icon: "piggy-bank",
    status: "published", rateMultiplier: 1, consentAcceptedAt: ago(9 * DAY), ratingAvg: 4.5, ratingCount: 9, usageCount: 14, createdAt: ago(10 * DAY),
    persona: {
      name: "Hannah Kim · First-job finances", category: "tax_finance",
      headline: "Money basics for your first five years of work",
      description: "401(k) match math, emergency funds, and which credit card questions actually matter at 23.",
      howIWork: "Match first, emergency fund second, everything else third.",
      always: ["Show the math"], never: ["Recommend individual stocks"],
      exampleQuestions: ["How much should I put in my 401(k)?", "How big should my emergency fund be?", "Should I pay off my card or save first?"],
      greeting: "Hi, I'm Hannah's agent. Ask me about your first paychecks.",
    },
  }),
  agent({
    id: "tom-reyes-resume-interviews", slug: "tom-reyes-resume-interviews", ownerId: "tom", icon: "briefcase",
    status: "published", rateMultiplier: 1, consentAcceptedAt: ago(7 * DAY), ratingAvg: 4.8, ratingCount: 33, usageCount: 61, createdAt: ago(8 * DAY),
    persona: {
      name: "Tom Reyes · Resume & interviews", category: "career_admissions",
      headline: "Resumes that survive the screen, interviews that don't sound rehearsed",
      description: "Resumes that survive the screen, STAR answers that don't sound rehearsed, offer negotiation.",
      howIWork: "Six seconds on the resume, then the story behind each bullet.",
      always: ["Rewrite one bullet as an example"], never: ["Invent experience"],
      exampleQuestions: ["Why is my resume not getting callbacks?", "How do I answer 'tell me about a conflict'?", "Should I negotiate my first offer?"],
      greeting: "Hi, I'm Tom's agent. Paste a resume bullet or ask about an interview.",
    },
  }),
  agent({
    id: "maria-chen-running-form-clinic", slug: "maria-chen-running-form-clinic", ownerId: MARIA, icon: "footprints",
    status: "draft", rateMultiplier: 1, consentAcceptedAt: null, ratingAvg: 0, ratingCount: 0, usageCount: 0, createdAt: ago(DAY),
    persona: {
      name: "Maria Chen · Running form clinic", category: "health_pt",
      headline: "Cadence, shin splints and easy fixes for runners",
      description: "Running form, cadence, and what to change first when your shins hurt.",
      howIWork: "Film it, count it, change one thing.",
      always: ["Change one variable at a time"], never: ["Diagnose"],
      exampleQuestions: ["Should I raise my cadence?", "Why do my shins hurt after long runs?"],
      greeting: "Hi, I'm Maria's running clinic agent.",
    },
  }),
];

const MARIA_PT = AGENTS[0].id;
const MARIA_RUN = AGENTS[6].id;

export const SOURCES: Source[] = [
  { id: "s-maria-interview", agentId: MARIA_PT, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 38, pageCount: null, createdAt: ago(21 * DAY) },
  { id: "s-maria-acl", agentId: MARIA_PT, kind: "pdf", name: "ACL-rehab-protocol.pdf", status: "ready", chunkCount: 42, pageCount: 14, createdAt: ago(5 * DAY) },
  { id: "s-maria-run", agentId: MARIA_PT, kind: "md", name: "Return-to-run checklist.md", status: "processing", chunkCount: 0, pageCount: null, createdAt: ago(120) },
  { id: "s-dev-interview", agentId: AGENTS[1].id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 24, pageCount: null, createdAt: ago(19 * DAY) },
  { id: "s-priya-interview", agentId: AGENTS[2].id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 12, pageCount: null, createdAt: ago(16 * DAY) },
  { id: "s-luis-interview", agentId: AGENTS[3].id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 18, pageCount: null, createdAt: ago(13 * DAY) },
  { id: "s-hannah-interview", agentId: AGENTS[4].id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 10, pageCount: null, createdAt: ago(10 * DAY) },
  { id: "s-tom-interview", agentId: AGENTS[5].id, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 30, pageCount: null, createdAt: ago(8 * DAY) },
  { id: "s-run-interview", agentId: MARIA_RUN, kind: "interview", name: "Interview answers", status: "ready", chunkCount: 6, pageCount: null, createdAt: ago(DAY) },
];

export const CHUNKS: Chunk[] = [
  { id: "k-maria-1", agentId: MARIA_PT, sourceId: "s-maria-interview", page: null, headingPath: null,
    question: "When someone comes in three weeks after an ACL repair worried about swelling, what do you look at first?",
    content: "First thing is the pattern. Swelling that's worse at night after a busy day and better in the morning is the knee doing its job. What worries me is swelling that's warm, that came on fast, or that comes with calf pain, because then I'm thinking infection or clot and that's a phone call, not a home exercise." },
  { id: "k-maria-2", agentId: MARIA_PT, sourceId: "s-maria-interview", page: null, headingPath: null,
    question: "How do you tell a patient what counts as warm?",
    content: "Compare it with the other knee using the back of your hand. Noticeably warmer than the other side, plus redness, is the combination I care about. Warm alone right after exercise is expected." },
  { id: "k-maria-3", agentId: MARIA_PT, sourceId: "s-maria-acl", page: 3, headingPath: "Weeks 2-6 › Swelling", question: null,
    content: "Weeks 2-6: ice for 15 minutes after activity, keep quad sets at 3 x 15 daily, and do not reduce walking to manage swelling unless it is warm or painful at rest." },
  { id: "k-maria-4", agentId: MARIA_PT, sourceId: "s-maria-acl", page: 7, headingPath: "Return to running › Criteria", question: null,
    content: "Return to running criteria: full knee extension, no effusion after a 30-minute walk, and single-leg squat to 60 degrees without the knee drifting inward." },
  { id: "k-run-1", agentId: MARIA_RUN, sourceId: "s-run-interview", page: null, headingPath: null,
    question: "What is the first thing you change when a runner's shins hurt?",
    content: "Volume before form. Most shin pain I see is a runner who added mileage too fast. Cut the long run by a third for two weeks, then look at cadence." },
];

export const INTERVIEW_TURNS: InterviewTurn[] = [
  { id: "t-maria-1", agentId: MARIA_PT, position: 1,
    question: "Let's start with the thing you get asked most. When someone comes in three weeks after an ACL repair worried about swelling, what do you actually look at first, and what tells you it's normal versus a problem?",
    answer: CHUNKS[0].content, createdAt: ago(21 * DAY) },
  { id: "t-maria-2", agentId: MARIA_PT, position: 2,
    question: "That \"night vs morning\" pattern is exactly the kind of thing a textbook won't say. How do you explain to a patient what counts as warm?",
    answer: CHUNKS[1].content, createdAt: ago(21 * DAY - 3) },
  { id: "t-maria-3", agentId: MARIA_PT, position: 3,
    question: "Give me a concrete example: a patient who thought they had a problem and didn't, and what you told them.",
    answer: "A marathoner, week four after surgery, swollen every evening. She thought the graft had failed. It was the pattern, and she was icing before activity instead of after. We swapped the order and it settled in a week.",
    createdAt: ago(21 * DAY - 6) },
  { id: "t-run-1", agentId: MARIA_RUN, position: 1,
    question: "What is the first thing you change when a runner's shins hurt?",
    answer: CHUNKS[4].content, createdAt: ago(DAY) },
  { id: "t-run-2", agentId: MARIA_RUN, position: 2,
    question: "When you do look at cadence, what number are you hoping to see, and how fast do you ask someone to change it?",
    answer: null, createdAt: ago(DAY - 4) },
];

/** Interview progress shown in the builder (the seed transcript shows a few of these). */
export const INTERVIEW_ANSWER_COUNTS: Record<string, number> = { [MARIA_PT]: 38, [MARIA_RUN]: 6 };

export const CONVERSATIONS: Conversation[] = [
  { id: "c-knee-swelling", agentId: MARIA_PT, hirerId: SAM, title: "Knee swelling after ACL repair", shareTranscript: false, createdAt: ago(30) },
  { id: "c-q3-estimate", agentId: AGENTS[1].id, hirerId: SAM, title: "Quarterly estimate for Q3", shareTranscript: true, createdAt: ago(DAY + 20) },
  { id: "c-essay-feedback", agentId: AGENTS[2].id, hirerId: SAM, title: "Essay draft feedback", shareTranscript: false, createdAt: ago(3 * DAY + 25) },
  { id: "c-shoulder-plan", agentId: MARIA_PT, hirerId: "jordan", title: "Shoulder rehab week plan", shareTranscript: true, createdAt: ago(4 * DAY + 30) },
  { id: "c-shin-splints", agentId: MARIA_PT, hirerId: "alex", title: "Return to running after shin splints", shareTranscript: false, createdAt: ago(2 * DAY + 15) },
];

const cite = (n: number, c: Chunk): Citation => ({
  n, chunkId: c.id, sourceType: c.question ? "interview" : "document",
  sourceName: c.question ? "Interview answers" : "ACL-rehab-protocol.pdf",
  question: c.question, page: c.page, headingPath: c.headingPath,
});
const interviewCite = (n: number, question: string): Citation => ({
  n, chunkId: null, sourceType: "interview", sourceName: "Interview answers", question, page: null, headingPath: null,
});

let msgSeq = 0;
function msg(conversationId: string, role: "user" | "assistant", content: string, minutesAgo: number, extra: Partial<Message> = {}): Message {
  msgSeq += 1;
  return { id: `m-${msgSeq}`, conversationId, role, content, citations: [], feedback: null, costCents: null, createdAt: ago(minutesAgo), ...extra };
}

export const MESSAGES: Message[] = [
  msg("c-knee-swelling", "user", "My knee is swollen three weeks after an ACL repair. Normal?", 30),
  msg("c-knee-swelling", "assistant",
    "Usually, yes. Three weeks out, swelling that's worse at night after a busy day and better in the morning is the knee doing its job [1]. What Maria tells patients to watch for instead: swelling that's warm to the touch, that came on fast, or that comes with calf pain. Any of those means a phone call to the surgeon's office, not a home exercise [1][2].\n\nIf the pattern is the normal one, the protocol she uses is ice after activity and keeping the quad set count up, not resting more [3].\n\nHealth information, not medical care. If you're unsure, Maria's contact link is at the top.",
    29, { citations: [cite(1, CHUNKS[0]), cite(2, CHUNKS[1]), cite(3, CHUNKS[2])], feedback: "up", costCents: 4 }),
  msg("c-knee-swelling", "user", "What counts as \"warm\"?", 20),
  msg("c-knee-swelling", "assistant",
    "Maria's rule of thumb: compare it with the other knee with the back of your hand. Noticeably warmer than the other side, plus redness, is the combination she cares about [1]. Warm alone right after exercise is expected.",
    19, { citations: [cite(1, CHUNKS[1])], costCents: 4 }),
  msg("c-knee-swelling", "user", "When can I start running again?", 11),
  msg("c-knee-swelling", "assistant",
    "Maria's protocol uses three checks rather than a date: full knee extension, no swelling after a 30-minute walk, and a single-leg squat to about 60 degrees without the knee drifting inward [1]. Most people reach that somewhere after week 12, but the checks decide it, not the calendar.",
    10, { citations: [cite(1, CHUNKS[3])], feedback: "down", costCents: 4 }),

  msg("c-q3-estimate", "user", "How much should I pay for my Q3 estimate? I made about $30k so far this year.", DAY + 20),
  msg("c-q3-estimate", "assistant",
    "Dev starts from the safe-harbor rule: if you pay 100% of last year's total tax in four equal installments, you won't owe a penalty even if this year is bigger [1]. If you don't have last year's number handy, he sets aside 25-30% of net profit for federal plus self-employment tax [2].",
    DAY + 18, { citations: [interviewCite(1, "How do you decide what a freelancer should pay each quarter?"), interviewCite(2, "What percentage do you tell new freelancers to set aside?")], feedback: "up", costCents: 3 }),
  msg("c-q3-estimate", "user", "Last year my total tax was $6,200.", DAY + 5),
  msg("c-q3-estimate", "assistant",
    "Then the safe-harbor payment is $1,550 per quarter, so $1,550 for Q3 if you've paid Q1 and Q2 [1]. If your income last year was above $150,000 the rule is 110%, which would not apply here.",
    DAY, { citations: [interviewCite(1, "How do you decide what a freelancer should pay each quarter?")], costCents: 3 }),

  msg("c-essay-feedback", "user", "My essay starts with a quote from my grandmother. Is that a bad opening?", 3 * DAY + 25),
  msg("c-essay-feedback", "assistant",
    "Priya's view is that the quote itself isn't the problem; a reader skims past it looking for you [1]. Keep it only if the next sentence shows what you did with it.",
    3 * DAY + 23, { citations: [interviewCite(1, "What makes an essay opening fail?")], costCents: 3 }),
  msg("c-essay-feedback", "user", "Should I cut it then?", 3 * DAY + 2),
  msg("c-essay-feedback", "assistant",
    "Try moving it to the end. Priya often has students open on a moment instead, then let the quote land after the reader knows why it mattered [1].",
    3 * DAY, { citations: [interviewCite(1, "What makes an essay opening fail?")], costCents: 3 }),

  msg("c-shoulder-plan", "user", "What does a good week of shoulder rehab look like?", 4 * DAY + 30),
  msg("c-shoulder-plan", "assistant",
    "Maria plans shoulder weeks around three short sessions of band work and one longer session, with rest days between the harder ones [1].",
    4 * DAY + 28, { citations: [interviewCite(1, "How do you structure a week of shoulder rehab?")], costCents: 4 }),
  msg("c-shoulder-plan", "user", "How long should each band session be?", 4 * DAY + 5),
  msg("c-shoulder-plan", "assistant",
    "Fifteen to twenty minutes. Maria would rather see four short sessions done than two long ones skipped [1].",
    4 * DAY, { citations: [interviewCite(1, "How do you structure a week of shoulder rehab?")], feedback: "down", costCents: 4 }),

  msg("c-shin-splints", "user", "How do I get back to running without wrecking my shins again?", 2 * DAY + 15),
  msg("c-shin-splints", "assistant",
    "Start with the criteria Maria uses before any return to running [1], then build volume slowly: she'd cut a long run by a third for two weeks before changing anything about form.",
    2 * DAY, { citations: [cite(1, CHUNKS[3])], costCents: 4 }),
];

let ledgerSeq = 0;
function row(identityId: string | null, kind: LedgerEntry["kind"], amountCents: number, balanceAfter: number | null, minutesAgo: number, note: string, extra: Partial<LedgerEntry> = {}): LedgerEntry {
  ledgerSeq += 1;
  return { id: `l-seed-${ledgerSeq}`, identityId, kind, amountCents, balanceAfter, purpose: null, refType: null, refId: null, note, createdAt: ago(minutesAgo), ...extra };
}
const chat = (conversationId: string) => ({ purpose: "chat_message" as const, refType: "conversation" as const, refId: conversationId });

// Usage charges per conversation: hirer debit = platform cost + platform margin + expert earnings
//   knee 12 = 6 + 1 + 5 · q3 6 = 4 + 0 + 2 · essay 6 = 4 + 0 + 2 · shoulder 8 = 4 + 1 + 3 · shin 4 = 2 + 0 + 2
export const LEDGER: LedgerEntry[] = [
  // Maria Chen (expert): ends at 5,000
  row(MARIA, "seed", 2093, 2093, 25 * DAY, "Starting balance"),
  row(MARIA, "subscription", 2000, 4093, 14 * DAY, "Mock monthly plan · no payment taken"),
  row(MARIA, "pack", 1000, 5093, 6 * DAY, "Mock credit pack · no payment taken"),
  row(MARIA, "debit", -9, 5084, 5 * DAY, "ACL-rehab-protocol.pdf · 42 chunks", { purpose: "embedding", refType: "source", refId: "s-maria-acl" }),
  row(MARIA, "debit", -76, 5008, 5 * DAY - 120, "Physical therapy interview · 38 answers", { purpose: "interview_turn", refType: "interview", refId: MARIA_PT }),
  row(MARIA, "earnings", 3, 5011, 4 * DAY, "Shoulder rehab week plan · net", { refType: "conversation", refId: "c-shoulder-plan" }),
  row(MARIA, "debit", -6, 5005, 3 * DAY, "Sandbox · 2 test messages", { purpose: "sandbox_message", refType: "agent", refId: MARIA_PT }),
  row(MARIA, "earnings", 2, 5007, 2 * DAY, "Return to running after shin splints · net", { refType: "conversation", refId: "c-shin-splints" }),
  row(MARIA, "debit", -12, 4995, DAY, "Running form clinic · 6 answers", { purpose: "interview_turn", refType: "interview", refId: MARIA_RUN }),
  row(MARIA, "earnings", 5, 5000, 9, "Knee swelling after ACL repair · net", { refType: "conversation", refId: "c-knee-swelling" }),
  // Sam Okafor (hirer): ends at 5,000
  row(SAM, "seed", 2024, 2024, 25 * DAY, "Starting balance"),
  row(SAM, "subscription", 2000, 4024, 14 * DAY, "Mock monthly plan · no payment taken"),
  row(SAM, "pack", 1000, 5024, 6 * DAY, "Mock credit pack · no payment taken"),
  row(SAM, "debit", -6, 5018, 3 * DAY, "Priya Nair · College admissions · 2 messages", chat("c-essay-feedback")),
  row(SAM, "debit", -6, 5012, DAY, "Dev Patel · Tax for freelancers · 2 messages", chat("c-q3-estimate")),
  row(SAM, "debit", -12, 5000, 10, "Maria Chen · Physical therapy · 3 messages", chat("c-knee-swelling")),
  // Other seeded people
  ...["dev", "priya", "luis", "hannah", "tom", "jordan", "alex"].map((id) => row(id, "seed", 5000, 5000, 25 * DAY, "Starting balance")),
  row("jordan", "debit", -8, 4992, 4 * DAY + 10, "Maria Chen · Physical therapy · 2 messages", chat("c-shoulder-plan")),
  row("alex", "debit", -4, 4996, 2 * DAY + 10, "Maria Chen · Physical therapy · 1 message", chat("c-shin-splints")),
  row("dev", "earnings", 2, 5002, DAY, "Quarterly estimate for Q3 · net", { refType: "conversation", refId: "c-q3-estimate" }),
  row("priya", "earnings", 2, 5002, 3 * DAY, "Essay draft feedback · net", { refType: "conversation", refId: "c-essay-feedback" }),
  // Platform share (no identity)
  row(null, "platform_cost", 6, null, 9, "Raw LLM cost", chat("c-knee-swelling")),
  row(null, "platform_margin", 1, null, 9, "15% of margin", chat("c-knee-swelling")),
  row(null, "platform_cost", 4, null, DAY, "Raw LLM cost", chat("c-q3-estimate")),
  row(null, "platform_cost", 4, null, 3 * DAY, "Raw LLM cost", chat("c-essay-feedback")),
  row(null, "platform_cost", 4, null, 4 * DAY, "Raw LLM cost", chat("c-shoulder-plan")),
  row(null, "platform_margin", 1, null, 4 * DAY, "15% of margin", chat("c-shoulder-plan")),
  row(null, "platform_cost", 2, null, 2 * DAY, "Raw LLM cost", chat("c-shin-splints")),
];

export const FLAGS: Flag[] = [];

// Presentation history is explicitly marked and can never qualify as live evidence.
for (const records of [IDENTITIES, PROFILES, AGENTS, SOURCES, CHUNKS, INTERVIEW_TURNS, CONVERSATIONS, MESSAGES, LEDGER, FLAGS]) {
  for (const record of records) record.origin = "fixture";
}
