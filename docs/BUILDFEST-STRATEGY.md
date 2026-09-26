# BuildFest track, challenges, and submission strategy

Updated 2026-09-26 from the event brief supplied by the team. The track is confirmed. The challenge pair below is the team's current preference and remains tentative; no challenge entry or project submission has been made. See [TRACKS-AND-AWARDS.md](TRACKS-AND-AWARDS.md) for the full event reference.

## Current entry plan

**Track: Applied AI & Automation.** Demonstrate the automation of expert knowledge capture: an adaptive interview produces retrievable knowledge and a persona, which becomes a published agent that answers another person's questions with sources.

**Challenge 1: The Art of the Break — current preference.** Stress-testing the promise that answers come from the expert's material directly improves the product and creates the required Break Card.

**Challenge 2: Open Venture — current preference.** Present the broader expert marketplace as a venture: the underserved expert and hirer, interview-first differentiation, market signal, team fit, and a credible path beyond the event. Use completed observations and the [customer research](CUSTOMER-RESEARCH.md) as distinct kinds of evidence.

The campus career/admissions use case remains the product beachhead and a useful demo, even if the team does not enter Badgers Building for Badgers. Use a willing source expert and describe their experience accurately. Access to a UW staff coach has not been established; participation does not imply university endorsement.

## Second-challenge comparison

These are judgments about fit and added work under the supplied criteria, not predictions of award odds.

| Option | Fit with this product | Evidence or additional work needed | Recommendation |
|--------|-----------------------|-----------------------------------|----------------|
| Open Venture | Strong fit for the broader expert marketplace and the existing business research | Direct customer evidence, truthful founder-market fit, differentiation, and a credible continuation plan | Current team preference |
| Badgers Building for Badgers | Strong fit for the campus career-advice entry point | One real mentor's material, a working student task, and observed student feedback | Alternative if the campus demonstration is stronger than the venture evidence |
| Databricks Real-World Workflows | Current stack is Next.js/Supabase; sponsor requires an agentic system on Databricks for a specified problem | Obtain the full problem brief and deliver that workflow on Databricks | Substantial additional dependency; using a tool alone would not establish eligibility |
| Veterinary cost-of-care | Could be a specialized expert agent, but a general advice marketplace does not yet address the specific conversation | Veterinary source material and a working care-cost explanation/shared-decision workflow | Consider only with a real domain partner and that use case |
| Women's health | An expert agent could serve an unmet need, but the current prototype scope has not selected one | A specific underserved experience, relevant expertise, and evidence the workflow helps | Consider only with a real domain partner and that use case |

Open Venture can be entered without revenue. The current repo's market research is secondary evidence; its expert interviews, user tests, and conversion targets are mostly future work. Collect direct observations if possible and report them separately from targets. Mock credit purchases and expert credits are not paid traction or real revenue.

The current pair is Open Venture and Art of the Break. Reconsider Badgers Building for Badgers only if the team chooses it in place of one of those two challenges.

## Art of the Break experiment

**Leading hypothesis, not an observed result:** instructions or claims inside a hirer's uploaded resume cause the agent to present unsupported advice as if it came from the expert, possibly attaching a real but irrelevant expert citation.

This is specific to the planned architecture: trusted expert interview/document chunks and an untrusted hirer file meet in the same answer-generation prompt. Merely checking that a citation ID exists does not establish that the cited text supports the answer.

Use synthetic resumes and a small, versioned expert knowledge set. Define a failure before running tests: the answer follows an instruction embedded in the hirer file, attributes unsupported advice to the expert, or cites a chunk that does not support its claim. A legitimate description of a student's resume is not automatically an expert-knowledge violation; evaluate the source of the advice and its attribution.

