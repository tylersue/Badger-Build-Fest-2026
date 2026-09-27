import { describe, expect, it } from "vitest";
import { AGENTS, CONVERSATIONS, FLAGS, IDENTITIES, LEDGER, REVIEWS, SAM } from "./seed";

const balance = (id: string) => LEDGER.filter((r) => r.identityId === id).reduce((n, r) => n + r.amountCents, 0);

describe("seed data", () => {
  it("starts both switchable identities at 5,000 credits (D-09)", () => {
    const switchable = IDENTITIES.filter((i) => i.isSwitchable);
    expect(switchable.map((i) => i.kind).sort()).toEqual(["expert", "hirer"]);
    for (const i of switchable) expect(balance(i.id)).toBe(5000);
  });

  it("keeps each ledger row's balance_after equal to the running sum", () => {
    for (const i of IDENTITIES) {
      const rows = LEDGER.filter((r) => r.identityId === i.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      let running = 0;
      for (const r of rows) {
        running += r.amountCents;
        expect(r.balanceAfter).toBe(running);
      }
    }
  });

  it("reconciles every usage charge: hirer debit = platform share + expert earnings", () => {
    const refs = new Set(LEDGER.filter((r) => r.kind === "debit" && r.purpose === "chat_message").map((r) => r.refId));
    for (const ref of refs) {
      const rows = LEDGER.filter((r) => r.refId === ref);
      const debit = -rows.filter((r) => r.kind === "debit").reduce((n, r) => n + r.amountCents, 0);
      const split = rows.filter((r) => ["platform_cost", "platform_margin", "earnings"].includes(r.kind)).reduce((n, r) => n + r.amountCents, 0);
      expect(split).toBe(debit);
    }
  });

  it("covers all three seed categories with published agents", () => {
    const cats = new Set(AGENTS.filter((a) => a.status === "published").map((a) => a.persona.category));
    expect(cats.size).toBe(3);
  });
});

describe("seed reviews (MKT-05, MKT-V2-03, D-07)", () => {
  it("every review has integer stars in 1..5", () => {
    for (const r of REVIEWS) {
      expect(Number.isInteger(r.stars)).toBe(true);
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.stars).toBeLessThanOrEqual(5);
    }
  });

  it("reviewer ids are unique per agent and never the agent's owner or sam", () => {
    const byAgent = new Map<string, string[]>();
    for (const r of REVIEWS) byAgent.set(r.agentId, [...(byAgent.get(r.agentId) ?? []), r.reviewerId]);
    for (const [agentId, reviewerIds] of byAgent) {
      expect(new Set(reviewerIds).size).toBe(reviewerIds.length);
      expect(reviewerIds).not.toContain(SAM);
      const owner = AGENTS.find((a) => a.id === agentId)?.ownerId;
      expect(reviewerIds).not.toContain(owner);
    }
  });

  it("every reviewed agent is published, and every reviewer id exists in IDENTITIES", () => {
    const ids = new Set(IDENTITIES.map((i) => i.id));
    for (const r of REVIEWS) {
      const agent = AGENTS.find((a) => a.id === r.agentId);
      expect(agent?.status).toBe("published");
      expect(ids.has(r.reviewerId)).toBe(true);
    }
  });

  it("each agent's seeded review count is at most its ratingCount", () => {
    const counts = new Map<string, number>();
    for (const r of REVIEWS) counts.set(r.agentId, (counts.get(r.agentId) ?? 0) + 1);
    for (const [agentId, count] of counts) {
      const agent = AGENTS.find((a) => a.id === agentId)!;
      expect(count).toBeLessThanOrEqual(agent.ratingCount);
    }
  });
});

describe("seed flags (MKT-06, ADMN-01, D-08)", () => {
  it("every flag's agent exists", () => {
    const agentIds = new Set(AGENTS.map((a) => a.id));
    for (const f of FLAGS) expect(agentIds.has(f.agentId)).toBe(true);
  });

  it("every conversation flag's conversation exists and has the same agentId", () => {
    for (const f of FLAGS.filter((f) => f.targetType === "conversation")) {
      const conversation = CONVERSATIONS.find((c) => c.id === f.conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.agentId).toBe(f.agentId);
    }
  });

  it("every resolved flag has resolvedAt and a non-empty resolutionNote", () => {
    for (const f of FLAGS.filter((f) => f.status === "resolved")) {
      expect(f.resolvedAt).toBeTruthy();
      expect(f.resolutionNote).toBeTruthy();
    }
  });
});
