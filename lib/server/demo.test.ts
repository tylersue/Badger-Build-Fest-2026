import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ServiceDb } from "./db";
import { bootstrapDemoSeed } from "@/scripts/seed";
import { createAgent, getDemoSnapshot, importLegacyDraft, resetPresentationFixtures, saveProfile } from "./demo";

type Row = Record<string, unknown>;
type TableName = string;

function fakeDatabase() {
  const tables = new Map<TableName, Row[]>();
  const calls: { table: string; method: string; filters?: unknown }[] = [];
  const imports = new Map<string, { hash: string; result: Row }>();
  const rows = (table: string) => {
    if (!tables.has(table)) tables.set(table, []);
    return tables.get(table)!;
  };
  const db = {
    from(table: string) {
      let mode: "select" | "update" = "select";
      let patch: Row = {};
      const filters: ((row: Row) => boolean)[] = [];
      const query = {
        select() { return query; },
        eq(key: string, wanted: unknown) { filters.push((row) => row[key] === wanted); return query; },
        is(key: string, wanted: unknown) { filters.push((row) => (row[key] ?? null) === wanted); return query; },
        in(key: string, wanted: unknown[]) { filters.push((row) => wanted.includes(row[key])); return query; },
        or(expression: string) {
          const [, owner] = expression.match(/^status\.eq\.published,owner_id\.eq\.(.+)$/) ?? [];
          filters.push((row) => row.status === "published" || row.owner_id === owner);
          return query;
        },
        order() { return query; },
        update(value: Row) { mode = "update"; patch = value; return query; },
        async upsert(input: Row[], options: { onConflict: string; ignoreDuplicates: boolean }) {
          calls.push({ table, method: "upsert" });
          const keys = options.onConflict.split(",");
          for (const item of input) {
            if (!rows(table).some((stored) => keys.every((key) => stored[key] === item[key]))) {
              rows(table).push({ ...item, version: 1, updated_at: "2026-01-01T00:00:00Z" });
            }
          }
          return { data: null, error: null };
        },
        async run(single = false) {
          calls.push({ table, method: mode, filters: filters.length });
          const selected = rows(table).filter((row) => filters.every((filter) => filter(row)));
          if (mode === "update") {
            selected.forEach((row) => Object.assign(row, patch, { version: Number(row.version ?? 1) + 1 }));
          }
          if (single) return { data: selected[0] ?? null, error: null };
          return { data: selected, error: null };
        },
        single() { return query.run(true); },
        maybeSingle() { return query.run(true); },
        then(resolve: (result: { data: Row[] | Row | null; error: null }) => unknown) { return query.run().then(resolve); },
      };
      return query;
    },
    async rpc(name: string, args: Row) {
      calls.push({ table: name, method: "rpc" });
      if (name === "bootstrap_seed_credit") {
        const identity = String(args.p_identity_id);
        const key = `seed-opening:${identity}`;
        if (!rows("ledger").some((row) => row.id === key)) {
          let wallet = rows("wallets").find((row) => row.identity_id === identity);
          if (!wallet) { wallet = { identity_id: identity, balance_units: 0, held_units: 0 }; rows("wallets").push(wallet); }
          wallet.balance_units = Number(wallet.balance_units) + 50_000_000_000;
          rows("ledger").push({ id: key, identity_id: identity, amount_units: 50_000_000_000,
            balance_after_units: wallet.balance_units, kind: "seed", origin: "fixture", created_at: "2026-01-01" });
        }
        return { data: null, error: null };
      }
      if (name === "commit_legacy_draft") {
        const key = `${args.p_identity_id}:${args.p_import_key}`;
        const prior = imports.get(key);
        if (prior) return prior.hash === args.p_payload_hash
          ? { data: prior.result, error: null }
          : { data: null, error: { code: "23505" } };
        const result = { id: `legacy:${key}`, imported: true };
        imports.set(key, { hash: String(args.p_payload_hash), result });
        return { data: result, error: null };
      }
      if (name === "create_demo_agent") {
        const id = String(args.p_agent_id);
        rows("agents").push({ id, owner_id: args.p_identity_id, slug: id, icon: "bot",
          category: args.p_category, status: "draft", rate_multiplier: 1,
          rating_avg: 0, rating_count: 0, usage_count: 0, origin: "live",
          created_at: "2026-01-01", updated_at: "2026-01-01" });
        rows("interview_sessions").push({ id: `session:${id}`, agent_id: id, state: "paused" });
        rows("persona_fields").push({ agent_id: id, field: "name", value: args.p_name, origin: "expert" });
        return { data: id, error: null };
      }
      return { data: null, error: { code: "unknown" } };
    },
  };
  return { db: db as unknown as ServiceDb, rows, calls };
}

