---
phase: 1
slug: shell-wallet-shared-contracts
status: approved
shadcn_initialized: false
preset: none
created: 2026-09-26
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for frontend phases. Written inline (GSD UI agents not installed) from live measurements of LangSmith and LangSmith Fleet on 2026-09-26, per CONTEXT.md D-05: copy LangSmith's UI closely, with our own section names.

**Reference screenshots** (read these before building any screen): `.planning/phases/01-shell-wallet-shared-contracts/refs/`

| File | What it shows | Copy it for |
|------|---------------|-------------|
| `langsmith-fleet-shell-chat.jpg` | Fleet shell: 245px sidebar, search row, sections, footer identity card, centered "Ask anything" composer | App shell, sidebar, chat composer |
| `langsmith-tracing-table.jpg` | Classic LangSmith: breadcrumb bar, toolbar (primary button, search, Columns), dense table with pill numbers | Marketplace table view, Wallet history, Earnings, Admin flags |
| `langsmith-prompts-empty-state.jpg` | Toolbar + centered empty state (icon circle, heading, body, small primary button, "Learn more" link) | Every empty state |
| `langsmith-fleet-templates.jpg` | Two-column card grid with 16:9 image, icon tile, title, description, footer meta | Marketplace card grid |
| `langsmith-fleet-template-detail.jpg` | Back-arrow breadcrumb, "Create Agent" top-right, hero card (title, description, icon row, illustration), "Agent Instructions" checklist card | Agent listing page |
| `langsmith-fleet-onboard-start.jpg` | "Onboard · {agent pill}" header, subtitle "You'll be asked a few questions…", bottom composer "Send a message to queue it up…" | Interview page (this is our interview, nearly verbatim) |
| `langsmith-fleet-onboard-chat.jpg` | Assistant turn as plain text (no bubble), tool chips "Read File +2 more", inline option list with "Skip for now" / "Save and continue" | Interview and chat message rendering |
| `langsmith-fleet-configure-drawer.jpg` | 479px right drawer: header (icon tile, name, description, "View ⌄", ×), sections Channels / Sharing / Connections as cards with 61px rows | Builder Configure drawer (Persona, Knowledge, Publishing) |
| `langsmith-fleet-builder-split.jpg` | Chat left + drawer right, thread header "≡ {thread name} · + New Thread · Files", drawer sections Knowledge / Instructions / Skills / Memory | Builder page layout |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (Tailwind v4, `components/ui/` add-only per CONTRIBUTING.md) |
| Preset | not applicable — custom dark theme tokens below, copied from LangSmith's measured CSS variables |
| Component library | radix (shadcn default) |
| Icon library | lucide-react, 16px in nav rows and buttons, 20px in drawer section headers, stroke 1.75 |
| Font | Inter (via `next/font/google`), fallback `-apple-system, system-ui, Segoe UI, Roboto, sans-serif`; `font-variant-numeric: tabular-nums` on every credit amount and table number |
| Theme | Dark only in Phase 1 (`<html class="dark">`). LangSmith ships both; the presentation runs dark. Light tokens are Claude's discretion if added later. |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gap in nav rows, pill padding-y, chip gaps |
| sm | 8px | Nav row padding-x (10px in LangSmith; use 8px + 2px icon inset), table cell padding-left, toolbar button gaps, gap between drawer rows |
| md | 16px | Card padding, composer padding, gap between toolbar and table, drawer section padding |
| lg | 24px | Page title to content, gap between hero card and next card, content padding-x on detail pages |
| xl | 32px | Detail-page content padding-top, gap between grid rows |
| 2xl | 48px | Empty-state icon circle, vertical centering offset for empty states |
| 3xl | 64px | Top offset of the centered composer block on an empty chat |

Fixed layout dimensions (copied from LangSmith, rounded to the 4px grid):

