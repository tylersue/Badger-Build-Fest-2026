# Proxier demo script

Everything in this demo is hardcoded and runs in the browser. There's no database, no API key and no network, and the same input always gives the same result. Mock funding and preloaded data are labeled in the app.

## Before you record (5 minutes)

1. Run `pnpm install`, then `pnpm demo`, and open <http://localhost:3000>. `pnpm demo` turns on demo mode for you; the alternative is `NEXT_PUBLIC_DEMO_MODE=1` in `.env.local` with `pnpm dev`.
2. Nothing else is needed: no database, no keys. Use Chrome at about 1440 px wide and 100% zoom, with devtools closed.
3. Open **Settings → Reset demo data**. This restores every agent, chat and wallet to the starting state. Do it before every take.
4. Use the switcher at the bottom of the sidebar to switch to **Austin Han (buyer)**.
5. Have `docs/demo/Proxier-one-pager.md` ready in Finder for the upload.

The cast:

- **Austin Han** is the buyer: a first-time founder building Proxier itself. In the demo, the team stress-tests its own startup on Proxier.
- **Cynthia Pham** is the expert: a 2x founder and angel investor who sells agents on Proxier.

---

## Scene 1: The problem (0:00–0:20)

**Show:** the Marketplace, scrolling slowly.

**Voiceover:**
> AI helps startups build software fast. It doesn't help founders make the right decisions: how an investor will see the idea, what a customer will actually pay for. Accelerators and mentors give that guidance, but founders without backing don't have it. That's why we built Proxier. Think Fiverr, but you hire agents: agents built by experts and founders who've been through it, grounded in their own knowledge.

## Scene 2: A founder hires an expert (0:20–0:55), as Austin Han

**Voiceover:** "We're building a startup for the first time. We need to stress-test the idea, find product-market fit and get feedback. So I'll hire some experts through Proxier."

1. On **Marketplace**, click the **Validation & research** filter.
2. Open **Cynthia Pham · Idea stress test**. Point at the rating, reviews, credentials and benchmark score.
3. Click **Buy · 2,000 credits**. The checkout shows what's included, the price and Austin's balance before and after. Click **Buy now**. You'll see **Added to My agents**, and the agent appears under **My agents** in the sidebar marked *Bought*.
4. Click **Start using it**, then type:
   > Stress-test my idea: a marketplace where founders hire AI agents built by experts

   The answer streams in with numbered citations, including one of Cynthia's own essays, and the caption reads **Included with your purchase**. Click a citation chip, for example **[2]**, to show the exact interview answer it came from. Open the essay citation and click **Read the full essay** to show Cynthia's published piece.
5. Click **Attach a file** and choose `docs/demo/Proxier-one-pager.md`. Type:
   > Review our one-pager

   The agent reads the file, picks out the strongest evidence in it ("6 hours a week…"), and lists what Cynthia would push on, each point cited.
6. Show the knowledge boundary. Type:
   > How do we research our competitors?

   Cynthia's knowledge doesn't cover it, so the agent says so, searches online, and labels the answer as an online source that is **not** Cynthia's knowledge. The tool steps show the search.
7. Open **My agents** to show the bought agent, then **Wallet** to show the purchase.

## Scene 3: Who builds the agents? (0:55–1:05)

**Voiceover:** "Who's actually selling these agents, and why trust them? Industry experts and experienced founders who want to earn from what they know. No technical skill needed: Proxier interviews them and builds an agent that thinks like them, a proxy that represents them."

1. Switch to **Cynthia Pham (expert)** with the sidebar switcher.

## Scene 4: The interview builds the agent (1:05–1:30), as Cynthia Pham

1. Click **New agent**. Set the name to `Cynthia Pham · Finding your first customers` and the category to **Validation & research**, then click **Start interview**.
2. Click **Start interview** again. The interviewer asks three questions, and each follow-up quotes the last answer back. Paste these answers and press Enter after each one.

   **Answer 1**
   > Where do I find my first customers? I tell founders to stop building and go where their customers already gather. Every founder I mentor has to name ten real people with a phone number before writing more code.

   **Answer 2**
   > A student building a tutoring app spent four months on features. I asked who had paid for tutoring last semester and the founder couldn't name anyone. We made a list of twenty parents in one week, called all of them, and six signed up for a paid pilot.

   **Answer 3**
   > It breaks for deep tech. If you're building a new battery, you can't pre-sell ten customers in a week. The red flag is a founder who uses that as an excuse for a scheduling app. If your product takes a weekend to prototype, customers come first, always.

3. After the third answer, the **Building…** panel runs step by step: **knowledge base** (answers indexed as chunks) → **task system** (tasks mapped from the answers) → **agent VM** (isolated runtime provisioned) → **hosting** (live URL).

## Scene 5: Persona, test and "just say it" fixes (1:30–1:45)

1. Open the **Persona** tab. **Voice & tone** was drafted from how Cynthia answered: tone traits such as *Direct* and *Teaches with real stories*, and how the agent talks back, with a sample reply.
2. Open the **Test** tab and type:
   > Where do I find my first customers for a study app?

   The answer quotes Cynthia's interview, with citations.
3. **Voiceover:** "Don't like something? Just say it."

   Type:
   > I don't like that it quotes me word for word. Talk like me, keep it short, and end with a next step.

   The agent replies **"Fixed."**, lists what changed and saves the rules to the persona. It then re-answers the last question in Cynthia's own voice, shorter, ending with *Next step: …*. The persona's Voice & tone now shows the new settings.

## Scene 6: Publish, price and credibility (1:45–2:00)

1. Open the **Publish** tab. Set the rate multiplier to **3×** (the price), tick the content consent, and click **Publish**.
2. Click **View** (or open the Marketplace) to show the live listing.
3. Open **Benchmarks** to show Proxier agents, including Cynthia's new one, scored and ranked.
4. Open **Earnings** to show the money Cynthia's agents have earned.

**Closing line:** "Experts earn from what they know. Founders get guidance they couldn't get before. That's Proxier."

---

## Live demo (finalists, 1–3 PM)

Follow the same scenes at a slower pace. Good extra questions for Cynthia's **Idea stress test** listing:

- "What would make an investor pass on this?" (a scripted answer with citations)
- "Who should my first ten customers be?" (a scripted answer with a citation)

For Dev Patel's **Fundraising** agent:

- "Should we raise a pre-seed now or wait?"

## If something goes wrong

- **The page looks stuck or a chat didn't open:** refresh. Everything is saved in the browser.
- **The data looks wrong, or you need to redo a take:** go to **Settings → Reset demo data**.
- **You're on the wrong identity:** use the switcher at the bottom of the sidebar.
- **An answer is slow:** Chrome slows timers in background windows, so keep the demo window in front.
