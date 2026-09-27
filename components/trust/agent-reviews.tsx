"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/app/ui";
import { currentIdentity, displayName, reviewsFor, useDemo } from "@/lib/demo-store";
import { IdentityLogo } from "@/components/app/identity-logo";
import { cappedCount, ratingTotal, writtenReviewTotal } from "@/lib/config/purchase";
import { formatRelative } from "@/lib/format";
import type { Agent, ReviewStars } from "@/lib/types";
import { REVIEW_COMMENT_MAX, reviewEligibility, submitReview } from "@/features/trust/reviews";

const ERROR_COPY = {
  invalid_stars: "Choose a rating from 1 to 5 stars.",
  comment_too_long: `Keep the comment under ${REVIEW_COMMENT_MAX} characters.`,
  locked: "Send at least five messages before rating this agent.",
  reviewed: "You have already rated this agent.",
  owner: "You can't rate your own agent.",
  unavailable: "This agent is unavailable for ratings.",
} as const;

export function AgentReviews({ agent }: { agent: Agent }) {
  const state = useDemo();
  const me = currentIdentity(state);
  const eligibility = reviewEligibility(state, agent.id, me.id);
  const reviews = reviewsFor(state, agent.id);
  const writtenReviews = reviews.filter((review) => review.comment !== null).length;
  const [stars, setStars] = useState<ReviewStars | 0>(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = submitReview(agent.id, { stars, comment });
    if (!result.ok) {
      setError(ERROR_COPY[result.error]);
      return;
    }
    setStars(0);
    setComment("");
    toast("Thanks. Your rating is on the listing.");
  };

  return (
    <section aria-label="Ratings and reviews">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <strong className="text-xl tabular-nums">{agent.ratingCount ? `★ ${agent.ratingAvg.toFixed(1)}` : "No ratings yet"}</strong>
        <span className="text-sm text-fg-muted">{ratingTotal(agent).toLocaleString()} ratings</span>
        <span className="text-sm text-fg-muted">{cappedCount(writtenReviewTotal(agent, writtenReviews))} written reviews</span>
      </div>

      {eligibility.status === "eligible" && (
        <form data-testid="review-form" onSubmit={submit} className="mt-5 rounded-lg border border-line-subtle bg-surface-1 p-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Your rating</legend>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((value) => <button key={value} type="button" aria-label={`${value} stars`} aria-pressed={stars === value} onClick={() => setStars(value)} className={`rounded px-1 py-0.5 text-xl ${stars >= value ? "text-warning" : "text-fg-muted"}`}>★</button>)}
            </div>
          </fieldset>
          <label htmlFor="review-comment" className="mt-4 block text-sm font-medium">Add a comment (optional)</label>
          <textarea id="review-comment" value={comment} maxLength={REVIEW_COMMENT_MAX} onChange={(event) => setComment(event.target.value)} rows={4} className="mt-1 w-full resize-y rounded border border-line-default bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-border" />
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-fg-muted"><span>{comment.length}/{REVIEW_COMMENT_MAX}</span>{error && <span role="alert" className="text-danger">{error}</span>}</div>
          <button type="submit" disabled={!stars} className={`mt-3 ${buttonClass("primary", "lg")}`}>Submit rating</button>
        </form>
      )}
      {eligibility.status === "locked" && <p className="mt-4 text-sm text-fg-muted">Rating unlocks after 5 messages. You&apos;ve sent {eligibility.sent} of 5.</p>}
      {eligibility.status === "reviewed" && <p className="mt-4 text-sm text-fg-muted">You rated this {eligibility.review.stars} stars {formatRelative(eligibility.review.createdAt)}.</p>}
      {eligibility.status === "owner" && <p className="mt-4 text-sm text-fg-muted">You can&apos;t rate your own agent.</p>}

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold">Written reviews</h3>
        {reviews.length === 0 ? <p className="text-sm text-fg-muted">No written reviews yet.</p> : (
          <ul className="divide-y divide-line-subtle">
            {reviews.map((review) => <li key={review.id} data-testid="review-item" className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><strong className="text-warning">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</strong><span className="inline-flex items-center gap-2 font-medium"><IdentityLogo identityId={review.reviewerId} size={22} />{displayName(state, review.reviewerId)}</span><time className="text-xs text-fg-muted">{formatRelative(review.createdAt)}</time></div>
              {review.comment && <p className="mt-2 whitespace-pre-line text-sm text-fg-tertiary">{review.comment}</p>}
            </li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
