---
phase: 2
slug: interview-first-agent-building
status: approved
reviewed_at: 2026-09-27T00:30:56Z
shadcn_initialized: true
preset: b0 (detected; custom CSS theme overrides)
created: 2026-09-26
---

# Phase 2 — UI Design Contract

Scope: interview, persona, knowledge intake, and sandbox. Inherit the LangSmith-style shell from `../01-shell-wallet-shared-contracts/01-UI-SPEC.md` and its `refs/` screenshots. Phase 2 decisions D-01–D-11 take precedence for these interactions. Shared chat presentation supports Phase 3's hirer integration.

## Design System

| Property | Contract |
|---|---|
| Tool / library | Existing shadcn, Radix, Tailwind v4; `components/ui/` add-only |
| Preset | `shadcn info` reports `b0`, `radix-nova`, neutral base, Lucide, Inter. Actual colors are the custom tokens in `app/globals.css`; do not reset from preset defaults. |
| Font / icons | Existing Inter; tabular credit amounts. Lucide icons at 16px, decorative icons hidden from assistive technology. |
| Theme | Existing dark theme; no new visual system |
| Reuse | `components/app/builder.tsx`, `builder-section.tsx`, `chat.tsx`, `add-credits.tsx`; section routes remain addressable. |

Sources: Phase 1 UI/context, Phase 2 context, requirements, existing components/CSS, and successful installed `shadcn info` inspection. Phase 2 RESEARCH.md does not exist yet; provider choices and exact source limits remain planning inputs. Defaults below cover unspecified UI behavior.

## Spacing Scale

| Token | Value | Use |
|---|---|---|
| xs | 4px | Icon/text gaps, compact chip padding |
| sm | 8px | Row gaps, related actions |
| md | 16px | Cards, composer, drawer sections |
| lg | 24px | Section separation, page gutters |
| xl | 32px | Major content gaps |
| 2xl | 48px | Empty-state spacing |
| 3xl | 64px | Empty thread top spacing |

No spacing exceptions. Inherit fixed geometry: 244px sidebar, 752px maximum chat width, 480px Configure drawer, 40px thread header, 96px minimum composer height. Radii: 4px controls, 12px containers, pill radius for badges. New touch controls have at least 44px targets; compact glyphs can sit inside them.

## Typography

Constrain new or substantially changed Phase 2 controls to this subset of the existing Inter scale; shared shell typography stays governed by Phase 1.

| Role | Size | Weight | Line height |
|---|---|---|---|
| Metadata / credit caption | 12px | 400 | 1.5 |
| Form body / controls | 14px | 400; 600 for labels and buttons | 1.5 |
| Chat body / section heading | 16px | 400 body; 600 heading | 1.5 body; 1.25 heading |
| Page title | 24px | 600 | 1.25 |

## Color

| Role | Value | Use |
|---|---|---|
| Dominant (60%) | `#09090f` | Main background |
| Secondary (30%) | `#0d0f18`, `#111521`, `#1b2030` | Drawer/cards, composer, fields/chips |
| Accent (10% maximum) | `#006ddd` fill, `#0078f1` ring, `#5fbef8` links on dark surfaces | Primary action, selected section, citation links, keyboard focus |
| Destructive | `#f04438` fill, `#f97066` text on `#55160c` | Delete confirmations and actionable errors |
| Semantic status | `#46cd89` success; `#fdb022` warning | Ready/saved and low balance/processing notices, always accompanied by text |
| Text / borders | `#f5f8fb` primary, `#8790ab` metadata; `#282e42` borders | Existing CSS role tokens |

Accent reserved for the primary action, active section, links/citations, and focus rings. Resting source chips and tool rows use neutral surfaces. Expert/web provenance uses explicit labels and icons, never color alone.

## Layout and Interaction Contract

**Hierarchy:** the current question or answer is the interview/test focal point; the composer is the primary action area. Persona fields and Knowledge sections are the focal points on their respective pages. Configure summaries and evidence details are secondary. Keep one primary action per active form/dialog.

**Responsive default:** at 1024px and above use chat plus Configure drawer; below 1024px Configure opens a focus-trapped sheet with close control. Below 768px preserve the existing menu sheet and stack form/source rows. At 320px, titles, queries, URLs, and excerpts wrap without page-level horizontal scrolling. Keep the composer reachable above the mobile keyboard.

