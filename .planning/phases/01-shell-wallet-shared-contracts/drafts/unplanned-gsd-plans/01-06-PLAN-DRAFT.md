---
phase: 01-shell-wallet-shared-contracts
plan: 06
type: execute
wave: 4
depends_on: ["01-05"]
files_modified:
  - components/app/breadcrumb-bar.tsx
  - components/app/page-header.tsx
  - components/app/empty-state.tsx
  - components/app/stat-tile.tsx
  - components/app/placeholder-note.tsx
  - components/app/status-pill.tsx
  - components/app/number-pill.tsx
  - components/app/agent-tile.tsx
  - components/app/composer.tsx
  - components/app/chat-message.tsx
  - lib/shell-context.ts
  - components/shell/nav.ts
  - components/shell/app-sidebar.tsx
  - components/shell/identity-switcher.tsx
  - app/(app)/layout.tsx
autonomous: true
requirements: [SHEL-01, SHEL-02, CRED-01]

must_haves:
  truths:
    - "Every route under app/(app) renders inside LangSmith's shell: 244px collapsible sidebar (48px icon rail, ⌘B/Ctrl+B) and a 40px breadcrumb bar (D-05, SHEL-01)"
    - "Sidebar sections are Marketplace, Chats, BUILD (My agents, New agent), MY AGENTS (the active expert's agents), CREDITS (Wallet, Earnings), Admin, Settings (D-08)"
    - "Every nav row stays visible and clickable for both identities; rows belonging to the other side render muted, so the active side is highlighted (D-02)"
    - "The sidebar footer shows the active identity's avatar, name and `Expert · 5,000 credits` / `Hirer · 5,000 credits`, i.e. the wallet balance is visible at all times, including as a tooltip on the collapsed rail (D-08, CRED-01)"
    - "Choosing the other identity in the `Viewing as` popover swaps name, avatar, wallet and MY AGENTS, shows `Switched to {name}`, and persists through a reload (SHEL-02)"
    - "Shared page parts (empty state, page header, stat tile, stub caption, pills, composer, chat message) match the UI-SPEC copy and dimensions so every lane uses the same pieces"
  artifacts:
    - path: "app/(app)/layout.tsx"
      provides: "Shell layout wrapping every loop route"
      contains: "SidebarProvider"
    - path: "components/shell/app-sidebar.tsx"
      provides: "LangSmith-style sidebar with side highlighting"
      contains: "data-side"
    - path: "components/shell/identity-switcher.tsx"
      provides: "Viewing as popover in the sidebar footer"
      contains: "Viewing as"
    - path: "lib/shell-context.ts"
      provides: "getShellContext: identity, identities, wallet, ownedAgents, conversationCount"
      exports: ["getShellContext"]
    - path: "components/app/empty-state.tsx"
      provides: "UI-SPEC empty state (icon circle, heading, body, action)"
    - path: "components/app/placeholder-note.tsx"
      provides: "UI-SPEC Phase 1 stub caption"
      contains: "lands in Phase"
  key_links:
    - from: "components/shell/identity-switcher.tsx"
      to: "lib/identity-actions.ts"
      via: "switchIdentityAction then router.refresh()"
      pattern: "switchIdentityAction\\("
    - from: "app/(app)/layout.tsx"
      to: "lib/shell-context.ts"
      via: "await getShellContext()"
      pattern: "getShellContext\\("
    - from: "lib/shell-context.ts"
      to: "features/billing/wallet.ts"
      via: "getWallet(identity.id)"
      pattern: "getWallet\\("
---

<objective>
Build the LangSmith-style app shell and the shared page components every route uses: sidebar with side-aware nav, the `Viewing as` identity switcher with the live balance in the footer, breadcrumb bar, and the UI-SPEC building blocks (page header, empty state, stat tile, stub caption, pills, agent tile, composer, chat messages).

