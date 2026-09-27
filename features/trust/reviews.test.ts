import { afterEach, describe, expect, it } from "vitest";
import { createInitialDemoState } from "@/lib/demo-store";
import type { Message } from "@/lib/types";
import { loadDemoStore, resetDemoHarness } from "@/lib/testing/demo-store-harness";
import { REVIEW_COMMENT_MAX, REVIEW_UNLOCK_MESSAGES, applyReview, messagesSentTo, planReview, reviewEligibility, rollRating, validateReviewInput } from "./reviews";

const AGENT_ID = "maria-chen-physical-therapy";
const NOW = "2026-09-27T06:10:00.000Z";

afterEach(() => resetDemoHarness());

function withSamMessages(count: number) {
  const base = createInitialDemoState();
  const added: Message[] = Array.from({ length: count }, (_, index) => ({
    id: `m-review-${index}`, conversationId: "c-knee-swelling", role: "user", content: `Question ${index}`,
    citations: [], feedback: null, costCents: null, createdAt: `${NOW.slice(0, 19)}.${String(index).padStart(3, "0")}Z`,
  }));
  return { ...base, messages: added };
}

describe("review eligibility", () => {
  it("locks Sam at his three seeded messages and excludes the owner", () => {
    const state = createInitialDemoState();
    expect(messagesSentTo(state, AGENT_ID, "sam")).toBe(3);
    expect(reviewEligibility(state, AGENT_ID, "sam")).toEqual({ status: "locked", sent: 3, needed: REVIEW_UNLOCK_MESSAGES });
    expect(reviewEligibility(state, AGENT_ID, "maria")).toEqual({ status: "owner" });
  });

  it("unlocks at five messages and stays eligible at six", () => {
    expect(reviewEligibility(withSamMessages(1), AGENT_ID, "sam")).toMatchObject({ status: "locked", sent: 4 });
    expect(reviewEligibility(withSamMessages(2), AGENT_ID, "sam")).toMatchObject({ status: "eligible", sent: 5 });
    expect(reviewEligibility(withSamMessages(3), AGENT_ID, "sam")).toMatchObject({ status: "eligible", sent: 6 });
  });

  it("rejects missing and unpublished agents", () => {
    const base = createInitialDemoState();
    expect(reviewEligibility(base, "missing", "sam")).toEqual({ status: "unavailable" });
    expect(reviewEligibility({ ...base, agentEdits: { ...base.agentEdits, [AGENT_ID]: { status: "unpublished" } } }, AGENT_ID, "sam")).toEqual({ status: "unavailable" });
  });
});

describe("review validation and rating", () => {
  it.each([0, 6, 4.5, Number.NaN])("rejects invalid star value %s", (stars) => {
    expect(validateReviewInput({ stars, comment: "ok" })).toEqual({ ok: false, error: "invalid_stars" });
  });

  it("trims whitespace-only comments to null and accepts the exact comment limit", () => {
    expect(validateReviewInput({ stars: 5, comment: "   " })).toEqual({ ok: true, stars: 5, comment: null });
    expect(validateReviewInput({ stars: 4, comment: "a".repeat(REVIEW_COMMENT_MAX) }).ok).toBe(true);
    expect(validateReviewInput({ stars: 4, comment: "a".repeat(REVIEW_COMMENT_MAX + 1) })).toEqual({ ok: false, error: "comment_too_long" });
  });

  it("rolls the seeded 4.8 average to 4.81 and rounds a positive tie upward", () => {
    expect(rollRating(4.8, 23, 5)).toEqual({ ratingAvg: 4.81, ratingCount: 24 });
    expect(rollRating(4, 1, 5).ratingAvg).toBe(4.5);
  });
});

describe("plan and apply review", () => {
  it("rejects a review until the message threshold is met", () => {
    expect(planReview(createInitialDemoState(), AGENT_ID, "sam", { stars: 5, comment: "ok" }, NOW)).toEqual({ ok: false, error: "locked" });
  });

  it("appends the review and updates rating fields without touching updatedAt", () => {
    const state = withSamMessages(2);
    const plan = planReview(state, AGENT_ID, "sam", { stars: 5, comment: "  Clear and practical  " }, NOW, "r-review-test");
    expect(plan).toMatchObject({ ok: true, review: { comment: "Clear and practical", stars: 5, id: "r-review-test" }, rating: { ratingAvg: 4.81, ratingCount: 24 } });
    if (!plan.ok) throw new Error("expected review plan to succeed");
    const next = applyReview(state, plan);
    expect(next.reviews?.at(-1)).toEqual(plan.review);
    expect(next.agentEdits[AGENT_ID]).toEqual({ ratingAvg: 4.81, ratingCount: 24 });
  });
});

describe("store action and persistence", () => {
  it("unlocks after two new chat messages, submits once, updates ratings, and persists", async () => {
    const { store, storage } = await loadDemoStore();
    const initial = store.readDemo();
    store.switchIdentity("sam");
    await store.sendChatMessage("c-knee-swelling", "What should I do about swelling after a run?");
    expect(reviewEligibility(store.readDemo(), AGENT_ID, "sam")).toMatchObject({ status: "locked", sent: 4 });
    await store.sendChatMessage("c-knee-swelling", "Which sign means I should stop?");
    expect(reviewEligibility(store.readDemo(), AGENT_ID, "sam")).toMatchObject({ status: "eligible", sent: 5 });
    const { submitReview } = await import("./reviews");
    expect(submitReview(AGENT_ID, { stars: 5, comment: "Clear and practical" }).ok).toBe(true);
    const second = submitReview(AGENT_ID, { stars: 1, comment: "second" });
    expect(second).toEqual({ ok: false, error: "reviewed" });
    const saved = store.readDemo();
    const addedReviews = saved.reviews ?? [];
    expect(addedReviews).toHaveLength(1);
    expect(store.agentById(saved, AGENT_ID)).toMatchObject({ ratingAvg: 4.81, ratingCount: 24 });
    expect(store.reviewsFor(saved, AGENT_ID)[0]).toMatchObject({ reviewerId: "sam", stars: 5, comment: "Clear and practical" });
    const reload = await loadDemoStore(JSON.parse(storage.getItem("bx-demo-v1")!));
    expect(reload.store.agentById(reload.store.readDemo(), AGENT_ID)).toMatchObject({ ratingAvg: 4.81, ratingCount: 24 });
    expect(reload.store.reviewsFor(reload.store.readDemo(), AGENT_ID)).toHaveLength(4);
    expect(initial.agentEdits[AGENT_ID]).toBeUndefined();
  });
});
