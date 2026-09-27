import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requireHirerConversation, type ConversationLookup } from "./conversations";

const request = (identity: string) => new Request("http://localhost/api/conversations/conv_1/messages", {
  headers: { cookie: `bx-demo-identity=${identity}` },
});
const lookup: ConversationLookup = async id => id === "conv_1"
  ? { agent_id: "agent_1", hirer_id: "sam", mode: "chat" } : null;

describe("private conversation access", () => {
  it("allows the hirer to continue an existing chat regardless of publish state", async () => {
    expect(await requireHirerConversation(request("sam"), "conv_1", lookup))
      .toEqual({ actorId: "sam", agentId: "agent_1" });
  });

  it("rejects the expert, a missing conversation, and a sandbox", async () => {
    await expect(requireHirerConversation(request("maria"), "conv_1", lookup)).rejects.toMatchObject({ code: "not_owner" });
    await expect(requireHirerConversation(request("sam"), "missing", lookup)).rejects.toMatchObject({ code: "not_owner" });
    await expect(requireHirerConversation(request("sam"), "conv_1", async () => ({
      agent_id: "agent_1", hirer_id: "sam", mode: "sandbox",
    }))).rejects.toMatchObject({ code: "not_owner" });
  });
});