| Surface | Required behavior |
|---|---|
| Interview — D-01–D-03 | One open-ended question at a time; follow the current topic through examples and exceptions. Show `Skip question` beside the active turn, including repeated follow-ups. `Pause interview` preserves the pending question and saved turns; `Resume interview` restores them. Draft text survives route changes/reloads per agent. Disable duplicate send while pending. |
| Captured answers — D-02, D-07 | Each saved answer exposes its source question and `Edit answer`, `Add detail`, `Delete answer`. Edit opens an inline field with `Save answer` / `Discard changes`; keep edited text on failure. Add detail creates a linked follow-up with its own text and timestamp, preserving the original. Allow either from transcript or Knowledge at any time. |
| Answer processing | Distinguish `Saving answer`, `Updating knowledge`, `Ready`, and `Update failed`. Never show a new version as retrievable before processing succeeds. A failed update explains that the previous indexed version remains active, if applicable; allow `Retry update`. A failed initial embedding retains the captured answer with `Retry indexing`. |
| Readiness — D-03 | After the readiness heuristic is met, show a compact suggestion with `Review persona`, `Test agent`, and `Continue interview`. It is dismissible and does not lock the interview or imply the agent is published. |
| Persona — D-04–D-06 | Editable fields: name, fixed-list category, headline, description, how I work, always-do, never-do, example questions, greeting. Supported untouched fields update as answers arrive; unsupported fields remain blank. Show `Drafted from interview` metadata. Expert edits become `Edited by you`; new suggestions appear beside these fields with `Use suggestion` / `Keep my text`, never overwrite in-progress typing. `Save persona` shows pending/success/failure states. |
| Advanced prompt — D-06 | Collapsed by default. Label `Generated from form` or `Custom prompt`. Form changes leave custom content intact and display `Your custom prompt is still active.` Explicit `Regenerate from form` opens a replacement confirmation; `Keep custom prompt` backs out. Show `Platform safety rules always apply.` Category model assignment is read-only metadata, with no model selector. |
| Knowledge — D-07 | One page with separately headed `Interview answers` and `Documents` sections. Answer rows show question, answer/excerpt, linked details, status, and edit actions. Document rows show name, kind, status, page count where available (otherwise an em dash), and chunk count; preserve headings for non-paged text. Drawer summaries link to this page. |
| Intake — D-08 | `Add document` opens a sheet with `Upload file` / `Paste text`; accept PDF, DOCX, TXT, MD. Before metered processing, show source name, remaining files/bytes/chunks, projected use where known, approximate credits, and available wallet balance. Unknown counts read `Estimated` or `Available after processing`, never fabricated. `Process source` confirms; `Keep editing` returns. Block unsupported/oversized input and quota overflow with specific corrective text. Server preflight revalidates limits and balance; a changed estimate returns to confirmation. |
| Source lifecycle | Show `Queued`, `Processing`, `Ready`, or `Failed` and chunk/page counts when known. Failed rows retain the source and offer `Retry processing` / `Delete source`. Confirm retries with a fresh estimate. Deletion shows `Deleting source`; only remove the row on success. Active retrieval excludes deleted chunks; historical citations become `Source deleted` rather than broken links. |
| Sandbox — D-09 | Stream answers in Test with the existing plain assistant text and user bubbles. Below each answer, `Retrieved sources ({n})` starts collapsed and expands excerpts, source names, question or page/heading, and relevance scores. Say `Relevance score`, not confidence. Show the zero-source state explicitly. |
| Web fallback — D-10–D-11 | When expert material is insufficient, show `Searching online` immediately. Append expandable `Search web` and `Read page` steps while they run, in chronological order, with Running/Complete/Failed states. Search details show the actual query; page steps show title and clickable URL when available (URL alone while title is pending). Preserve tool steps with the answer for later inspection. |
| Evidence and gap — D-10–D-11 | Inline citation triggers open click/keyboard-accessible details labeled `Expert · Interview`, `Expert · Document`, or `Online source`. Include source name, excerpt and question/page/heading or external title/link. Group supporting references under `Expert sources` and `Online sources` when both contribute. Add a visible, concise `Knowledge gap: {specific missing expert evidence}. This part uses online sources, not the expert's own views.` Online findings never appear in Knowledge or raise its source count. |
| No usable online evidence | Show the uncertainty copy below; retain failed/empty tool steps. If part of the question is supported, answer only that part with citations and identify the unsupported remainder. A failed page read alone must not imply the whole search failed. |
| Wallet / spend | Shell balance remains visible. Show reservation as `Estimated {n} credits`, actual settlement as `Charged {n} credits`; never present an estimate as final. Insufficient balance offers the existing mock `Add credits` sheet and retains input for explicit retry. A daily cap blocks metered actions with the cap message while reading/editing drafts stays available. Interrupted calls show actual settled charges when available; do not promise free retries. |

