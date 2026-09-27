/**
 * The experts' own published work (essays, podcast episodes, talks). Fictional
 * demo content: answers cite the piece where the expert goes deeper, and each
 * one opens as a page inside the app at /sources/<id>, so no link ever leaves it.
 */
export type ExpertMedia = {
  id: string; agentId: string; ownerId: string; kind: "Essay" | "Podcast" | "Talk" | "Newsletter";
  title: string; outlet: string; published: string; minutes: number; keywords: string; excerpt: string; body: string[];
};

export const EXPERT_MEDIA: ExpertMedia[] = [
  { id: "dev-raise-for-a-milestone", agentId: "dev-patel-fundraising", ownerId: "dev", kind: "Essay",
    title: "Raise for a milestone, not a feeling", outlet: "Term Sheet Notes", published: "Aug 12, 2026", minutes: 6,
    keywords: "raise pre-seed round wait now milestone runway how much money investors timing",
    excerpt: "The best pre-seed rounds I saw were raised to buy one specific thing: a paid pilot, a first engineer, a regulatory approval. The worst were raised because a friend had just raised.",
    body: [
      "After sitting on the investor side of more than a thousand pitches, the pattern that predicts a good pre-seed round isn't the deck or the market. It's whether the founder can name the milestone the money buys.",
      "The best pre-seed rounds I saw were raised to buy one specific thing: a paid pilot, a first engineer, a regulatory approval. The worst were raised because a friend had just raised, or because the founder felt they were supposed to.",
      "So before you raise, write down the next milestone that would make the following round easy. Then ask whether you can reach it on savings, a part-time job, or revenue. If you can, wait. Evidence is the cheapest way to improve your terms.",
      "When you do raise, work backwards: months of burn to reach that milestone, plus the months it takes to raise again, plus 20 percent for the surprises every company has. For most first-time founders that lands at 18 to 24 months of runway.",
    ] },
  { id: "dev-what-partners-read-first", agentId: "dev-patel-fundraising", ownerId: "dev", kind: "Podcast",
    title: "Episode 41: What partners read first", outlet: "Founder Hours", published: "Jul 3, 2026", minutes: 38,
    keywords: "pitch deck traction slide waitlist partner review deck order team ask",
    excerpt: "A partner decides in about three minutes whether to keep reading. If your traction is on slide nine, it might as well not exist.",
    body: [
      "In this episode Dev walks through how a seed partner actually reads a deck on a Monday morning, slide by slide.",
      "\"A partner decides in about three minutes whether to keep reading. If your traction is on slide nine, it might as well not exist. Move it to slide two, even if the numbers are small.\"",
      "Dev's order: traction, team, the ask, and then everything that supports those three. Small but growing beats big and flat, and a waitlist with names on it counts as traction if you can show it growing week over week.",
      "The episode ends with a teardown of three anonymized decks and the one change that would have gotten each a second meeting.",
    ] },
  { id: "cynthia-circle-the-assumption", agentId: "cynthia-pham-idea-stress-test", ownerId: "maria", kind: "Essay",
    title: "Circle the assumption you can't prove", outlet: "Cynthia Pham's blog", published: "Sep 2, 2026", minutes: 5,
    keywords: "stress test idea riskiest assumption problem pays customer validate investor pass",
    excerpt: "Write down everything that has to be true for the business to work. Then circle the one you have the least evidence for, and test that before you write any code.",
    body: [
      "Every founder I mentor gets the same first exercise. Write down everything that has to be true for the business to work. Then circle the one you have the least evidence for, and test that before you write any code.",
      "For most student founders the circled line is the same: that the person who has the problem is also the person who pays. Club officers feel the pain of scheduling; student government holds the budget. Founders feel the pain of bad advice; accelerators and universities hold the budget.",
      "Investors run the same exercise in their heads. They pass when the market looks small, when there's no answer to why now, or when the product looks like a feature a bigger company will ship. Each of those is an assumption you can test cheaply.",
      "The founders who move fastest are not the ones with the best product. They're the ones who found out soonest which of their assumptions was wrong.",
    ] },
  { id: "cynthia-ten-names-before-code", agentId: "cynthia-pham-idea-stress-test", ownerId: "maria", kind: "Talk",
    title: "Ten names before code", outlet: "Madison Startup Week 2026", published: "Apr 18, 2026", minutes: 22,
    keywords: "first customers ten names reach week segment go-to-market find",
    excerpt: "If you can't write down ten real people with a phone number who had this problem last week, your go-to-market is the risk, not your product.",
    body: [
      "Cynthia's talk at Madison Startup Week opened with a slide that just said \"10\".",
      "\"If you can't write down ten real people with a phone number who had this problem last week, your go-to-market is the risk, not your product. Not a segment on a slide. Ten names.\"",
      "The talk walks through three founders who made the list, called everyone on it in one week, and changed their product based on what they heard, including one who discovered the buyer was a different person entirely.",
    ] },
  { id: "priya-stop-asking-about-the-future", agentId: "priya-nair-customer-discovery", ownerId: "priya", kind: "Newsletter",
    title: "Stop asking customers about the future", outlet: "The Discovery Log", published: "Aug 28, 2026", minutes: 4,
    keywords: "customer interview questions script past future pay how many interviews",
    excerpt: "\"Would you use this?\" is the most expensive question in startups. Everyone says yes, and nobody means it.",
    body: [
      "\"Would you use this?\" is the most expensive question in startups. Everyone says yes, and nobody means it.",
      "Ask about the last time instead: the last time you scheduled a meeting, hired an advisor, or chased a room approval. What did you use? What was annoying? What did it cost you?",
      "Keep going until you can predict what the next person will say. For one segment that's usually 15 to 20 conversations. If every interview still surprises you, the segment is too broad.",
    ] },
  { id: "tom-the-40-percent-question", agentId: "tom-reyes-product-market-fit", ownerId: "tom", kind: "Podcast",
    title: "The 40% question", outlet: "Growth Unfiltered", published: "Jun 20, 2026", minutes: 31,
    keywords: "product market fit retention metrics signups flat growth stalled",
    excerpt: "Ask your active users how they'd feel if they couldn't use the product anymore. Forty percent saying very disappointed is the line.",
    body: [
      "Tom explains the one survey question he trusts more than any dashboard.",
      "\"Ask your active users how they'd feel if they couldn't use the product anymore. Forty percent saying very disappointed is the line. Below that, more acquisition just fills a leaky bucket.\"",
      "The second half covers what to do when signups go flat: interview the five most active users, find what they share, and rebuild onboarding around them.",
    ] },
  { id: "hannah-runway-is-a-habit", agentId: "hannah-kim-startup-finance", ownerId: "hannah", kind: "Essay",
    title: "Runway is a monthly habit", outlet: "The Fractional CFO", published: "Aug 5, 2026", minutes: 4,
    keywords: "runway burn cash pricing metrics investors money price",
    excerpt: "Cash in the bank divided by net monthly burn. Recalculate it every month, and start fundraising before it drops under nine months.",
    body: [
      "Runway is not a number you work out once for a pitch deck. It's a habit.",
      "Cash in the bank divided by net monthly burn: what goes out minus what comes in. Recalculate it every month, and start fundraising before it drops under nine months.",
      "The same habit makes pricing easier. When you know your burn to the dollar, a price test stops feeling like a risk and starts looking like runway.",
    ] },
  { id: "luis-founder-led-sales", agentId: "luis-ortega-b2b-go-to-market", ownerId: "luis", kind: "Talk",
    title: "Founder-led sales is a skill, not a personality", outlet: "Twin Cities SaaS Meetup", published: "May 14, 2026", minutes: 26,
    keywords: "cold email first customers sales hire salesperson outbound pitch",
    excerpt: "Three sentences: one about them, one about the problem, one small ask. No deck, no attachments, no pricing.",
    body: [
      "Luis's talk on the first ten customers, and why founders have to close them personally.",
      "\"Three sentences: one about them, one about the problem, one small ask. No deck, no attachments, no pricing.\"",
      "Hire a salesperson only after you've closed ten customers with a repeatable pitch. A salesperson scales a process; they don't invent one.",
    ] },
];

export const mediaById = (id: string) => EXPERT_MEDIA.find((item) => item.id === id);
export const mediaUrl = (item: ExpertMedia) => `/sources/${item.id}`;
