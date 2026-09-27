/**
 * Every line typed in the one-minute demo (docs/DEMO-SCRIPT.md), written the way a
 * person types. script.test.ts checks each one produces its hardcoded result, so the
 * recording can't hit a surprise. Change a line here and in the script together.
 */
export const SCRIPT = {
  hire: "hey, we're building proxier. it's a marketplace where first-time founders hire AI agents built by real experts. can you poke holes in it?",
  investor: "ok, what would make an investor pass on us?",
  document: "here's our one-pager. what would you change before we send it to investors?",
  agentName: "Cynthia Pham · Finding your first customers",
  interview: [
    "Stop building and go where your customers already hang out. Every week someone asks me where to find their first customers, and that's always my answer. I make every founder I work with write down ten real people with phone numbers before they touch more code.",
    "It breaks for deep tech. If you're building a new battery, you're not pre-selling ten customers in a week. The red flag is someone using that as an excuse for a scheduling app. If you can prototype it in a weekend, customers come first.",
  ],
  test: "I have zero customers right now. where do I even find the first ones?",
  feedback: "hmm, I don't love that it just quotes me word for word. talk like me, keep it short, and end with something they can actually do this week.",
} as const;