**Accessibility and async defaults:** use semantic buttons, labeled inputs, visible focus, `aria-expanded` on disclosures, and accessible names (`Send answer`, `Send message`, `Close configuration`, `Source actions: {name}`) for icon buttons. Citation details work on touch and keyboard, not hover alone. Dialogs restore focus to their trigger; Escape closes without committing. Announce save/tool status politely without narrating every streamed token. Preserve scroll position if the reader scrolled up; offer `Jump to latest`. Respect reduced motion. Network errors preserve drafts and previously completed content; successful acknowledgments announce state without forcing a modal.

## Copywriting Contract

Sentence case, concise factual copy, no invented credentials; dynamic braces below are runtime values.

| Situation | Copy / action |
|---|---|
| Interview start | `Build your agent from your experience` / `Answer one question at a time. You can skip a question or add detail later.` → `Start interview` |
| Paused interview | `Interview paused` / `Your saved answers are here. Continue when you're ready.` → `Resume interview` |
| Readiness suggestion | `Ready for a first test` / `You have examples and working principles to try. Review the draft persona or keep adding detail.` |
| Empty persona | `Your persona will take shape here` / `Answer the opening questions or add your own details.` → `Continue interview` |
| Empty answers | `No interview answers yet` / `Your saved answers and their questions will appear here.` → `Start interview` |
| Empty documents | `No documents added` / `Documents are optional. Upload a file or paste text to add more knowledge.` → `Add document` |
| Empty sandbox | `Test your agent` / `Ask a question to inspect its answer and sources.` Composer: `Write your message…` → `Send message` |
| No retrieved sources | `No matching expert sources` / `The expert's saved material did not cover this question.` |
| Upload confirmation | `Process {name}?` / `About {n} credits. Final cost depends on actual processing. Remaining: {files} files · {size} · {chunks} chunks.` → `Process source` / `Keep editing` |
| Unsupported input | `This file type isn't supported. Choose a PDF, DOCX, TXT, or MD file, or paste text.` → `Choose another file` |
| Limit exceeded | `This source exceeds the {limit} limit. Choose a smaller source or remove an existing document.` → `Choose another source` |
| Intake failed | `Couldn't process {name}. {reason}. Your source is still here.` → `Retry processing` |
| Save failed | `Couldn't save your changes. Your draft is still here. Check your connection and try again.` → `Retry saving` |
| Answer saved, indexing failed | `Your answer was saved, but isn't searchable yet. Retry indexing to use it in replies.` → `Retry indexing` |
| Interrupted reply | `The reply stopped before finishing. Your message is still here.` → `Retry message` |
| Insufficient balance | `Not enough credits` / `This needs about {n} credits; you have {m}. Add credits to continue.` → `Add credits` / `Keep draft` |
| Daily cap | `The platform's daily AI budget is used up. Try again after {reset time and timezone}. Your draft is saved.` |
| No usable evidence | `I couldn't find enough evidence in the expert's material or online sources to answer this reliably. Add relevant material or ask a narrower question.` |
| Delete answer | `Delete this answer? It and its linked details will stop being used as knowledge. The question stays in the transcript.` → `Keep answer` / `Delete answer` |
| Delete source | `Delete {name}? Its {n} chunks will stop being used in new answers.` → `Keep source` / `Delete source` |
| Delete failed | `Couldn't delete {name}. It is still available. Check your connection and try again.` → `Retry deletion` |
| Replace custom prompt | `Replace your custom prompt with the current persona form? Your custom wording will be replaced.` → `Keep custom prompt` / `Regenerate from form` |

## Registry Safety

| Registry | Blocks used | Safety gate |
|---|---|---|
| shadcn official | Existing button, input, textarea, label, select, badge, card, collapsible, dialog, sheet, dropdown-menu, popover, tooltip, skeleton, sonner | Official only; confirmed by installed CLI and empty custom `registries` in `components.json`, 2026-09-26 |
| Third-party | None | Not applicable |

## Checker Sign-Off

- [x] Copywriting: PASS — specific actions, empty/error states and destructive confirmations.
- [x] Visuals: PASS — focal points, reusable layout, responsive and accessible interaction states.
- [x] Color: PASS — 60/30/10 distribution, constrained accent and semantic status colors.
- [x] Typography: PASS — four sizes, two weights, explicit line heights for Phase 2 controls.
- [x] Spacing: PASS — seven standard tokens; inherited geometry distinguished from spacing.
- [x] Registry safety: PASS — existing official components only.

**Approval:** approved 2026-09-26 (local date), checked inline using the GSD UI researcher/checker instructions. D-01–D-11 are represented above; this is contract validation, not an implementation or browser audit.