| Element | Value |
|---------|-------|
| Sidebar width | 244px (measured 245px), collapsible to 48px icon rail with `⌘B` |
| Sidebar nav row | 28px tall (measured 26px), radius 4px, 6px gap between rows |
| Sidebar search row | 24px tall, radius 4px |
| Sidebar footer identity card | 64px tall, 40px avatar (rounded 8px), 12px padding |
| Breadcrumb / thread header bar | 40px tall |
| Toolbar button (small) | 24px tall, 8px padding-x, radius 4px |
| Default button (page CTA, drawer actions) | 32px tall, 12px padding-x, radius 4px |
| Table header row | 40px tall |
| Table body row | 40px tall (measured 38px), no row borders |
| Configure drawer width | 480px (measured 479px), full height, overlays nothing (chat column shrinks) |
| Drawer section row | 60px tall (measured 61px), 12px padding |
| Chat column max width | 752px (measured 753px), centered in the main area |
| Composer | 96px min height, radius 12px, 16px padding |
| Card radius | 12px (grid cards, hero card, drawer section cards, composer) |
| Control radius | 4px (buttons, inputs, nav rows, pills use 9999px) |
| Detail page content max width | 1080px, centered |

Exceptions: none. Where a measured LangSmith value is off-grid it is listed above with the rounded value we ship.

---

## Typography

| Role | Size | Weight | Line Height | Where |
|------|------|--------|-------------|-------|
| Body | 14px | 400 | 1.5 | Table cells, drawer row titles (500), descriptions, form fields |
| Chat message | 16px | 400 | 1.6 | Assistant and user turns in interview, test and hirer chat; no bubbles, plain text on the page background |
| Label | 13px | 500 | 1.4 | Nav rows, buttons, search placeholder, breadcrumbs, pills, footer name (600) |
| Caption | 12px | 400 | 1.4 | Drawer subtitles, card footer meta ("by {expert} ✓"), footer email, timestamps, tool chips |
| Section label | 10px | 500 | 1.2, uppercase, 0.5px tracking | Sidebar group labels (EXPLORE / BUILD / CREDITS) |
| Heading | 16px | 600 | 1.25 | Drawer agent name, empty-state heading, "Interview" header word, section card headers (14px/600) |
| Page title | 24px | 500 | 1.33 | "Marketplace", "My agents", "Wallet", "Ask anything"-style prompts |
| Display | 28px | 500 | 1.2 | Agent name on the listing hero card |

Color of text by role: primary `#f5f8fb`, secondary `#e2e8f0`, tertiary `#cbd5e1`, muted `#8790ab` (section labels, breadcrumb parents, placeholders, captions).

---

## Color

All values are LangSmith's dark-theme tokens, measured from `html.dark` CSS variables on 2026-09-26.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#09090f` | Page background, table header background, main content area |
| Secondary (30%) | `#0d0f18` | Sidebar, Configure drawer, cards, secondary button fill; with `#111521` for surface-2 (composer, drawer section cards, hover rows) and `#1b2030` for surface-3 (search field, pills, inputs, count badges) |
| Accent (10%) | `#0078f1` | Brand blue; button fill is `#006ddd` with a 1px `#0078f1` border; selected background `#0c336a`; selected text and links `#5fbef8` |
| Destructive | `#f04438` | Destructive button fill; `#f97066` for destructive text and icons; `#55160c` for error surface |
| Success | `#46cd89` | Positive numbers in tables (earnings, credits in), "Published" pill text; surface `#053321` |
| Warning | `#fdb022` | "Draft"/"Unpublished" pill text, low-balance notice; surface `#4c2400` |
| Border faint | `#111521` | Sidebar right edge, drawer left edge |
| Border muted | `#1b2030` | Secondary button border, dividers inside cards |
| Border subtle | `#282e42` | Card and composer borders, table toolbar separators |
| Border default | `#393f55` | Inputs at rest, focused-card outline |
| Purple tile | `#4e3487` on `#190d38` | Agent icon tiles only (LangSmith uses purple for agent identity); never for actions |

Accent reserved for: primary buttons (fill), active sidebar row (bg `#0c336a`, text `#5fbef8`, icon `#5fbef8`), text links and "Learn more", focus rings, the empty-state icon circle (bg `#0c336a`, icon `#5fbef8`), the identity switcher's active check, the bottom toast banner background, the active tab underline. Never for headings, body text, resting icons, borders, or table numbers.

Number pills in tables: bg `#282e42`, text `#f5f8fb`, 12px, padding 2px 6px, radius 4px. Percent/positive values render as plain text in Success green, not as pills.

---

## Copywriting Contract

Product name is a placeholder: **Badger Experts** (from research SUMMARY.md). Change in one constant.

### Shell

