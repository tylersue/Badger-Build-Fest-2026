# Requirements: Expert Agent Platform

**Defined:** 2026-09-26
**Core Value:** An expert with no audience and no technical skill can put their knowledge into an agent that answers in their words, grounded only in what they actually said and wrote, and earn from it.

## v1 Requirements

Requirements for the working MVP loop (BUILD → PUBLISH → HIRE → USE). Each maps to a roadmap phase.

### Accounts

- [ ] **AUTH-01**: User can sign up and sign in with email or Google and stay signed in across sessions
- [ ] **AUTH-02**: One account can both build agents and hire agents; no separate account types
- [ ] **AUTH-03**: User can fill an expert profile: display name, photo, field, credentials (labeled self-reported), years of experience, contact link
- [ ] **AUTH-04**: Admin access is granted by an email allowlist in config

### Interview (primary knowledge intake)

- [ ] **INTV-01**: Expert can start an interview for a new agent in which an interviewer agent asks one open-ended question at a time and adapts follow-ups to previous answers (follows threads, challenges vague answers, asks for concrete examples)
- [ ] **INTV-02**: Every interview answer is stored as a retrievable knowledge chunk (embedded, tagged with the question it answered and the agent it belongs to)
- [ ] **INTV-03**: Expert can pause the interview and resume later from where they left off
- [ ] **INTV-04**: Expert can see the list of captured answers and edit or delete any of them; edits re-embed, deletes remove the chunk
- [ ] **INTV-05**: The opening questions capture who the expert is and how they work, and the platform drafts the persona form from those answers
- [ ] **INTV-06**: Each interview turn is metered and deducts its real LLM cost from the expert's wallet
- [ ] **INTV-07**: Interview input is typed text; the pipeline accepts an answer as plain text so a voice transcript can feed it later without changes

### Persona

- [ ] **PERS-01**: Expert can review and edit a short persona form prefilled from the interview: name, category (fixed list), headline, description, how I work, always-do, never-do, example questions, greeting
- [ ] **PERS-02**: The system prompt is generated from the persona form by a template; an Advanced toggle shows the raw prompt and allows editing
- [ ] **PERS-03**: The LLM model for an agent is set by the platform per category (config), not chosen by the expert

### Documents (optional knowledge intake)

- [ ] **DOCS-01**: Expert can upload PDF, DOCX, TXT, or MD files, or paste text, as additional knowledge
- [ ] **DOCS-02**: Each source shows a status (queued, processing, ready, failed) and its chunk count; deleting a source removes its chunks
- [ ] **DOCS-03**: Documents are parsed with page or heading metadata, chunked, and embedded; embedding cost is deducted from the expert's wallet at real cost
- [ ] **DOCS-04**: Per-agent limits are enforced and shown (files, total size, chunk count)

### Retrieval

- [ ] **RETR-01**: Retrieval returns the top-k most relevant chunks for a query from one agent's knowledge only, across interview answers and documents
- [ ] **RETR-02**: Every retrieved chunk carries a citation: source type (interview or document), source name or question, and page or heading
- [ ] **RETR-03**: A test proves that retrieval for agent A never returns chunks from agent B, since the retrieval path uses the service role and is not protected by RLS

### Sandbox

- [ ] **SBOX-01**: Expert can chat with their own agent before publishing, through the same pipeline hirers use, charged at raw cost with no multiplier
- [ ] **SBOX-02**: The sandbox shows, for each answer, which chunks were retrieved and their relevance scores

### Publish

- [ ] **PUB-01**: Expert sets a rate multiplier from 1x to 5x on raw LLM cost; the listing shows the resulting typical cost per message
- [ ] **PUB-02**: Expert must accept a consent checkbox at first publish (expert owns their content, platform gets a limited license to serve it through this agent only, no training on it)
- [ ] **PUB-03**: Expert can publish instantly once the persona is complete and the agent has a minimum number of knowledge chunks; can unpublish instantly
- [ ] **PUB-04**: A listing page is generated from the persona form and expert profile with no extra input

### Marketplace

- [ ] **MKT-01**: Visitor sees a landing page that explains building and hiring, with a call to action for each
- [ ] **MKT-02**: Hirer can browse published agents in a grid, filter by category, sort by rating, newest, or most used, and search by text
- [ ] **MKT-03**: Listing page shows expert card (photo, credentials, years, self-reported label), headline, description, clickable example questions, rating and count, typical cost per message, "knowledge last updated," and the category disclaimer where required
- [ ] **MKT-04**: Hirer can start a conversation from the listing, including by clicking an example question that is sent as the first message
- [ ] **MKT-05**: Hirer can rate an agent from 1 to 5 stars after five or more messages, once per agent; the listing shows the average and count
- [ ] **MKT-06**: Anyone can flag an agent from its listing or chat; flags go to an admin queue

### Chat

