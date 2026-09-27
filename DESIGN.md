---
# gstack: design-md-format=spec
name: Badger Experts
description: A neutral dark theme built on Attio's near-black, with white type and white primary buttons, and one blue kept for citations and keyboard focus.
colors:
  background: "#141516"
  surface: "#1A1B1D"
  sidebar: "#1A1B1D"
  panel: "#202124"
  panel-raised: "#26282B"
  selected: "#2C2E32"
  border: "#2A2C30"
  border-input: "#383B40"
  border-outline: "#43464D"
  text: "#F3F4F6"
  text-body: "#D5D8DE"
  text-secondary: "#B4BAC4"
  text-muted: "#979EAA"
  primary: "#F3F4F6"
  on-primary: "#1C1D1F"
  primary-hover: "#D5D8DE"
  accent: "#6B9CF7"
  citation: "#9DBCF9"
  citation-surface: "#1D2A45"
  success: "#52C28B"
  success-surface: "#0F2A1C"
  warning: "#F2B53F"
  warning-surface: "#33260A"
  error: "#F97066"
  error-surface: "#3B1411"
  error-fill: "#D92D20"
typography:
  display:
    fontFamily: Inter
    fontWeight: 600
    fontSize: 20px
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 14px
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontWeight: 500
    fontSize: 12px
rounded:
  sm: 4px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-outline}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.border-input}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
  nav-link-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.text}"
  citation-chip:
    backgroundColor: "{colors.citation-surface}"
    textColor: "{colors.citation}"
    rounded: "{rounded.sm}"
---

# Badger Experts

## Overview

**Creative North Star:** Neutral charcoal with white type, and nothing colored unless it has to be. The expert, their cited words and the price are what people notice.

**Product context:** A marketplace where experts with no audience or technical skill turn what they know into a cited AI agent, and hirers pay credits per message to use it. The people using it are non-technical experts and students, and a live demo shows it to hackathon judges.

**Mode per surface:**
- Marketplace, listing, wallet, earnings, admin: Operate.
- Chat and citations: Read.
- Interview: Operate, with one question per screen.
- There is no marketing site; the app opens straight into the shell.

