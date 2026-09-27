import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ServiceDb } from "./db";
import { conversationControlsSchema, updateConversationControls } from "./trust-controls";
import { PATCH } from "@/app/api/conversations/[conversationId]/controls/route";

const request = (identity = "sam") => new Request("https://example.test/api/conversations/c-1/controls", {
  method: "PATCH", headers: { cookie: `bx-demo-identity=${identity}` },
});
function database(mode = "chat") {
  const conversations = [{ id: "c-1", agent_id: "a-1", hirer_id: "sam", mode, share_transcript: false }];
  const messages = [
    { id: "answer-1", conversation_id: "c-1", role: "assistant", feedback: null },
    { id: "user-1", conversation_id: "c-1", role: "user", feedback: null },
    { id: "answer-other", conversation_id: "c-other", role: "assistant", feedback: null },
  ];
  let writes = 0;
  const db = { from(table: string) {
    const rows = table === "conversations" ? conversations : messages;
    const filters: [string, unknown][] = [];
    let patch: Record<string, unknown> | undefined;
    const query = {
      select() { return query; },
      eq(key: string, value: unknown) { filters.push([key, value]); return query; },
      update(value: Record<string, unknown>) { patch = value; return query; },
      async maybeSingle() {
        const row = rows.find(item => filters.every(([key, value]) => (item as Record<string, unknown>)[key] === value));
        if (row && patch) { Object.assign(row, patch); writes++; }
        return { data: row ?? null, error: null };
      },
    };
    return query;
  } } as unknown as ServiceDb;
  return { db, conversations, messages, writes: () => writes };
}

describe("server-backed hirer trust controls", () => {
  it("shares then revokes only the requesting hirer's chat", async () => {
    const fake = database();
    expect(await updateConversationControls(request(), "c-1", { action: "share", shareTranscript: true }, fake.db))
      .toEqual({ shareTranscript: true });
    expect(fake.conversations[0].share_transcript).toBe(true);
    await updateConversationControls(request(), "c-1", { action: "share", shareTranscript: false }, fake.db);
    expect(fake.conversations[0].share_transcript).toBe(false);
  });
  it("rejects another identity without changing any record", async () => {
    const fake = database();
    await expect(updateConversationControls(request("maria"), "c-1", { action: "share", shareTranscript: true }, fake.db))
      .rejects.toMatchObject({ code: "not_owner", status: 404 });
    expect(fake.writes()).toBe(0);
  });
  it("rejects sandbox conversations", async () => {
    const fake = database("sandbox");
    await expect(updateConversationControls(request(), "c-1", { action: "share", shareTranscript: true }, fake.db))
      .rejects.toMatchObject({ code: "not_owner" });
    expect(fake.writes()).toBe(0);
  });
  it("sets and clears assistant feedback", async () => {
    const fake = database();
    await updateConversationControls(request(), "c-1", { action: "feedback", messageId: "answer-1", feedback: "down" }, fake.db);
    expect(fake.messages[0].feedback).toBe("down");
    await updateConversationControls(request(), "c-1", { action: "feedback", messageId: "answer-1", feedback: null }, fake.db);
    expect(fake.messages[0].feedback).toBeNull();
  });
  it.each(["user-1", "answer-other", "missing"])("rejects feedback on %s", async messageId => {
    const fake = database();
    await expect(updateConversationControls(request(), "c-1", { action: "feedback", messageId, feedback: "up" }, fake.db))
      .rejects.toMatchObject({ code: "not_owner", status: 404 });
    expect(fake.writes()).toBe(0);
  });
  it("rejects invalid feedback and unknown input keys", () => {
    expect(conversationControlsSchema.safeParse({ action: "feedback", messageId: "answer-1", feedback: "excellent" }).success).toBe(false);
    expect(conversationControlsSchema.safeParse({ action: "share", shareTranscript: true, hirerId: "sam" }).success).toBe(false);
  });
  it("rejects cross-origin requests before reaching SQL", async () => {
    const response = await PATCH(new Request("https://example.test/api/conversations/c-1/controls", {
      method: "PATCH", headers: { origin: "https://other.test", "content-type": "application/json" },
      body: JSON.stringify({ action: "share", shareTranscript: true }),
    }), { params: Promise.resolve({ conversationId: "c-1" }) });
    expect(response.status).toBe(403);
  });
});