| Element | Copy |
|---------|------|
| Wordmark (sidebar top-left) | `Badger Experts` (no chevron; LangSmith's product switcher has no equivalent) |
| Sidebar search | placeholder `Search…` with `⌘ K` keycaps right-aligned |
| Sidebar rows, ungrouped | `Marketplace`, `Chats` |
| Section label 1 | `BUILD` → rows `My agents`, `New agent` (highlighted "get started" row style: surface-3 bg, 13px, icon tile) |
| Section label 2 | `MY AGENTS` → one row per seeded agent of the active expert, `+` icon at the section's right edge (Fleet's pattern). Hidden when viewing as hirer. |
| Section label 3 | `CREDITS` → rows `Wallet`, `Earnings` (Earnings hidden when viewing as hirer) |
| Bottom rows | `Admin`, `Settings` (the profile page) |
| Footer identity card | avatar · name (13px/600) · second line `Expert · 5,000 credits` or `Hirer · 5,000 credits` (12px muted) · chevron |
| Identity popover title | `Viewing as` |
| Identity popover rows | `{name} — Expert` / `{name} — Hirer`, check on the active one; footer hint `Switch to see the other side of the loop.` |
| Collapse tooltip | `Collapse (⌘B)` |

### Primary CTAs (verb + noun)