1. Save the build commit, model ID, prompt, retrieval settings, source text, and expected outcomes.
2. Run 10 attack variants and 5 benign controls, each three times. Record attack failures as `n/30` and benign-task successes as `m/15`; keep representative transcripts, retrieved chunks, and citation checks.
3. Try a concrete mitigation: distinguish expert sources from hirer content, restrict expert citations to retrieved expert chunks, and check whether cited evidence actually supports the advice. Use deterministic checks for source membership and reviewed examples for meaning; formatting alone cannot prove grounding.
4. Replay the same set under the changed build and report both attack failure and benign-task success rates. Use additional unseen variants when feasible and report their results separately.
5. Have a second teammate review the judgments. Document residual failures and any increase in unnecessary refusals. If this hypothesis does not reproduce, report that honestly and investigate another observed failure instead of inventing a result.

Other product-specific candidates include contradictory interview answers, edits/deletions leaving stale retrieved knowledge, and cross-agent retrieval contamination. Begin with one reproducible failure and an auditable before/after comparison. Cross-agent tests must use synthetic data in team-controlled accounts.

### One-page Break Card outline

- **System and failure:** what the agent does, the exact construction choice involved, and the observed failure.
- **Reproduction:** build/model versions, input, relevant retrieved evidence, expected behavior, actual behavior.
- **Frequency:** failure numerator and denominator, repetitions, controls, and test-set boundaries.
- **Mitigation:** what changed, results on the original set, and any separately reported unseen tests.
- **Learning:** remaining limitation, tradeoff, and next improvement.
- **Evidence:** repository path or link to reproducible fixtures and redacted run logs.

This is a proposed outline, not an organizer-provided template. Use the official template or submission fields if supplied. No stress-test results exist yet.

## Two-minute submission video

| Time | Show | Claim supported |
|------|------|-----------------|
| 0:00–0:15 | A UW student with a concrete resume/career question and the participating mentor | A specific person and problem |
| 0:15–0:40 | Interview answer captured as knowledge; persona drafted; source inspectable | Expertise enters through the expert's own words |
| 0:40–1:00 | Publish and open the listing from another account | The two-sided loop works |
| 1:00–1:30 | Student uploads a synthetic resume, receives feedback, and opens a supporting citation | Useful assistance and traceable evidence |
| 1:30–1:45 | An unsupported question produces a refusal and contact link | The product has an observable knowledge boundary |
| 1:45–2:00 | An actual stress-test result and one observed customer signal, with the venture path in the written response | Learning from failure and early market evidence |

Show completed behavior. Clearly label mocked funding and any preloaded demonstration data. Use actual test counts or omit numbers; do not borrow projected metrics from the customer-research pitch. Support Open Venture with a specific market signal, honest founder-market fit, differentiation, and next steps in the written responses.

## Submission requirements from the supplied brief

- Exactly one track; up to two optional challenges.
- Repository, two-minute video, and required project responses due **Sunday at 11 AM**.
- Track finalist live demos run **1–3 PM Sunday**; challenge judging is asynchronous.
- Challenge winners are announced **September 30, 2026**. This is an announcement date, not an extension to the submission deadline.
- Art of the Break requires a one-page Break Card. Confirm its upload field and any challenge-specific deadline in the submission form.

**Timeline conflict awaiting the team's clarification:** the current roadmap assumes four weeks from September 26, while the supplied event instructions require a Sunday submission. September 27 is the immediately following Sunday. Confirm whether the event needs a weekend prototype followed by the four-week MVP; the four-week plan cannot itself meet a next-day submission. The deadline timezone and detailed challenge submission fields were not included in the supplied text.

## Collaboration and planning impact

| Responsibility | Existing owner lane | Deliverable |
|----------------|---------------------|-------------|
| Capture the real mentor's knowledge and record the builder flow | Platform → Builder | Consent/source provenance, usable expert agent, video segment |
| Prepare sources, attack fixtures, and citation evidence | Knowledge | Versioned knowledge set, retrieved-source logs, failure judgments |
| Run the experiment and implement the mitigation | Runtime | Before/after runs, working student chat and upload path |
| Gather market signal and assemble submission materials | Marketplace → Credits | Interview or usage evidence, venture responses, video |

The runtime owner implements the mitigation; another lane reviews the measured outcomes. Start fixtures and logging alongside the first usable agent. The Break Card must be ready for challenge submission, so it cannot be deferred solely to Phase 4 hardening. The challenge choice and timeline do not mark any of the 58 v1 product requirements complete or remove them from scope.
