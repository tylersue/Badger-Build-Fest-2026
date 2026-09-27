/** Rating and written-review rules for agent listings (MKT-05, MKT-V2-03). */
import { agentById, allConversations, commitDemo, currentIdentity, messagesFor, readDemo, reviewsFor, type DemoState } from "@/lib/demo-store";
import type { Review, ReviewStars } from "@/lib/types";

export const REVIEW_UNLOCK_MESSAGES = 5;
export const REVIEW_COMMENT_MAX = 1000;

export type ReviewEligibility =
  | { status: "eligible"; sent: number }
  | { status: "locked"; sent: number; needed: number }
  | { status: "reviewed"; review: Review }
  | { status: "owner" }
  | { status: "unavailable" };

export function messagesSentTo(s: DemoState, agentId: string, identityId: string): number {
  const conversationIds = new Set(allConversations(s).filter((c) => c.agentId === agentId && c.hirerId === identityId).map((c) => c.id));
  return [...conversationIds].reduce((total, id) => total + messagesFor(s, id).filter((message) => message.role === "user").length, 0);
}

export function reviewEligibility(s: DemoState, agentId: string, identityId: string): ReviewEligibility {
  const agent = agentById(s, agentId);
  if (!agent || agent.status !== "published") return { status: "unavailable" };
  if (agent.ownerId === identityId) return { status: "owner" };
  const review = reviewsFor(s, agent.id).find((item) => item.reviewerId === identityId);
  if (review) return { status: "reviewed", review };
  const sent = messagesSentTo(s, agent.id, identityId);
  if (sent < REVIEW_UNLOCK_MESSAGES) return { status: "locked", sent, needed: REVIEW_UNLOCK_MESSAGES };
  return { status: "eligible", sent };
}

export type ReviewInputResult = { ok: true; stars: ReviewStars; comment: string | null } | { ok: false; error: "invalid_stars" | "comment_too_long" };

export function validateReviewInput(input: { stars: number; comment: string }): ReviewInputResult {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) return { ok: false, error: "invalid_stars" };
  const comment = input.comment.trim();
  if (comment.length > REVIEW_COMMENT_MAX) return { ok: false, error: "comment_too_long" };
  return { ok: true, stars: input.stars as ReviewStars, comment: comment || null };
}

export function rollRating(avg: number, count: number, stars: ReviewStars): { ratingAvg: number; ratingCount: number } {
  return { ratingAvg: Math.round(((avg * count + stars) / (count + 1)) * 100) / 100, ratingCount: count + 1 };
}

export type ReviewPlanResult =
  | { ok: true; review: Review; rating: { ratingAvg: number; ratingCount: number } }
  | { ok: false; error: Exclude<ReviewEligibility["status"], "eligible"> | "invalid_stars" | "comment_too_long" };

export function planReview(s: DemoState, agentId: string, identityId: string, input: { stars: number; comment: string }, now: string, id?: string): ReviewPlanResult {
  const eligibility = reviewEligibility(s, agentId, identityId);
  if (eligibility.status !== "eligible") return { ok: false, error: eligibility.status };
  const validated = validateReviewInput(input);
  if (!validated.ok) return validated;
  const agent = agentById(s, agentId);
  if (!agent) return { ok: false, error: "unavailable" };
  return {
    ok: true,
    review: { id: id ?? `r-${crypto.randomUUID()}`, agentId: agent.id, reviewerId: identityId, stars: validated.stars, comment: validated.comment, createdAt: now },
    rating: rollRating(agent.ratingAvg, agent.ratingCount, validated.stars),
  };
}

export function applyReview(s: DemoState, plan: Extract<ReviewPlanResult, { ok: true }>): DemoState {
  const { review, rating } = plan;
  return {
    ...s,
    reviews: [...(s.reviews ?? []), review],
    agentEdits: { ...s.agentEdits, [review.agentId]: { ...s.agentEdits[review.agentId], ...rating } },
  };
}

export type SubmitReviewResult = ReviewPlanResult;

export function submitReview(agentId: string, input: { stars: number; comment: string }): SubmitReviewResult {
  const identityId = currentIdentity(readDemo()).id;
  const now = new Date().toISOString();
  const initial = planReview(readDemo(), agentId, identityId, input, now);
  if (!initial.ok) return initial;
  let result: SubmitReviewResult = initial;
  commitDemo((s) => {
    const plan = planReview(s, agentId, identityId, input, now, initial.review.id);
    result = plan;
    return plan.ok ? applyReview(s, plan) : s;
  });
  return result;
}
