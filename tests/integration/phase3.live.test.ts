import { describe, expect, it } from "vitest";
import { anonDb, createOwnedFixture, id, liveEnabled, liveLabel, payloadHash, priceVersion, required, rpc, serviceDb } from "./live-support";

const live = liveEnabled ? it : it.skip;
const cap = "1000000000000000";
const vector = `[${[1, ...Array(1023).fill(0)].join(",")}]`;

describe(`Phase 3 SQL integration (${liveLabel})`, () => {
  live("guards publish, rates, consent, new chats, and settles an exact 15% split", async () => {
    const db = serviceDb();
    const expert = await createOwnedFixture(db, "1000000000");
    const hirer = id("live_hirer");
    await required(db.from("identities").insert({ id: hirer, kind: "hirer", display_name: "Live hirer",
      avatar_initial: "H", avatar_color: "#123456" }));
    await required(db.from("wallets").insert({ identity_id: hirer, balance_units: "1000000000" as never }));
    const fields = { name: "Live expert", category: "career_admissions", headline: "Career advice",
      description: "Specific career advice", howIWork: "I cite evidence", always: [], never: [],
      exampleQuestions: ["What should I do?"], greeting: "Hello" };
    await required(db.from("persona_fields").insert(Object.entries(fields).map(([field, value]) => ({
      agent_id: expert.agent, field, value,
    }))));
    const publish = (acceptConsent: boolean) => rpc(db, "set_agent_published", { p_agent_id: expert.agent,
      p_owner_id: expert.identity, p_publish: true, p_accept_consent: acceptConsent });
    expect((await publish(true)).error?.message).toContain("PUBLISH_BLOCKED");
    const source = id("src"), revision = id("srev");
    await required(db.from("sources").insert({ id: source, agent_id: expert.agent, kind: "text",
      name: "Evidence", content_hash: "fixture", byte_count: 20 }));
    await required(db.from("source_revisions").insert({ id: revision, agent_id: expert.agent, source_id: source,
      revision_number: 1, content_hash: "fixture", byte_count: 20 }));
    await required(db.from("sources").update({ current_revision_id: revision, active_revision_id: revision,
      state: "ready", chunk_count: 5 }).eq("id", source));
    await required(db.from("chunks").insert(Array.from({ length: 5 }, (_, ordinal) => ({ id: id("chunk"),
      agent_id: expert.agent, source_id: source, revision_id: revision, ordinal,
      content: `Evidence ${ordinal}`, embedding: vector }))));
    expect((await publish(false)).error?.message).toContain("CONSENT_REQUIRED");
    expect((await rpc(db, "set_agent_rate", { p_agent_id: expert.agent, p_owner_id: hirer, p_rate: 2 })).error?.message)
      .toContain("NOT_OWNER");
    expect((await rpc(db, "set_agent_rate", { p_agent_id: expert.agent, p_owner_id: expert.identity, p_rate: 2.25 })).error?.message)
      .toContain("INVALID_INPUT");
    await required(rpc(db, "set_agent_rate", { p_agent_id: expert.agent, p_owner_id: expert.identity, p_rate: 2 }));
    await required(publish(true));
    const conversation = id("conv");
    await required(rpc(db, "create_hirer_conversation", { p_id: conversation, p_agent_id: expert.agent,
      p_hirer_id: hirer, p_title: "My question" }));
    await required(rpc(db, "set_agent_published", { p_agent_id: expert.agent,
      p_owner_id: expert.identity, p_publish: false, p_accept_consent: false }));
    expect((await rpc(db, "create_hirer_conversation", { p_id: id("conv"), p_agent_id: expert.agent,
      p_hirer_id: hirer, p_title: "Another" })).error?.message).toContain("NOT_PUBLISHED");
    expect((await required(db.from("conversations").select("id").eq("id", conversation).single())).data?.id)
      .toBe(conversation);

    const operationId = id("op"), attemptId = id("att");
    const reserve = await required(rpc(db, "reserve_operation", { p_id: operationId, p_identity_id: hirer,
      p_agent_id: expert.agent, p_route: "chat", p_request_key: id("request"), p_payload_hash: payloadHash,
      p_purpose: "chat", p_estimate_units: "1000000", p_max_units: "1000000",
      p_price_version: priceVersion, p_cap_units: cap }));
    expect((reserve.data as { held_units: string; chat_rate_multiplier: number }).held_units).toBe("2000000");
    expect(Number((reserve.data as { chat_rate_multiplier: number }).chat_rate_multiplier)).toBe(2);
    await required(rpc(db, "set_agent_rate", { p_agent_id: expert.agent, p_owner_id: expert.identity, p_rate: 3 }));
    await required(db.from("messages").insert({ id: id("msg"), agent_id: expert.agent,
      conversation_id: conversation, operation_id: operationId, role: "user", content: "My question" }));
    const attempt = (state: string) => ({ id: attemptId, operationId, stageKey: "answer", attempt: 1,
      provider: "anthropic", model: "claude-haiku-4-5", state, heldUnits: "2000000",
      providerRequestId: null, inputTokens: state === "completed" ? 1 : null,
      outputTokens: state === "completed" ? 1 : null, cacheReadTokens: state === "completed" ? 0 : null,
      cacheWriteTokens: state === "completed" ? 0 : null, embeddingTokens: state === "completed" ? 0 : null,
      successfulSearchCount: state === "completed" ? 0 : null, latencyMs: state === "completed" ? 1 : null,
      requestMetadata: { inputChars: 1, maxOutputTokens: 1 } });
    for (const state of ["prepared", "dispatched", "completed"])
      await required(rpc(db, "record_provider_attempt", { p_attempt: attempt(state), p_cap_units: cap }));
    const settled = await required(rpc(db, "settle_operation", { p_operation_id: operationId }));
    expect((settled.data as { actual_units: string }).actual_units).toBe("12000");
    expect((await required(rpc(db, "settle_operation", { p_operation_id: operationId }))).data).toEqual(settled.data);
    const split = await required(db.from("chat_settlements").select("*").eq("attempt_id", attemptId).single());
    expect([split.data?.raw_units, split.data?.hirer_debit_units, split.data?.platform_margin_units,
      split.data?.expert_credit_units].map(Number)).toEqual([6000, 12000, 900, 5100]);
    const ledger = await required(db.from("ledger").select("kind,amount_units,ref_type,ref_id").eq("operation_id", operationId));
    expect(ledger.data).toHaveLength(4);
    expect(ledger.data?.every(row => row.ref_type === "conversation" && row.ref_id === conversation)).toBe(true);
    expect(Object.fromEntries((ledger.data ?? []).map(row => [row.kind, Number(row.amount_units)])))
      .toEqual({ debit: -12000, earnings: 5100, platform_cost: 6000, platform_margin: 900 });
    const hirerWallet = await required(db.from("wallets").select("balance_units,held_units").eq("identity_id", hirer).single());
    const expertWallet = await required(db.from("wallets").select("balance_units").eq("identity_id", expert.identity).single());
    expect(Number(hirerWallet.data?.balance_units)).toBe(1000000000 - 12000);
    expect(Number(hirerWallet.data?.held_units)).toBe(0);
    expect(Number(expertWallet.data?.balance_units)).toBe(1000000000 + 5100);
    await required(rpc(db, "set_agent_rate", { p_agent_id: expert.agent, p_owner_id: expert.identity, p_rate: 2 }));

    const lowFunds = id("live_hirer");
    await required(db.from("identities").insert({ id: lowFunds, kind: "hirer", display_name: "Low funds",
      avatar_initial: "L", avatar_color: "#123456" }));
    await required(db.from("wallets").insert({ identity_id: lowFunds, balance_units: "1000000" as never }));
    expect((await rpc(db, "reserve_operation", { p_id: id("op"), p_identity_id: lowFunds,
      p_agent_id: expert.agent, p_route: "chat", p_request_key: id("request"), p_payload_hash: payloadHash,
      p_purpose: "chat", p_estimate_units: "1000000", p_max_units: "1000000",
      p_price_version: priceVersion, p_cap_units: cap })).error?.message).toContain("INSUFFICIENT_CREDITS");

    const unknownOperation = id("op"), unknownAttempt = id("att");
    await required(rpc(db, "reserve_operation", { p_id: unknownOperation, p_identity_id: hirer,
      p_agent_id: expert.agent, p_route: "chat", p_request_key: id("request"), p_payload_hash: payloadHash,
      p_purpose: "chat", p_estimate_units: "1000000", p_max_units: "1000000",
      p_price_version: priceVersion, p_cap_units: cap }));
    const pending = (state: string) => ({ ...attempt(state), id: unknownAttempt, operationId: unknownOperation,
      stageKey: "unknown-answer", inputTokens: null, outputTokens: null,
      cacheReadTokens: null, cacheWriteTokens: null, embeddingTokens: null, successfulSearchCount: null });
    for (const state of ["prepared", "dispatched", "unknown"])
      await required(rpc(db, "record_provider_attempt", { p_attempt: pending(state), p_cap_units: cap }));
    const unknown = await required(rpc(db, "settle_operation", { p_operation_id: unknownOperation }));
    expect((unknown.data as { state: string; held_units: string })).toMatchObject({ state: "unknown", held_units: "2000000" });
    const reconciled = await required(rpc(db, "reconcile_operation", { p_operation_id: unknownOperation,
      p_evidence: [{ attemptId: unknownAttempt, action: "record_usage", note: "Provider report verified",
        recordedBy: "live-test", usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0,
          cacheWriteTokens: 0, embeddingTokens: 0, successfulSearchCount: 0 } }] }));
    expect((reconciled.data as { state: string; actual_units: string; held_units: string }))
      .toMatchObject({ state: "settled", actual_units: "12000", held_units: "0" });
    expect((await anonDb().from("conversation_attachments").select("conversation_id").limit(1)).error).not.toBeNull();
  });
});