Purpose: SHEL-01 and SHEL-02 surface; D-02, D-05, D-08. Route plans 01-07/08/09 only compose these parts.
Output: components/app/*, components/shell/*, lib/shell-context.ts, app/(app)/layout.tsx.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md
@.planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md
@.planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md
@.planning/phases/01-shell-wallet-shared-contracts/01-05-SUMMARY.md

<interfaces>
From plan 01-05: `getCurrentIdentity(): Promise<Identity>`, `listSwitchableIdentities(): Promise<Identity[]>`, `Identity = { id; kind: 'expert'|'hirer'; displayName; avatarInitial; avatarColor; avatarUrl }` (lib/identity.ts); `switchIdentityAction(identityId)` (lib/identity-actions.ts); `getWallet(identityId): Promise<Wallet>` (features/billing/wallet.ts).
From plan 01-04: `formatCredits`, `formatRelative` (lib/format.ts); `Citation` (features/knowledge/types.ts).
From plan 01-01: shadcn components in components/ui (sidebar, popover, tooltip, button, badge, sonner, toggle-group, textarea, card), `cn` in lib/utils.ts, theme utilities (bg-surface-1..3, bg-pill, border-line-*, text-fg-*, bg-selected, text-selected-fg, text-success, bg-success-surface, text-warning, bg-warning-surface, text-danger-fg, bg-tile-surface, border-tile).

New:
```typescript
// lib/shell-context.ts
export type ShellContext = { identity: Identity; identities: Identity[]; wallet: { balanceCents: number; availableCents: number }; ownedAgents: { id: string; name: string; icon: string; status: string }[]; conversationCount: number };
export async function getShellContext(): Promise<ShellContext>;
// components/app
BreadcrumbBar({ items: { label: string; href?: string }[]; actions?: ReactNode })
PageHeader({ title: string; subtitle?: string })            // h1 data-testid="page-title"
EmptyState({ icon: LucideIcon; heading: string; body: string; action?: { label: string; href: string } })
StatTile({ label: string; value: string; caption?: string; tone?: 'default' | 'success'; testId?: string })
PlaceholderNote({ feature: string; phase: 2 | 3 | 4 })
StatusPill({ status: 'draft'|'published'|'unpublished'|'ready'|'processing'|'queued'|'failed'|'on'|'off' })
NumberPill({ value: number | string })
AgentTile({ icon: string; size?: 'xs' | 'sm' | 'md' })
Composer({ hint: string; disabled?: boolean; caption?: ReactNode; attach?: boolean })
UserMessage({ content: string }), AssistantMessage({ content: string; citations?: Citation[]; caption?: ReactNode }), ToolChip({ icon: LucideIcon; label: string })
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Shared page components from the UI-SPEC</name>
  <files>components/app/breadcrumb-bar.tsx, components/app/page-header.tsx, components/app/empty-state.tsx, components/app/stat-tile.tsx, components/app/placeholder-note.tsx, components/app/status-pill.tsx, components/app/number-pill.tsx, components/app/agent-tile.tsx, components/app/composer.tsx, components/app/chat-message.tsx</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md (Spacing Scale fixed dimensions, Typography, Color, Copywriting "Stub not implemented", Layout Contract list/chat pages)
    - .planning/phases/01-shell-wallet-shared-contracts/refs/mockup.html (`.crumb`, `.title/.sub`, `.empty`, `.stat`, `.pill`, `.npill`, `.tile`, `.box`, `.msg`, `.chip`, `.cite` rules — same measurements)
    - .planning/phases/01-shell-wallet-shared-contracts/refs/langsmith-prompts-empty-state.jpg and langsmith-tracing-table.jpg
    - app/globals.css (utility names from plan 01-01)
  </read_first>
  <action>
Server components unless noted; Tailwind utilities from app/globals.css; lucide-react icons at 16px, stroke 1.75. `components/ui/` stays untouched (add-only).
1. breadcrumb-bar.tsx: 40px row, horizontal padding 24px; parent items 13px `text-fg-muted` Links, separator `›`, last item 13px/500 foreground; `actions` right-aligned with an 8px gap.
2. page-header.tsx: `h1` 24px/500 line-height 1.33, `data-testid="page-title"`; optional subtitle 13px `text-fg-muted`, 20px bottom margin.
3. empty-state.tsx: centered column, 96px vertical padding; 48px circle `bg-selected` with the icon 20px `text-selected-fg`; heading 16px/600; body 13px `text-fg-tertiary`; optional action = small primary Button (24px tall, 8px padding-x) rendered as a Link.
4. stat-tile.tsx: card `bg-surface-1`, 1px `border-line-subtle`, radius 12px, 16px padding; label 12px muted; value 24px/500 `tabular-nums` (success tone → `text-success`); caption 12px muted; `data-testid` from `testId`.
5. placeholder-note.tsx: renders exactly `Placeholder data — real {feature} lands in Phase {phase}.` as a 12px `text-fg-muted` paragraph with 12px top margin (UI-SPEC: caption, never a modal).
6. status-pill.tsx: radius 9999px, 12px/500, padding 2px 8px; published/ready/on → `text-success bg-success-surface`; draft/processing/queued → `text-warning bg-warning-surface`; unpublished/failed → `text-danger-fg bg-danger-surface`; off → `text-fg-muted bg-surface-3`. Labels: Published, Draft, Unpublished, Ready, Processing…, Queued, Failed, On, Off.
7. number-pill.tsx: `bg-pill`, 12px, padding 2px 6px, radius 4px, `tabular-nums`.
8. agent-tile.tsx: purple tile (`bg-tile-surface`, 1px `border-tile`, icon color #c5b4f0), sizes xs 22px / sm 24px / md 32px, radius 6–8px; `AGENT_ICONS` map from icon name to lucide component for `activity`, `calculator`, `graduation-cap`, `heart-pulse`, `piggy-bank`, `briefcase`, `footprints`, `bot`; unknown names fall back to Bot.
9. composer.tsx: centered box max-width 752px, min-height 96px, radius 12px, 16px padding, `bg-surface-2`, 1px `border-line-subtle`; textarea (no border, transparent, 15px) with the given `placeholder` attribute from `hint`; controls row: Plus (or Paperclip + `Upload one file (PDF, DOCX, TXT)` 12px muted when `attach`), round 24px brand send button with ArrowUp; `disabled` disables textarea and send; optional `caption` rendered under the box.
10. chat-message.tsx: `UserMessage` right-aligned bubble `bg-surface-2`, radius 12px, padding 12px 16px, max-width 70%, 16px/1.6; `AssistantMessage` plain 16px/1.6 text, no bubble, `white-space: pre-line`; it splits content on `/\[(\d+)\]/` and renders each marker as a superscript chip (`bg-surface-3`, `text-selected-fg`, 12px, radius 4px) wrapped in a shadcn Tooltip ('use client' leaf component) showing the matching citation's `sourceName` and `page N` or the `question`; unknown n renders the raw marker text. Optional caption 12px muted below (per-message cost). `ToolChip`: 12px muted, `bg-surface-2`, radius 4px, padding 2px 8px, icon 12px (Fleet's `Read File +2 more` pattern). Text is rendered as React children only — no dangerouslySetInnerHTML.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && grep -rc "dangerouslySetInnerHTML" components/app | grep -v ':0' || echo none</automated>
  </verify>
  <acceptance_criteria>
    - All ten files exist under components/app/
    - placeholder-note.tsx contains `Placeholder data — real` and `lands in Phase`
    - page-header.tsx contains `data-testid="page-title"` and an `<h1`
    - agent-tile.tsx contains `graduation-cap` (or `GraduationCap`), `PiggyBank`, `Footprints`, `Bot`
    - chat-message.tsx contains the regex `\[(\d+)\]` and exports `UserMessage`, `AssistantMessage`, `ToolChip`
    - `grep -rn dangerouslySetInnerHTML components/app` prints nothing (verify prints `none`)
    - `git diff --stat HEAD -- components/ui` shows no changes
    - `pnpm typecheck` and `pnpm lint` exit 0
  </acceptance_criteria>
  <done>Every shared building block the route plans need exists once, matching UI-SPEC sizes and copy.</done>
</task>

<task type="auto">
  <name>Task 2: Shell context, side-aware sidebar, Viewing as switcher, (app) layout</name>
  <files>lib/shell-context.ts, components/shell/nav.ts, components/shell/app-sidebar.tsx, components/shell/identity-switcher.tsx, app/(app)/layout.tsx</files>
  <read_first>
    - .planning/phases/01-shell-wallet-shared-contracts/01-UI-SPEC.md (Copywriting "Shell" table, Layout Contract "App shell", Bottom toast, Responsive)
    - .planning/phases/01-shell-wallet-shared-contracts/01-CONTEXT.md (D-02, D-05, D-06, D-08)
    - .planning/phases/01-shell-wallet-shared-contracts/01-RESEARCH.md ("Scaffold" Sidebar block API, "Identity switcher")
    - .planning/phases/01-shell-wallet-shared-contracts/refs/mockup.html (`<aside class="side">` markup and the `ident()` script) and refs/langsmith-fleet-shell-chat.jpg
    - components/ui/sidebar.tsx, components/ui/popover.tsx, components/ui/sonner.tsx (installed APIs)
    - lib/identity.ts, lib/identity-actions.ts, features/billing/wallet.ts (plan 01-05)
  </read_first>
  <action>
1. lib/shell-context.ts (`import 'server-only'`): `getShellContext()` = React `cache`: identity (getCurrentIdentity), identities (listSwitchableIdentities), wallet (getWallet → balanceCents, availableCents), ownedAgents (agents where owner_id = identity.id, order created_at asc: id, name, icon, status), conversationCount (conversations where hirer_id = identity.id and is_sandbox = false). Returns plain serializable data.
2. components/shell/nav.ts: typed `NAV_ITEMS` with `key`, `label`, `href`, lucide `icon`, `side` ('expert' | 'hirer' | 'both') and `isActive(pathname)`: Marketplace `/marketplace` (Store, hirer; active for `/`, `/marketplace`, `/agents/*`), Chats `/chat` (MessageSquare, hirer; active for `/chat*`), My agents `/build` (Bot, expert; active for exactly `/build`), New agent `/build/new` (Sparkles, expert; highlighted "get started" row style: `bg-surface-2`, 32px, icon tile), Wallet `/wallet` (Wallet, both), Earnings `/earnings` (TrendingUp, expert), Admin `/admin` (Shield, both), Settings `/settings` (Settings, both).
3. components/shell/app-sidebar.tsx ('use client'): shadcn `Sidebar collapsible="icon"` with `SidebarRail`. Header: 48px row with wordmark `APP_NAME` (15px/600) and a `SidebarTrigger` at the right edge wrapped in a Tooltip `Collapse (⌘B)`. Search row: 24px, `bg-surface-3`, `Search…` placeholder and `⌘` `K` keycaps, rendered as a Link to `/marketplace`. Content groups in this order: ungrouped Marketplace (row count none) and Chats (right-aligned count = conversationCount); group label `BUILD` (10px uppercase, 0.5px tracking, chevron, collapsible) with My agents and New agent; group label `MY AGENTS` with a `+` link to `/build/new` and one row per ownedAgent (AgentTile xs + name, href `/build/{id}/interview`, active when pathname starts with `/build/{id}`) — rendered only when ownedAgents is non-empty (the hirer owns none); group label `CREDITS` with Wallet and Earnings; spacer; Admin and Settings rows. Rows: 28px, radius 4px, 13px/500, icon 16px muted; hover `bg-surface-2`; active via `SidebarMenuButton isActive` = `bg-selected text-selected-fg`. D-02 side highlight: every row carries `data-side="own"` when its side is `both` or equals `identity.kind`, else `data-side="other"`; `other` rows render label and icon in `text-fg-muted` and stay visible and clickable (both sides' pages reachable in either view). This deliberately keeps Earnings visible for the hirer (UI-SPEC hid it; D-02 is the locked decision). Footer: `<IdentitySwitcher />`.
4. components/shell/identity-switcher.tsx ('use client'): `SidebarFooter` card (64px, 12px padding, radius 6px, hover `bg-surface-2`, `data-testid="identity-card"`): 40px avatar (radius 8px, background `identity.avatarColor`, white 600 initial, or the avatarUrl image), name 13px/600, second line 12px muted `data-testid="sidebar-balance"` = `Expert · {formatCredits(balanceCents)}` or `Hirer · …`, ChevronsUpDown icon. In the collapsed icon rail, the avatar alone shows with a Tooltip containing name and balance (D-08: balance always visible). Clicking opens a Popover (side top, `bg-surface-2`, 1px `border-line-subtle`, radius 8px): title `Viewing as` (12px muted), one row per identity `{displayName} — Expert` / `{displayName} — Hirer` with 28px avatar and a `text-selected-fg` Check on the active one (`data-testid="identity-option-expert"` / `identity-option-hirer`), footer hint `Switch to see the other side of the loop.`. Selecting a row: `startTransition(async () => { const r = await switchIdentityAction(id); if (r.ok) { toast(`Switched to ${r.identity.displayName}`); router.refresh(); } })`, close the popover.
5. app/(app)/layout.tsx (server): `const ctx = await getShellContext()`; `const defaultOpen = (await cookies()).get('sidebar_state')?.value !== 'false'`; render `SidebarProvider` with `defaultOpen` and `style` setting `--sidebar-width: 244px` and `--sidebar-width-icon: 48px`; inside: `<AppSidebar ctx={ctx} />` and `<SidebarInset>` (page background `bg-background`, own vertical scroll, min-w-0) containing `children`; plus `<Toaster position="bottom-center" />` styled per UI-SPEC Bottom toast (`bg-selected`, 13px, radius 8px, 40px). `export const dynamic = 'force-dynamic'` (identity and balance are per request).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - app/(app)/layout.tsx contains `SidebarProvider`, `--sidebar-width`, `244px`, `48px`, `getShellContext(`, `await cookies()`, `sidebar_state`, `Toaster`
    - components/shell/app-sidebar.tsx contains `collapsible="icon"`, `data-side`, `BUILD`, `MY AGENTS`, `CREDITS`, `Admin`, `Settings`, `Collapse (⌘B)` and does not conditionally omit the Earnings row by identity kind (`grep -n "Earnings" components/shell/app-sidebar.tsx components/shell/nav.ts` shows it defined once in NAV_ITEMS with side 'expert')
    - components/shell/identity-switcher.tsx contains `Viewing as`, `Switch to see the other side of the loop.`, `switchIdentityAction(`, `router.refresh()`, `Switched to`, `data-testid="identity-card"`, `data-testid="sidebar-balance"`
    - lib/shell-context.ts contains `import 'server-only'` and `getWallet(`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>The shell layout, side-aware navigation and persistent Viewing-as switcher exist; any page placed under app/(app) renders inside them with the balance in the footer.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server shell context → client sidebar props | Serialized identity/wallet data crosses into the browser |
| Seeded/editable text → rendered HTML | Names, agent names and citation text are displayed |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-12 | Tampering (XSS) | chat-message.tsx, sidebar labels | mitigate | All text rendered as React children; no dangerouslySetInnerHTML anywhere in components/app or components/shell (acceptance grep) |
| T-01-25 | Information Disclosure | ShellContext props | mitigate | Only display fields (names, initials, colors, balance, agent names) are serialized; no keys, no other identities' wallets, no profile contact data |
| T-01-01 | Spoofing | Viewing as switcher | accept | D-01/D-02: switching identity is the product's stand-in for sign-in; server-side validation lives in switchIdentityAction (plan 01-05) |
</threat_model>

<verification>
- `pnpm typecheck && pnpm lint && pnpm build` exit 0
- Behavioral checks of the shell run in plans 01-07..01-10 once routes exist (e2e in 01-10)
</verification>

<success_criteria>
- Shell layout with collapsible sidebar, side-aware nav and Viewing-as switcher showing the live balance
- Shared components cover every UI-SPEC pattern the routes need
</success_criteria>

<output>
Create `.planning/phases/01-shell-wallet-shared-contracts/01-06-SUMMARY.md` when done
</output>
