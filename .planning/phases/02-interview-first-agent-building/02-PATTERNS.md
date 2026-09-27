# Phase 2: Interview-First Agent Building — Pattern Map

**Mapped:** 2026-09-26
**Scope:** 20 file/module entries; new backend filenames remain planner decisions.
**Coverage:** 10 existing-file/contract matches, 1 test role match, 9 without a production analog.

## File Classification

An “exact” match below means extend the existing file's structure, not preserve its Phase 1 placeholder behavior.

| New/Modified File or Module | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/types.ts` | model | transform | Same file, 27–119 | exact |
| `lib/demo-store.ts` | store | CRUD, event-driven | Same file, 51–100, 138–194 | exact |
| `components/app/builder.tsx` | component, hook | event-driven | Same file, 15–56, 83–101 | exact |
| `components/app/builder-section.tsx` | component | request-response | Same file, 23–87 | exact |
| `components/app/chat.tsx` | component | streaming, event-driven | Same file, 20–79, 98–169 | exact presentation |
| `components/app/add-credits.tsx` | component | request-response | Same file, 13–47 | exact presentation |
| `features/billing/pricing.ts` | utility | transform | Same file, 12–18, 43–55 | exact structure |
| `features/runtime/agent.ts` | service | streaming | Same file, 5–33 | exact contract only |
| `features/knowledge/search.ts` | service | request-response | Same file, 9–19, 71–81 | exact contract only |
| `features/builder/prompt-template.ts` | utility | transform | Same file, 5–38 | exact structure |
| New feature `*.test.ts` and billing test updates | test | transform, request-response | `features/billing/pricing.test.ts`, `lib/data/seed.test.ts` | role-match |
| New `lib/server/*` and generated database types | config, utility, model | request-response | None | none |
| New `lib/llm/*` | service | streaming, request-response | None; pricing types only | none |
| New billing reservation/settlement/reconciliation module | service | CRUD | None; browser precheck is insufficient | none |
| New interview controller/persona merge modules | service | CRUD, request-response | No adaptive/revision controller | none |
| New knowledge parser/intake/index modules | service, utility | file-I/O, batch | None | none |
| New runtime sufficiency/web/event persistence modules | service | streaming, event-driven | No provider/tool implementation | none |
| New `app/api/**/route.ts` | route | request-response, streaming | No active API routes | none |
| New `supabase/migrations/*` | migration | CRUD | Archived drafts only | none |
| New database seed/bootstrap script | utility | batch | Seed constants exist, no DB bootstrap | none |

Research identifies module families rather than a fixed new-file manifest. Split these families into concrete files during planning. Dependency/config changes (`package.json`, lockfile, environment example, test setup) support these entries; use existing config conventions and researched versions.

## Pattern Assignments

### Shared contracts: `lib/types.ts`

Use named exported types and `@/` type imports (lines 1–2). Keep agent/source IDs explicit, nullable source coordinates, and stable persisted IDs. Existing interview shape (92–99):

```ts
export type InterviewTurn = {
  id: string;
  agentId: string;
  position: number;
  question: string;
  answer: string | null;
  createdAt: string;
};
```

Extend this with revision/index state, linked follow-ups, pause/pending question state, and persona ownership. Extend `Citation` (82–90) into distinguishable expert/external provenance with immutable evidence snapshots. `Message.retrieved` (118) lacks excerpts; add them. Revisit money fields throughout `Message`/`LedgerEntry` (110–135) together with billing; do not retain whole-credit accounting by accident.

### Browser bridge: `lib/demo-store.ts`

Preserve selector-facing ergonomics and hydration behavior while moving authoritative data/mutations to the server. Existing subscription hooks (92–100):

```ts
export function useDemoSnapshot(): DemoState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** For components rendered inside the hydrated shell. */
export function useDemo(): DemoState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return s;
}
```

Selectors `agentById`, `messagesFor`, and `interviewTurnsFor` (142–144, 166–170, 181–186) are the compatibility surface. Keep browser storage for drafts/cache, not wallet authority. Storage recovery at 51–62 and 82–89 is appropriate for optional local drafts only. `precheck` (231–236) creates no durable hold; `debitRow` (238–242) silently caps a debit. Neither is a backend reservation/settlement analog. Replace canned usage and actions (244–362) through the shared server services.

### Builder UI: `builder.tsx`, `builder-section.tsx`

Copy alias/type import conventions from `builder.tsx` 3–13. Reuse `BuilderSplit` (34–56), `ConfigureDrawer` (59–119), and section route selection in `builder-section.tsx` (23–41). Keep the existing 480px drawer and reusable app/UI primitives; the approved UI-SPEC governs added mobile/editing states.

UI owner check, `builder.tsx` 15–20:

```ts
export function useBuilderAgent(): { s: DemoState; agent: Agent | undefined; isOwner: boolean } {
  const { agentId } = useParams<{ agentId: string }>();
  const s = useDemo();
  const agent = agentById(s, agentId);
  return { s, agent, isOwner: !!agent && agent.ownerId === currentIdentity(s).id };
}
```

This controls presentation only. Validate seeded identity and agent ownership again in new server handlers; no server guard exists to copy. `sourcesFor` and `answerCount` (22–30) use seeds and must read real persisted status/counts. Preserve `systemPromptOverride` through ordinary form edits; the drawer already labels custom prompts (88).

For interview/sandbox submit handling, adapt `builder-section.tsx` 73–77:

```ts
const result = await sendSandboxMessage(agent.id, text);
if (!result.ok) { setRefusal({ needed: result.neededCents, available: result.availableCents }); return false; }
setRefusal(null);
return true;
```

Extend result handling for configuration/cap/processing failures. Split persona/knowledge detail placeholders (90–108) into functional views using these section/layout patterns. Saved-answer UI must distinguish captured from indexed status.

### Chat and credits: `chat.tsx`, `add-credits.tsx`

`chat.tsx` 20–45 renders plain text and numbered citation chips; 58–79 supplies the initially collapsed retrieval disclosure. Add excerpt text, separate online citations, knowledge-gap copy, and live expandable tool rows. Add accessible disclosure state when extending the current buttons.

Preserve refused drafts and busy cleanup using `Composer`, 101–109:

```ts
const submit = async () => {
  const t = text.trim();
  if (!t || busy || disabled) return;
  setBusy(true);
  try {
    if ((await onSend(t)) !== false) setText("");
  } finally {
    setBusy(false);
  }
};
```

Add explicit error rendering and per-agent draft persistence; this excerpt does not catch transport errors. Preserve Enter/Shift+Enter handling (118–123), button labels/test IDs (139–145), and `NotEnoughCredits` (155–169).

Use the existing controlled Sheet composition in `add-credits.tsx` 25–30:

```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="w-[480px] border-line-faint bg-surface-1 sm:max-w-[480px]">
    <SheetHeader>
      <SheetTitle>Add credits</SheetTitle>
      <SheetDescription>Mock funding for the MVP. No payment is taken; each click adds credits and a ledger row.</SheetDescription>
    </SheetHeader>
