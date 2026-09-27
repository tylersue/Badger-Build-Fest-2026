# BuildFest demo evidence — September 27, 2026

Use this as a two-minute recording guide and claim checklist. The [browser QA log](SITE-QA-2026-09-27.md), [Break Card](ART-OF-THE-BREAK-CARD.md), and [experiment manifest](../tests/art-of-break/evidence/README.md) hold the underlying observations. The local demo uses synthetic identities and content; it is not a recorded student outcome or university endorsement.

| Time | Show in the local site | Claim supported by the observed run |
|---|---|---|
| 0:00–0:20 | Builder Interview for `Acceptance 8262cb34`; show the saved client-meeting answer. | An interview answer is saved as expert knowledge. |
| 0:20–0:40 | Knowledge list: five original ready sources plus the new synthetic pasted source; open the upload preflight if useful. | PDF, DOCX, TXT, Markdown, and pasted source states render; the additional text source processed to Ready with one indexed chunk. |
| 0:40–1:00 | Persona and Publish checklist on the indexed draft, then Maria's existing published marketplace listing. | The checklist enforces its fields, knowledge threshold, and consent. A seeded listing is browseable; the indexed draft remains unpublished because its legal content consent is unapproved. |
| 1:00–1:30 | Builder Test for `Acceptance 8262cb34`: show the single saved live question, Luna answer, citation chip, and citation popover. | The live answer says the expert asked about the client's goals and tried a shorter plan. Its citation opens the saved interview answer containing that advice. The operation settled at 0.033482 credits. |
| 1:30–1:50 | Break Card's measured counts and the real `c03` before/after Luna excerpts. | Thirty attack attempts had zero unsafe outcomes in each full pass. The final reviewer replay delivered 14/15 benign tasks, while the revised prompt restored SQL personalization in all three `c03` runs. Six later adaptive attacks also produced no unsafe answer; the separate reviewer unnecessarily blocked one safe answer. |
| 1:50–2:00 | The Break Card's limit and the browser QA finding on the seeded Maria fixture. | The experiment used synthetic résumés and fixed retrieval. The marketplace fixture has no active indexed chunks, so its saved citation UI is not presented as a fresh grounded answer. |

## Recording notes

- The live citation evidence comes from the indexed draft's **Test** view. Maria's seeded marketplace conversation is useful for UI demonstration only.
- The SQL integration test in `tests/integration/phase3.live.test.ts` has exercised guarded publish, conversation creation, and a settled ledger split with synthetic records. It did not deliver a real Luna answer from this indexed draft to a marketplace buyer. The draft's publish checkbox was not accepted in browser QA.
- Show the synthetic résumé examples as synthetic. The experiment used ten attack variants and five benign controls, each three times; five unseen variants were scored separately.
- No paid purchase, real payment integration, genuine student feedback, or new publish action was verified. Do not imply those occurred.
- The card is available as [a one-page PDF](../output/pdf/Art-of-the-Break-Card.pdf) for the challenge upload. The repository source and metered transcripts are linked from the card.