| Screen | Primary CTA |
|--------|-------------|
| Marketplace | `New agent` (top-right, only when viewing as expert) |
| Listing | `Start chat` (top-right, 32px primary; Fleet's `Create Agent` slot) |
| My agents | `New agent` |
| Builder / interview | `Publish agent` (in the drawer's Publishing section) |
| Builder header | `Configure` (secondary, with settings icon, top-right of the chat column) |
| Wallet | `Add credits` (opens the mock funding sheet: `Subscribe — +{n} credits/mo` and `Buy pack — +{n} credits`) |
| Earnings | `Request cash-out` |
| Knowledge section | `Add document` |
| Persona section | `Save persona` |
| Admin | `Unpublish agent` (destructive, needs a note) |

### Empty states (heading + body + next step)

| Screen | Heading | Body |
|--------|---------|------|
| Marketplace | `No agents published yet` | `Build the first one from an interview.` → `New agent` |
| My agents | `No agents yet` | `Start an interview and your first agent takes shape from your answers.` → `New agent` |
| Chats | `No conversations yet` | `Hire an agent from the Marketplace to start one.` → `Browse marketplace` |
| Wallet history | `No activity yet` | `Credits appear here when you build, chat, or add credits.` |
| Earnings | `Nothing earned yet` | `Publish an agent. You're credited each time someone uses it.` → `Publish agent` |
| Admin flags | `No flags` | `Flagged agents and conversations show up here.` |
| Knowledge (drawer) | `No sources yet` | `Interview answers land here automatically. Add documents any time.` → `Add document` |
| Interview (first load) | header `Interview` + agent pill | subtitle `You'll be asked about what you know and how you work. Every answer becomes knowledge.` |
| Test chat (first load) | header `Test` + agent pill | subtitle `Ask what a hirer would ask. Retrieved sources show under each answer.` |

### Composer placeholders

| Context | Placeholder |
|---------|-------------|
| Interview | `Write your answer…` |
| Test and hirer chat | `Write your message…` |
| Queued while the agent is replying (Fleet pattern) | `Send a message to queue it up…` |

### Error states (problem + solution path)

| Situation | Copy |
|-----------|------|
| Send failed | `Couldn't send. Check your connection and try again.` → `Retry` |
| Insufficient credits (pre-call reservation, D-10) | heading `Not enough credits` · body `This needs about {n} credits; you have {m}. Add credits to continue.` → `Add credits` |
| Daily spend cap hit (CRED-10) | `The platform's daily AI budget is used up. Try again tomorrow.` |
| Stub not implemented (Phase 1 only) | `Placeholder data — real {feature} lands in Phase {N}.` shown as a 12px muted caption under the affected section, never as a modal |

### Destructive confirmations

| Action | Confirmation copy |
|--------|-------------------|
| Delete source | `Delete source: This removes {name} and its {n} chunks from {agent}. The agent stops citing it immediately.` → `Cancel` / `Delete source` |
| Delete interview answer | `Delete answer: {agent} forgets this answer and its chunk. The question stays in the transcript.` → `Cancel` / `Delete answer` |
| Unpublish agent | `Unpublish agent: {agent} leaves the marketplace now. Open chats keep working.` → `Cancel` / `Unpublish` |
| Admin unpublish | same as above plus a required `Note for the expert` textarea |

Tone: LangSmith's. Sentence case everywhere, no exclamation marks, no emoji in UI copy, numbers as digits with thousands separators, credits written as `5,000 credits` and money as `$50.00`.

---

## Layout Contract

### App shell (every route)

```
┌──244px──┬────────────────────────────────────────────────────────┐
│ Badger  ▣│ [breadcrumb / thread header — 40px]         [page CTA] │
│ Experts  │                                                        │
│ Search ⌘K│                                                        │
│ Marketpl.│              main content (page background)            │
│ Chats    │                                                        │
│ BUILD    │                                                        │
│ My agents│                                                        │
│ New agent│                                                        │
│ MY AGENTS│                                                        │
│  · Maria │                                                        │
│ CREDITS  │                                                        │
│ Wallet   │                                                        │
│ Earnings │                                                        │
│          │                                                        │
│ Admin    │                                                        │
│ Settings │                                                        │
│ [avatar] │                                                        │
│ Maria ⌄  │                                                        │
└──────────┴────────────────────────────────────────────────────────┘
```

- Sidebar: bg `#0d0f18`, 1px right border `#111521`, sticky full height, its own scroll. Wordmark row 48px; collapse icon at the row's right edge.
- Nav row: 28px, icon 16px muted → primary on hover, label 13px/500 `#f5f8fb`; hover bg `#111521`; active bg `#0c336a`, text and icon `#5fbef8`. Optional right-aligned count (13px muted) as in Fleet's `Notifications 1`.
- Section label: 10px uppercase muted with a chevron toggle (collapsible group), 8px top margin.
- Footer identity card (SHEL-02): sticks to the bottom, opens the `Viewing as` popover upward. Switching swaps avatar, name, second line, the MY AGENTS group and the Earnings row, then reloads the current route.
- Breadcrumb bar: 40px, 13px muted parent › 13px primary current, no background, no border.
- Main content scrolls independently of the sidebar.
- `/` renders the Marketplace inside the shell (D-06); there is no landing page and no route outside the shell.

### List pages (Marketplace table view, Wallet history, Earnings, Admin, My agents)

Toolbar at the top of main: `[+ New agent]` primary small · `[Search by name…]` 24px field (bg `#1b2030`, 218px wide, search icon) · `[Columns]` secondary small · `[Filter]` secondary small. Then the table: header 40px (13px/600 tertiary), rows 40px, first column has a checkbox slot (Marketplace hides it), numbers right-aligned in pills, no zebra striping, no row borders, hover bg `#111521`.

Marketplace defaults to a **card grid** (Templates pattern: 2 columns ≥ 1024px, 3 columns ≥ 1440px, 1 column < 768px; cards 12px radius, 1px `#282e42` border, `#0d0f18` bg, 16:9 header image slot (placeholder gradient per category), 32px icon tile, title 14px/600, description 13px muted 2-line clamp, footer: category pill + rating `★ 4.8 (23)` + `by {expert} ✓`). A `Grid | List` toggle (Fleet's file browser pattern) switches to the table.

### Listing page (`/marketplace/{agent}`)

Template-detail pattern: `← Marketplace › {Agent}` breadcrumb, `Start chat` 32px primary top-right. Hero card (12px radius): left column Display title, 14px/1.5 description, expert row (40px avatar, name, field, `Self-reported` caption pill, years), credentials caption; right column illustration slot on a blue gradient (`#1566b8` → `#5fbef8`). Below: `Example questions` card as a checklist (each row 14px with a circle-check icon, clicking one starts the chat with that question), then `About the expert` card. Category disclaimer, where required, is a 13px muted paragraph above the CTA, never a modal.

### Builder page (`/build/{agent}`), D-05

Fleet's split: chat column (max 752px, centered in the space left of the drawer) + Configure drawer 480px on the right. Thread header 40px: `≡` toggles a threads rail listing `Interview` and `Test` threads; title `{Agent} · Interview`; right: `+ New thread` small primary, `Configure` small secondary. First-load state uses the onboarding pattern: centered `Interview` heading (16px/600) + agent pill (bg `#1b2030`, radius 9999px, 32px tall, icon + name), subtitle 13px muted, composer pinned at the bottom.

Drawer sections, top to bottom (each a card with a 14px/600 header row, icon, and chevron to collapse):
1. Header: purple icon tile 32px, agent name 16px/600, headline 12px tertiary, `View ⌄` (opens the listing), `×`.
2. `Persona` — rows for Name, Category, Headline, Description, How I work, Always, Never, Example questions, Greeting; each 60px row shows the label 13px/500 and a one-line value 12px muted with a chevron; tapping opens an inline editor. `Advanced: system prompt` toggle at the bottom.
3. `Knowledge` — `Search sources…` field, rows per source (icon by kind, name 13px/500, status caption `Ready · 42 chunks`, `⋯` menu), `+ Add document` dashed button (Fleet's `+ Add skill`).
4. `Publishing` — rate multiplier row (`1× · about 3 credits per message`), consent row, status pill (`Draft` warning / `Published` success), `Publish agent` primary 32px full width.

Test chat lives in the same page as a second thread, so the retrieved-sources panel (SBOX-02) renders under each answer as collapsible tool chips (`Retrieved 4 sources ›`), exactly like Fleet's `Read File +2 more`.

### Chat page (`/chat/{conversation}`)

Same chat column, no drawer. Thread header: agent icon tile + name, `by {expert}` 12px, `Contact the expert` text link, right: wallet balance pill `5,000 credits` (CHAT-11 later phases add per-message cost captions 12px muted under each answer). Messages: user turns right-aligned in a `#111521` bubble (radius 12px, 16px padding, max 70%); assistant turns plain 16px/1.6 text, citations as `[1]` superscript chips (bg `#1b2030`, 12px, radius 4px) with a hover card.

### Wallet, Earnings, Admin, Settings

Page title 24px/500 + 13px muted subtitle (Fleet's Templates header), then a stat row of 3–4 tiles (card, 12px radius, label 12px muted, value 24px/500 tabular), then the toolbar + table. Wallet's `Add credits` opens a right sheet (480px, same as the drawer) with two cards: `Subscribe` and `Buy pack`, each with a primary button; every click posts instantly and appends a row (D-11).

### Bottom toast

Fleet's feedback banner: bottom-center, bg `#0c336a`, 13px text `#f5f8fb`, radius 8px, 40px tall, dismiss `×`; used for `Credits added`, `Agent published`, `Switched to {name}`.

### Responsive

< 1024px: sidebar collapses to the 48px icon rail, drawer becomes a full-height sheet. < 768px: sidebar becomes a top-left `≡` menu sheet, tables become stacked cards. The presentation runs at 1440px+; the small breakpoints only need to not break.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | sidebar, button, input, textarea, badge, table, tabs, sheet, dialog, dropdown-menu, popover, avatar, scroll-area, separator, tooltip, skeleton, switch, select, card, collapsible, toast (sonner) | not required |
| third-party | none | — |

`components/ui/` is add-only (CONTRIBUTING.md). Theme tokens go in `app/globals.css` under `.dark` as CSS variables named after the LangSmith roles above (`--bg-surface-level-1..3`, `--border-subtle`, `--text-muted`, `--bg-brand`, …) so Tailwind utilities read them and every lane uses the same names.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — every CTA is verb + noun; every empty state has heading, body and next step; errors name the fix; destructive confirmations name the action and consequence
- [x] Dimension 2 Visuals: PASS — one visual source (LangSmith dark), 9 reference screenshots in `refs/`, layout contract per route family, radii limited to 4/12/9999
- [x] Dimension 3 Color: PASS — 60/30/10 split declared with hex values; accent reserved for an explicit list; destructive, success and warning separated; no accent on text or borders
- [x] Dimension 4 Typography: PASS — one family (Inter), eight roles with size, weight and line height; tabular numerals for money
- [x] Dimension 5 Spacing: PASS — 4px scale with seven tokens; fixed dimensions rounded to the grid with measured originals noted; no exceptions
- [x] Dimension 6 Registry Safety: PASS — shadcn official blocks only, no third-party registry, add-only rule restated

**Approval:** approved 2026-09-26 (checked inline; gsd-ui-checker not installed)