```

Replace synchronous `grant` (15–18) with the server mock-funding operation and success/error states. Retain mock-funding wording; no real payment integration is implied.

### Runtime, knowledge, prompt and pricing

`features/runtime/agent.ts` 5–8 demonstrates lane imports:

```ts
import { disclaimerFor } from "@/lib/config/categories";
import { personaToSystemPrompt } from "@/features/builder/prompt-template";
import { toCitations, type RetrievedChunk } from "@/features/knowledge/search";
import type { Agent, Citation } from "@/lib/types";
```

Keep the discriminated NDJSON event-union style (25–33), extending with operation IDs, web-tool lifecycle, gap, additional refusal reasons, and settlement states. The real streaming implementation is new. `buildPrompt` (10–21) supplies source-coordinate formatting, but platform rules must move above the editable persona. Do not carry forward `cannedAnswer` or fixed `FOLLOW_UPS` (35–64).

Use `RetrievedChunk` in `features/knowledge/search.ts` 9–19 and the metadata conversion in 71–81:

```ts
export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c, i) => ({
    n: i + 1,
    chunkId: c.id,
    sourceType: c.sourceType,
    sourceName: c.sourceName,
    question: c.question,
    page: c.page,
    headingPath: c.headingPath,
  }));
}
```

Extend citation snapshots rather than relying only on mutable source records. The current lexical search, score floor, manufactured fallback chunks (23–68), and “Never throws” comment are obsolete. Implement scoped SQL retrieval and typed service failures from RESEARCH.md; an empty corpus must remain empty.

`features/builder/prompt-template.ts` 8–18 defines sparse empty fields; 20–38 builds deterministic prompt text. Copy deterministic transformation structure, replace expert-only grounding text (31–33), and keep platform rules outside generated/custom persona text. No field-ownership merge implementation exists.

`features/billing/pricing.ts` 12–18 isolates pure usage-to-cost calculation. Preserve that separation from side effects, but add exact money units, cache-write/tool usage and price snapshots. Replace whole-credit rounding (25–29); correct cache prices using RESEARCH.md. `splitUsageCharge`'s conservation invariant (38–55) is reusable, its rounding policy is not.

## Shared Patterns

- **Imports/UI:** `@/` aliases, explicit `import type`, client boundaries only in interactive modules, existing `buttonClass`, dark semantic tokens, and `components/ui/` primitives.
- **Validation/errors:** Current UI guards empty text and handles insufficient-credit unions; pricing throws `RangeError` for invalid multipliers. There is no shared server schema/error wrapper to copy. Establish request/output schemas and typed failures in new server modules; preserve draft text on recoverable failures.
- **Authorization:** `useBuilderAgent` is presentation logic, not authentication. There is no backend auth/ownership middleware analog. Follow the research's server-resolved demo identity and scoped-agent design without adding sign-in.
- **Tests:** Copy colocated Vitest `describe`/`it`/`expect` imports from `features/billing/pricing.test.ts` 1–2. Test externally meaningful invariants, e.g. line 25:

```ts
expect(s.hirerDebitCents).toBe(s.platformCostCents + s.platformMarginCents + s.expertCreditCents);
```

  Replace the old one-credit-minimum assertion (15–18). `lib/data/seed.test.ts` 13–30 demonstrates running-balance and ledger-conservation checks. `vitest.config.mts` 5–13 uses Node, `**/*.test.ts`, and the root alias. No current SQL concurrency, provider-stream, parser, or browser-test harness exists. Add meaningful coverage listed in RESEARCH.md and retain a separate real-service acceptance gate.

## No Analog Found

The nine backend entries above require fresh implementation from `02-RESEARCH.md`. Active `lib/` contains client/domain/config/seed code; active `features/` contains placeholder contracts; `app/` has no API handlers; root `supabase/` is absent. Archived Phase 1 SQL is a design reference only and must not be restored as a working backend. No durable transaction, daily cap, provider usage journal, ingestion worker, schema validation, tool stream, or server authorization implementation was found.

## Metadata

**Search scope:** active `lib/`, `features/`, `components/app/`, `app/`, root package/test configuration, and planning artifact paths.
**Targeted code/config files inspected:** 14, grouped into five pattern clusters above; no broader analog search needed.
**Project instructions:** `AGENTS.md` read; no `.codex/skills/` or `.agents/skills/` directories found. Before writing Next code, follow its installed-docs requirement.
**Changes:** This artifact only; no source or roadmap edits.