describe("server demo continuity", () => {
  it("replays fixture bootstrap without duplicate grants, history or searchable vectors", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    const first = Object.fromEntries(["identities", "agents", "questions", "answers", "conversations", "messages", "ledger"]
      .map((table) => [table, fake.rows(table).length]));
    await bootstrapDemoSeed(fake.db);
    expect(Object.fromEntries(Object.keys(first).map((table) => [table, fake.rows(table).length]))).toEqual(first);
    expect(fake.rows("wallets")).toHaveLength(9);
    expect(fake.rows("wallets").every((wallet) => wallet.balance_units === 50_000_000_000)).toBe(true);
    expect(fake.rows("chunks")).toHaveLength(0);
    expect(fake.rows("answers").every((answer) => answer.indexed_revision_id == null)).toBe(true);
    expect(fake.rows("sources").every((source) => source.active_revision_id == null)).toBe(true);
  });

  it("scopes wallet, ledger, drafts, turns and conversations to the selected identity", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    Object.assign(fake.rows("agents").find((row) => row.id === "maria-chen-physical-therapy")!,
      { prompt_mode: "custom", custom_prompt: "private expert instructions" });
    const snapshot = await getDemoSnapshot("sam", fake.db);
    expect(snapshot.wallet.balanceUnits).toBe("50000000000");
    expect(snapshot.ledger.every((entry) => entry.identityId === "sam")).toBe(true);
    expect(snapshot.agents.some((agent) => agent.status === "draft" && agent.ownerId === "maria")).toBe(false);
    expect(snapshot.interviewTurns).toHaveLength(0);
    expect(snapshot.sources).toHaveLength(0);
    expect(snapshot.agents.find((agent) => agent.id === "maria-chen-physical-therapy")?.systemPromptOverride).toBeNull();
    expect(snapshot.conversations.every((conversation) => conversation.hirerId === "sam")).toBe(true);
    expect(snapshot.messages.every((message) => snapshot.conversations.some((conversation) => conversation.id === message.conversationId))).toBe(true);
    const expertView = await getDemoSnapshot("maria", fake.db);
    expect(expertView.conversations.some((conversation) => conversation.id === "c-shoulder-plan")).toBe(true);
    expect(expertView.conversations.some((conversation) => conversation.id === "c-knee-swelling")).toBe(false);
    await expect(getDemoSnapshot("dev", fake.db)).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("resets fixtures without touching live ledger, usage or the real balance", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    fake.rows("wallets").find((row) => row.identity_id === "maria")!.balance_units = 49_000_000_000;
    fake.rows("ledger").push({ id: "live-debit", identity_id: "maria", amount_units: -1_000_000_000,
      balance_after_units: 49_000_000_000, kind: "debit", origin: "live", created_at: "2026-02-01" });
    fake.rows("operations").push({ id: "live-operation", identity_id: "maria" });
    fake.rows("daily_budgets").push({ day: "2026-02-01", spent_units: 1_000_000_000 });
    const reset = await resetPresentationFixtures("maria", fake.db);
    expect(reset.wallet.balanceUnits).toBe("49000000000");
    expect(fake.rows("ledger").filter((row) => row.id === "live-debit")).toHaveLength(1);
    expect(fake.rows("operations")).toHaveLength(1);
    expect(fake.rows("daily_budgets")[0].spent_units).toBe(1_000_000_000);
    expect(fake.calls.some((call) => call.method === "delete")).toBe(false);
  });

  it("rejects browser financial fields and protects original draft keys", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    const results = await importLegacyDraft("maria", [
      { kind: "profile", key: "local-1", patch: { displayName: "Updated Maria", balanceCents: 99999 } },
      { kind: "answer", key: "local-2", agentId: "maria-chen-running-form-clinic",
        question: "How do you coach?", text: "I ask about training history first." },
    ], fake.db);
    expect(results[0]).toEqual({ key: "local-1", ok: false, code: "invalid_input" });
    expect(results[1]).toMatchObject({ key: "local-2", ok: true });
    const repeat = await importLegacyDraft("maria", [{ kind: "answer", key: "local-2",
      agentId: "maria-chen-running-form-clinic", question: "How do you coach?",
      text: "I ask about training history first." }], fake.db);
    expect(repeat[0]).toMatchObject({ key: "local-2", ok: true, id: (results[1] as { id: string }).id });
    const conflict = await importLegacyDraft("maria", [{ kind: "answer", key: "local-2",
      agentId: "maria-chen-running-form-clinic", question: "Changed question", text: "Different text" }], fake.db);
    expect(conflict[0]).toEqual({ key: "local-2", ok: false, code: "conflict" });
    expect(fake.calls.filter((call) => call.table === "commit_legacy_draft")).toHaveLength(3);
  });

  it("creates an owned draft with a full ID and initial interview session", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    const agent = await createAgent("maria", { name: "Running basics", category: "health_pt" }, fake.db);
    expect(agent.id).toMatch(/^agent-[0-9a-f-]{36}$/);
    expect(agent.ownerId).toBe("maria");
    expect(agent.status).toBe("draft");
    expect(fake.rows("interview_sessions").some((row) => row.agent_id === agent.id)).toBe(true);
    expect((await getDemoSnapshot("maria", fake.db)).agents.some((row) => row.id === agent.id)).toBe(true);
    await expect(createAgent("sam", { name: "No", category: "health_pt" }, fake.db))
      .rejects.toMatchObject({ code: "not_owner" });
    await expect(createAgent("maria", { name: "No", category: "other" }, fake.db))
      .rejects.toMatchObject({ code: "invalid_input" });
  });

  it("rejects unsafe profile URLs and stale profile versions", async () => {
    const fake = fakeDatabase();
    await bootstrapDemoSeed(fake.db);
    await expect(saveProfile("maria", { patch: { contactUrl: "javascript:alert(1)" }, expectedVersion: 1 }, fake.db))
      .rejects.toMatchObject({ code: "invalid_input" });
    const first = await saveProfile("maria", { patch: { bio: "New bio" }, expectedVersion: 1 }, fake.db);
    expect(first.profile.bio).toBe("New bio");
    expect(first.version).toBe(2);
    await expect(saveProfile("maria", { patch: { bio: "Stale write" }, expectedVersion: 1 }, fake.db))
      .rejects.toMatchObject({ code: "conflict" });
    expect(fake.rows("profiles").find((row) => row.identity_id === "maria")?.bio).toBe("New bio");
  });
});
