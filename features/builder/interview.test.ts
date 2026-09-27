import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { interviewRig } from "./interview-test-fixture";

const submit = (r: ReturnType<typeof interviewRig>, text: string, requestKey = "send-1") => {
  const view = r.getView();
  return r.service.submitInterviewAnswer({ agentId: "agent-a", questionId: view.pendingQuestion!.id,
    text, requestKey, expectedVersion: view.version });
};

describe("saved adaptive interview", () => {
  it("captures, indexes and retrieves a normal answer in the same service request", async () => {
    const r = interviewRig();
    const result = await submit(r, "At a family meeting last week, I asked about their goals and changed my plan.");
    expect(result.ok).toBe(true);
    expect(r.calls).toContain("activate_revision");
    const retrieved = await r.search("family meeting goals");
    expect(retrieved.ok && retrieved.data[0]).toMatchObject({ sourceType: "interview", question: "Tell me about your work" });
    expect(r.structured).toHaveBeenCalledWith(expect.objectContaining({ stageKey: "interview:question:send-1" }),
      { settle: false });
    expect(r.deps.settle).toHaveBeenCalledTimes(1);
    const answer = r.getView().answers[0];
    expect(answer.indexedRevisionId).toBe(answer.revisionId);
  });

  it("keeps a vague thread focused and skips into a new question", async () => {
    const r = interviewRig();
    const first = await submit(r, "I help people.");
    expect(first.ok && first.data.pendingQuestion?.text).toMatch(/one specific.*situation/i);
    const skipped = await r.service.controlInterview("agent-a", "skip", "skip-1");
    expect(skipped.ok && skipped.data.pendingQuestion?.text).toBe("What led you to that decision?");
    expect(r.getView().skippedQuestionIds).toHaveLength(1);
    expect(r.getView().pendingQuestion).toHaveProperty("id");
  });

  it("preserves the answer after a provider failure, replays request keys, and resumes the same pending question", async () => {
    const r = interviewRig();
    r.setProviderFails(true);
    const saved = await submit(r, "At a family meeting last week, I asked about goals and adjusted the plan.");
    expect(saved.ok).toBe(false);
    expect(r.getView().answers).toHaveLength(1);
    expect(r.getView().answers[0].state).toBe("ready");
    const repeated = await r.service.submitInterviewAnswer({ agentId: "agent-a", questionId: "q1",
      text: "At a family meeting last week, I asked about goals and adjusted the plan.", requestKey: "send-1", expectedVersion: 2 });
    expect(repeated.ok).toBe(true);
    expect(r.structured).toHaveBeenCalledTimes(1);
    r.setProviderFails(false);
    const continued = await r.service.controlInterview("agent-a", "continue", "continue-1");
    expect(continued.ok && continued.data.pendingQuestion).toBeTruthy();
    const pending = r.getView().pendingQuestion;
    await r.service.controlInterview("agent-a", "pause", "pause-1");
    expect(r.getView().state).toBe("paused");
    await r.service.controlInterview("agent-a", "resume", "resume-1");
    expect(r.getView().pendingQuestion).toEqual(pending);
  });

  it("edits a captured answer, keeps the previous active revision until replacement, adds linked detail, and deletes both", async () => {
    const r = interviewRig();
    await submit(r, "At a family meeting last week, I asked about goals and adjusted the plan.");
    const old = r.getView().answers[0];
    r.setEmbedFails(true);
    const edited = await r.service.editAnswer("agent-a", old.id, "At another meeting, I tried a different approach.", old.version, "edit-1");
    expect(edited.ok && edited.data.answers[0]).toMatchObject({ state: "failed", previousActive: true,
      indexedRevisionId: old.revisionId });
    r.setEmbedFails(false);
    const searchOld = await r.search("family meeting");
    expect(searchOld.ok && searchOld.data[0]?.content).toContain("At a family meeting last week");
    const answer = r.getView().answers[0];
    const detail = await r.service.addDetail("agent-a", answer.id, "I also asked the family what had failed before.", answer.version, "detail-1");
    expect(detail.ok && detail.data.answers).toHaveLength(2);
    expect(detail.ok && detail.data.answers[0].text).toBe(answer.text);
    expect(detail.ok && detail.data.answers[1].parentAnswerId).toBe(answer.id);
    const deleted = await r.service.deleteAnswer("agent-a", answer.id, answer.version, "delete-1");
    expect(deleted.ok && deleted.data.answers).toHaveLength(0);
    expect(r.reconcile).toHaveBeenCalled();
  });

  it("retries an interrupted index job and advances the question after its saved answer becomes active", async () => {
    const r = interviewRig();
    r.setEmbedFails(true);
    const captured = await submit(r, "At a meeting last week, I asked about goals and changed the plan.");
    expect(captured.ok && captured.data.answers[0].state).toBe("failed");
    expect(r.structured).not.toHaveBeenCalled();
    const answer = r.getView().answers[0];
    r.setEmbedFails(false);
    const retried = await r.service.retryAnswerIndex("agent-a", answer.id, answer.version, "retry-1");
    expect(retried.ok && retried.data.pendingQuestion).toBeTruthy();
    expect(r.jobs.get(answer.jobId!)?.state).toBe("ready");
    expect(r.embed).toHaveBeenCalledTimes(2);
    expect(r.deps.settle).toHaveBeenCalledTimes(1);
    const found = await r.search("goals");
    expect(found.ok && found.data).toHaveLength(1);
  });

  it("offers advisory readiness only with cited examples, principle and exception; dismissing keeps the interview open", async () => {
    const r = interviewRig();
    await submit(r, "At a client meeting last week, I asked about goals and changed the plan.", "send-1");
    const first = r.getView().answers[0].revisionId;
    await submit(r, "In another case, I chose a different plan because the client needed a shorter step.", "send-2");
    const second = r.getView().answers[1].revisionId;
    r.setReadiness({ concreteExampleRevisionIds: [first, second], principleRevisionIds: [second],
      exceptionRevisionIds: ["invented-id"] });
    await submit(r, "When a client could not follow that plan, I changed the pace.", "send-3");
    expect(r.getView().readiness.suggested).toBe(false);
    const third = r.getView().answers[2].revisionId;
    r.setReadiness({ concreteExampleRevisionIds: [first, second], principleRevisionIds: [second],
      exceptionRevisionIds: [third] });
    await submit(r, "For example, last week I asked a client to retry the exercise slowly.", "send-4");
    expect(r.getView().readiness.suggested).toBe(true);
    const dismissed = await r.service.controlInterview("agent-a", "dismiss-ready", "dismiss-1");
    expect(dismissed.ok && dismissed.data.readiness.dismissed).toBe(true);
    expect(dismissed.ok && dismissed.data.state).toBe("active");
    expect(dismissed.ok && dismissed.data.pendingQuestion).toBeTruthy();
  });
});