- [ ] **CHAT-01**: Hirer sends a message and sees the agent's answer stream in
- [ ] **CHAT-02**: Answers are grounded in the agent's knowledge and cite sources inline; hovering a citation shows the source name and page or question
- [ ] **CHAT-03**: When retrieval is weak, the agent says it does not have that in its knowledge and points to the expert's contact link instead of guessing
- [ ] **CHAT-04**: Hirer can upload one file (PDF, DOCX, or TXT) into a conversation; its text is extracted and included in that conversation's prompt as untrusted content
- [ ] **CHAT-05**: Agents in regulated categories (health, tax/finance, legal, mental health) show a fixed disclaimer in the first reply, and the disclaimer rule is present in the system prompt on every turn
- [ ] **CHAT-06**: Messages matching emergency or self-harm patterns get a fixed resource reply instead of an agent answer, and the conversation is flagged
- [ ] **CHAT-07**: Conversation history is windowed to recent turns so long conversations keep working
- [ ] **CHAT-08**: Hirer can thumbs up or down any answer
- [ ] **CHAT-09**: Hirer can opt in, per conversation, to share the transcript with the expert; the default is off
- [ ] **CHAT-10**: Conversations persist; hirer can return to any past conversation and continue
- [ ] **CHAT-11**: Chat header shows the agent name, the expert, a "contact the expert" link, and the hirer's wallet balance
- [ ] **CHAT-12**: After each reply, the chat shows what that message cost in credits

### Credits (purchases mocked, metering real)

- [ ] **CRED-01**: Every account has one wallet; 1 credit = 1 cent; the balance is visible in the app shell
- [ ] **CRED-02**: Every LLM call is logged with tokens in and out, model, purpose, latency, and computed cost
- [ ] **CRED-03**: Building actions (interview turns, document embedding, sandbox messages) deduct real cost from the builder's wallet after the call completes
- [ ] **CRED-04**: A chat message charges the hirer real cost × the agent's rate multiplier; the ledger records the hirer debit, the platform's cost recovery, the platform's margin share (configurable, default 15%), and the expert's credit
- [ ] **CRED-05**: Before any metered call, the platform checks the wallet covers a typical call; if not, it shows a top-up prompt instead of running the call
- [ ] **CRED-06**: User can "subscribe" to a mock monthly plan that grants a configured number of credits, and "buy" mock credit packs; both write ledger rows and update the balance with no real payment
- [ ] **CRED-07**: New accounts receive a configured free credit grant
- [ ] **CRED-08**: Expert sees an earnings page: per-conversation gross, platform share, and net credited, plus a wallet history of every debit and credit
- [ ] **CRED-09**: Expert can request a mock cash-out that deducts credits and records a payout row at 1 cent per credit with status "requested"
- [ ] **CRED-10**: A daily platform-wide LLM spend cap stops new metered calls when exceeded

### Expert insights

- [ ] **EXPT-01**: Expert sees aggregates for each agent: conversations, messages, top questions asked, thumbs-down count
- [ ] **EXPT-02**: Expert can read the transcripts that hirers opted to share, and only those

### Admin

- [ ] **ADMN-01**: Admin can see flagged agents and flagged conversations and unpublish an agent with a note

## v2 Requirements

Deferred. Tracked but not in the current roadmap.

### Interview
- **INTV-V2-01**: Voice answers with speech-to-text feeding the same pipeline
- **INTV-V2-02**: Coverage map showing which topics the interview has covered and suggesting what to ask next
- **INTV-V2-03**: "Correct this answer" in the sandbox creates a pinned knowledge chunk

### Knowledge
- **DOCS-V2-01**: URL ingestion
- **RETR-V2-01**: Hybrid search (vector + full-text with reciprocal rank fusion)
- **RETR-V2-02**: Exact-quote citations via Anthropic search-result blocks

### Marketplace
- **MKT-V2-01**: Expert public profile page listing their agents
- **MKT-V2-02**: Featured row curated by admin
- **MKT-V2-03**: Written reviews alongside star ratings
- **MKT-V2-04**: Identity verification and a "Licensed" badge checked against public registries

### Credits and payments
- **CRED-V2-01**: Real payment rails (Stripe Checkout for packs and subscriptions, Stripe Connect for cash-outs)
- **CRED-V2-02**: Lower platform share when the hirer arrives via the expert's own link

### Admin
- **ADMN-V2-01**: Pre-publish review queue
- **ADMN-V2-02**: Metrics dashboard (agents, conversations, revenue, LLM cost)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice, video, or avatar clones | Expensive, not the value; Delphi's most costly feature |
| Visual workflow or graph builder; agent tools or web access | The visual-builder tier collapsed in 2026; our agent is persona + knowledge + fixed pipeline |
| Per-agent subscriptions, allowances, or free trials | Replaced by the single wallet and a free grant |
| Teams, SSO, audit logs | Not needed for the loop |
| Mobile apps | Web first |
| Fine-tuning | Prompt + retrieval only |
| Second LLM provider or expert-chosen model | One provider; model set per category by the platform |
| Third-party or celebrity clones | Only the expert can build an agent of themselves |
| Exact pricing numbers (grant size, plan tiers, take percentage) | Config constants, tuned after the loop works |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (filled by roadmap) | | |

**Coverage:**
- v1 requirements: 58 total
- Mapped to phases: 0
- Unmapped: 58 ⚠️

---
*Requirements defined: 2026-09-26*
*Last updated: 2026-09-26 after initial definition*