**Reference sites:** [attio.com](https://attio.com), whose near-black `#202124` and white `#F3F4F6` button pair is the base of this palette (measured 2026-09-27). Also reviewed: Cal.com (the person leads the card), Notion, Granola, Delphi (closest competitor), Vercel and Linear.

**Key characteristics:**
- Neutral charcoal surfaces with no blue or navy tint, and white type.
- White primary buttons and outlined secondary buttons. The selected navigation row is a lighter gray, never blue.
- The only saturated color is blue. It appears on citation chips, on the cited passage, and as the keyboard focus ring.
- Marketplace cards lead with the expert's initials, name and credentials. Agents have no color identity of their own.

## Colors

**Strategy:** Restrained. The palette is neutral grays plus one blue, and color only ever signals state or provenance.

**Light or dark:** Dark. A light version of this palette (Attio's white surfaces) was built first on 2026-09-27. On the real screens the user found it too bright and hard on the eyes, and chose white type on a dark color from the same palette. The dark is Attio's own neutral near-black, not the navy LangSmith theme it replaces, so the product keeps the calm, professional feel without the glare.

**What carries color:**
- **Primary buttons are white with a near-black label, never blue.** Hover dims them one step.
- **Blue has two jobs only:**
  - Citations: a chip in `citation` on `citation-surface`, plus the same surface behind the quoted passage when a source is opened.
  - Keyboard focus, drawn in `accent`.
  - It never fills a button, marks a selected state or appears in decoration.
- **Success, warning and error** are text colors on their matching dark surfaces. Credits coming in are success green; debits stay in body text, because spending is normal and not an alarm. Draft and low-balance states use warning. Destructive buttons use `error-fill` with a white label.

**Surfaces, darkest to lightest:**
- `background` is the page.
- `surface` holds cards, tables, the sidebar, the drawer and popovers.
- `panel` covers composer fields, hover rows and drawer sections.
- `panel-raised` is for search fields, pills, count badges and initials tiles.
- `selected` is the active navigation row.

Three line weights separate things: `border` for hairlines and card edges, `border-input` for text fields, and `border-outline` for secondary buttons.

**Contrast:** Every text color passes WCAG AA 4.5:1 on every surface it sits on. The lowest is muted text on the selected row, at 5.0:1.

**Mapping to `app/globals.css`:** Keep the existing variable names so `components/ui/*` and every lane pick up the change without edits. Keep the `dark` class on `<html>` so shadcn's dark variants apply, and set `color-scheme: dark`.

| Variables | Token |
|---|---|
| `--background` | `background` |
| `--card`, `--popover`, `--bg-surface-level-1`, `--sidebar` | `surface` |
| `--secondary`, `--bg-surface-level-2`, `--sidebar-accent`, `--sidebar-border`, `--border-faint` | `panel` |
| `--muted`, `--bg-surface-level-3` | `panel-raised` |
| `--accent`, `--bg-selected`, `--bg-pill` | `selected` |
| `--border`, `--border-subtle` | `border` |
| `--border-muted` | `panel-raised` |
| `--input`, `--border-default` | `border-input` |
| `--border-outline` | `border-outline` |
| `--foreground`, `--text-primary`, `--accent-foreground`, `--text-selected` | `text` |
| `--secondary-foreground`, `--text-secondary` | `text-body` |
| `--text-tertiary` | `text-secondary` |
| `--muted-foreground`, `--text-muted` | `text-muted` |
| `--primary`, `--bg-brand`, `--border-brand`, `--sidebar-primary` | `primary` |
| `--primary-foreground`, `--sidebar-primary-foreground` | `on-primary` |
| `--bg-brand-hover` | `primary-hover` |
| `--ring`, `--sidebar-ring` | `accent` |
| `--citation`, `--citation-surface` | `citation`, `citation-surface` |
| `--tile-purple`, `--tile-purple-surface` | `border` on `panel-raised` (initials tile) |

## Typography

Use Inter only, loaded through `next/font/google`:
- **Weights:** 400 for body, 500 for labels and buttons, 600 for headings.
- **Features:** the `ss03` stylistic set is on globally, as on Attio, and `tabular-nums` is on everywhere so credit amounts and ledger columns line up.
- **Headings** use `display`. Structure comes from size and weight steps, not color.
- **Sizes:** body text is 14px and chat answers are 15–16px. Captions and cost lines are 12–13px in `text-muted`.

## Layout

The layout is unchanged from the Phase 1 UI spec: sidebar shell, breadcrumb bar, tables, the marketplace card grid, a chat column with a maximum width near 752px, and the Configure drawer on the right.

Two changes come with the palette:
- **Marketplace cards** drop the tinted band and the agent icon tile. They lead with a 40px initials tile (or photo), the expert's name and their field and credentials, then the agent headline, a two-line description, and a footer with the category pill and price.
- **The agent listing page** drops the blue gradient illustration slot; the persona summary sits on `panel`.

## Elevation & Depth

Surfaces are flat. Separation comes from `border` hairlines and from one-step differences between the surface levels. Only floating things get a shadow: menus, popovers, hover cards and toasts. That shadow is soft, neutral and offset, never a colored glow.

## Shapes

Radii are unchanged:
- `rounded.sm` for buttons, inputs, citation chips and small tiles.
- `rounded.lg` for cards, panels, the composer and chat bubbles.
- `rounded.full` for pills, chips and the wallet balance.

## Components

- **Primary button:**
  - Rest: `primary` fill (white), `on-primary` label at 500.
  - Hover: `primary-hover`.
  - Focus-visible: the `accent` ring.
  - Disabled: 50% opacity.
  - Use one per view, on the main action. Send buttons in the chat and interview composers use the same pair.
- **Secondary button:**
  - Rest: `surface` fill, `border-outline` edge, `text` label.
  - Hover: `sidebar` fill.
- **Ghost button:** No fill until hover, which shows `panel`.
- **Destructive button:** `error-fill` with a white label. Hover dims the fill; it never switches to the lighter `error` text color.
- **Input and search:**
  - `panel` or `surface` fill with a `border-input` edge, and a `text-muted` placeholder.
  - Focus: the `accent` ring.
- **Navigation row:**
  - Rest: `text` label with a `text-muted` icon.
  - Hover: `panel`.
  - Selected: `selected` fill with a `text` label and icon. Never blue.
- **Sidebar group label** (Build, My agents, Credits):
  - 12px at 600 in `text-body`, one step below the `text` rows it heads, with a muted chevron.
  - A `border` hairline and 8px of space sit above each group.
  - Sentence case, never all caps. Hover brightens the label to `text`.
- **Filter chip:** outlined at rest. When selected, `primary` fill with an `on-primary` label.
- **Citation chip:**
  - `citation` numerals on `citation-surface`, 12px at 600.
  - The hover card names the source and the page or interview question.
- **Initials tile:** `panel-raised` fill, `border` edge, `text` initial at 600. It is used for people and for agent icons; neither gets a color.
- **Toast:** `primary` background (white) with an `on-primary` label.
- **Thinking orb:** the thinking-orbs engine in dark mode (light ink). The thinking pill sits on `sidebar` with a `border` edge, and its shimmer sweeps white across a half-strength label.
- **Empty, loading and error states** use the same neutrals. Errors put `error` text on `error-surface`, and no state uses a colored left border.

## Do's and Don'ts

- Do keep blue for citations and focus only. If something else wants attention, use weight, size or position.
- Do lead every marketplace card and listing with the expert: initials or photo, name, field and credentials.
- Do show debits in body text with tabular numbers, and incoming credits in success green.
- Do check new text colors against `selected` and `panel-raised`, not just the page.
- Don't bring back navy or blue-tinted grays; every neutral here is hue-neutral charcoal.
- Don't add gradients, glows, colored shadows or decorative blobs anywhere.
- Don't give agents a color, icon art or tile color of their own.
- Don't use a colored left border on cards or alerts, and don't nest cards inside cards.

## Motion

- **Approach:** minimal and functional, keeping the motion the app already has.
- **Easing:** ease-out when entering, ease-in when exiting, ease-in-out when moving.
- **Duration:**
  - Micro: 50–100ms
  - Short: 150–250ms
  - Medium: 250–400ms
  - Long: 400–700ms
- **The one authored moment:** the breathing orb and the word-by-word reply, unchanged.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-27 | Initial design system created | Created by /design-consultation from product context, research on seven products and outside design voices (Codex, Claude subagent). |
| 2026-09-27 | Attio's palette chosen over Plain ink and a Delphi × Attio blend | The user compared all three side by side in a preview built with real seed content. |
| 2026-09-27 | Blue only for citations and keyboard focus | Colors used everywhere stop meaning anything. Tying the one color to the expert's cited words makes the trust point without narration. |
| 2026-09-27 | Inter only, no serif | Chosen by the user to match Attio. |
| 2026-09-27 | Tinted card bands, the gradient hero and purple agent tiles removed | Hirers choose a person's judgment, so the expert leads the card. Codex and a separate Claude review reached the same conclusion independently. |
| 2026-09-27 | Dark neutral replaces the light Attio build | On the real screens the all-white version was too bright and hard on the eyes. The user chose white type on a dark color from the same palette. It keeps Attio's neutral near-black, not the old navy. |
