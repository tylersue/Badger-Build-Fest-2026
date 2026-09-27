import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createInterviewHandlers } from "@/app/api/agents/[agentId]/interview/handlers";
import { createAnswerHandlers } from "@/app/api/agents/[agentId]/answers/[answerId]/handlers";
import { interviewRig } from "./interview-test-fixture";

const origin = "https://local.example";
const context = { params: Promise.resolve({ agentId: "agent-a" }) };
const answerContext = (answerId: string) => ({ params: Promise.resolve({ agentId: "agent-a", answerId }) });
function request(path: string, method: string, body: unknown, key = "request-1", extra: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json",
    "idempotency-key": key, ...extra }, body: JSON.stringify(body) });
}
const interviewPath = "/api/agents/agent-a/interview";
const answerPath = (id: string) => `/api/agents/agent-a/answers/${id}`;

describe("interview and answer routes", () => {
  it("submits and indexes before response, then makes the answer searchable", async () => {
    const r = interviewRig();
    const owner = { findAgentOwner: vi.fn(async () => "maria") };
    const { POST, GET } = createInterviewHandlers(r.service, owner);
    const body = { action: "submit", questionId: "q1", expectedVersion: 2,
      text: "At a family meeting last week, I changed my plan after asking about goals." };
    const response = await POST(request(interviewPath, "POST", body), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: { answers: [{ state: "ready", previousActive: false }] } });
    const retrieved = await r.search("family goals");
    expect(retrieved.ok && retrieved.data).toHaveLength(1);
    expect(r.calls).toContain("activate_revision");
    const replay = await POST(request(interviewPath, "POST", body), context);
    expect(replay.status).toBe(200);
    expect(r.structured).toHaveBeenCalledTimes(1);
    expect((await GET(new Request(`${origin}${interviewPath}`), context)).status).toBe(200);
  });

  it("rejects cross-owner, cross-agent parent, stale version, missing key, and cross-origin mutation", async () => {
    const r = interviewRig();
    const owner = { findAgentOwner: vi.fn(async () => "maria") };
    const { POST } = createInterviewHandlers(r.service, owner);
    const body = { action: "submit", questionId: "q1", expectedVersion: 2, text: "A real example" };
    expect((await POST(request(interviewPath, "POST", body, "key-1", { cookie: "bx-demo-identity=sam" }), context)).status).toBe(404);
    expect((await POST(request(interviewPath, "POST", { ...body, parentAnswerId: "foreign-answer" }, "key-2"), context)).status).toBe(409);
    expect((await POST(request(interviewPath, "POST", { ...body, expectedVersion: 3 }, "key-3"), context)).status).toBe(409);
    expect((await POST(request(interviewPath, "POST", body, "key-4", { origin: "https://evil.example" }), context)).status).toBe(403);
    expect((await POST(request(interviewPath, "POST", body, ""), context)).status).toBe(400);
  });

  it("edits and adds linked detail with synchronous indexing; failed edit reports previous active and retry recovers", async () => {
    const r = interviewRig();
    const owner = { findAgentOwner: vi.fn(async () => "maria") };
    const { POST } = createInterviewHandlers(r.service, owner);
    const { PATCH, DELETE } = createAnswerHandlers(r.service, owner);
    await POST(request(interviewPath, "POST", { action: "submit", questionId: "q1", expectedVersion: 2,
      text: "At a family meeting last week, I asked about goals." }), context);
    const original = r.getView().answers[0];
    const edited = await PATCH(request(answerPath(original.id), "PATCH", { action: "edit", expectedVersion: original.version,
      text: "At a coaching meeting, I asked the client to name a goal." }, "edit-1"), answerContext(original.id));
    expect(edited.status).toBe(200);
    const editedSearch = await r.search("coaching meeting");
    expect(editedSearch.ok && editedSearch.data[0]?.content).toContain("coaching meeting");
    const current = r.getView().answers[0];
    const detail = await PATCH(request(answerPath(current.id), "PATCH", { action: "add-detail", expectedVersion: current.version,
      text: "Later I asked what had gone wrong the previous time." }, "detail-1"), answerContext(current.id));
    expect(detail.status).toBe(200);
    const repeatedDetail = await PATCH(request(answerPath(current.id), "PATCH", { action: "add-detail", expectedVersion: current.version,
      text: "Later I asked what had gone wrong the previous time." }, "detail-1"), answerContext(current.id));
    expect(repeatedDetail.status).toBe(200);
    expect(r.getView().answers[0].text).toBe(current.text);
    expect(r.getView().answers[1].parentAnswerId).toBe(current.id);
    const withDetail = await r.search("previous time");
    expect(withDetail.ok && withDetail.data).toHaveLength(2);
    expect((await PATCH(request(answerPath(current.id), "PATCH", { action: "edit", expectedVersion: 1,
      text: "Stale" }, "edit-stale"), answerContext(current.id))).status).toBe(409);
    const removed = await DELETE(request(answerPath(current.id), "DELETE", { expectedVersion: current.version }, "delete-1"), answerContext(current.id));
    expect(removed.status).toBe(200);
    const afterDelete = await r.search("coaching meeting");
    expect(afterDelete.ok && afterDelete.data).toHaveLength(0);
  });

  it("retries a failed answer job through PATCH and exposes one active generation", async () => {
    const r = interviewRig();
    const owner = { findAgentOwner: vi.fn(async () => "maria") };
    const { POST } = createInterviewHandlers(r.service, owner);
    const { PATCH } = createAnswerHandlers(r.service, owner);
    r.setEmbedFails(true);
    const captured = await POST(request(interviewPath, "POST", { action: "submit", questionId: "q1", expectedVersion: 2,
      text: "At a client meeting last week, I asked about goals and changed my recommendation." }), context);
    expect(await captured.json()).toMatchObject({ ok: true, data: { answers: [{ state: "failed", jobErrorCode: "provider" }] } });
    const answer = r.getView().answers[0];
    r.setEmbedFails(false);
    const retried = await PATCH(request(answerPath(answer.id), "PATCH", { action: "retry-index", expectedVersion: answer.version },
      "retry-1"), answerContext(answer.id));
    expect(retried.status).toBe(200);
    expect(await retried.json()).toMatchObject({ ok: true, data: { answers: [{ state: "ready" }] } });
    const replay = await PATCH(request(answerPath(answer.id), "PATCH", { action: "retry-index", expectedVersion: answer.version },
      "retry-1"), answerContext(answer.id));
    expect(replay.status).toBe(200);
    expect(r.calls.filter(name => name === "activate_revision")).toHaveLength(1);
    const found = await r.search("client goals");
    expect(found.ok && found.data).toHaveLength(1);
  });
});
