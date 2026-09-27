import { describe, expect, it } from "vitest";
import { answerModelOutputSchema, evidenceCitationSchema, interviewModelOutputSchema, interviewRequestSchema, moneyAmountSchema, personaRequestSchema, sandboxRequestSchema } from "./schemas";
import { CHUNKS, MESSAGES, SOURCES } from "@/lib/data/seed";

describe("untrusted phase 2 boundaries", () => {
  it("rejects client authority and financial fields rather than stripping them", () => {
    const body = { action: "submit", questionId: "question:1", text: "My answer", expectedVersion: 0 };
    expect(interviewRequestSchema.safeParse(body).success).toBe(true);
    for (const key of ["ownerId", "identityId", "model", "cost", "balanceUnits", "priceVersion"]) {
      expect(interviewRequestSchema.safeParse({ ...body, [key]: "attacker" }).success).toBe(false);
      expect(sandboxRequestSchema.safeParse({ text: "Question", [key]: "attacker" }).success).toBe(false);
    }
  });
  it("requires a matching version for every edited persona field", () => {
    expect(personaRequestSchema.safeParse({ action: "save-fields", patch: { name: "Changed" }, expectedVersions: {} }).success).toBe(false);
    expect(personaRequestSchema.safeParse({ action: "save-fields", patch: { name: "Changed" }, expectedVersions: { name: 2 } }).success).toBe(true);
  });
  it("rejects fabricated model provenance and pricing", () => {
    expect(answerModelOutputSchema.safeParse({ text: "Answer", evidenceIds: ["evidence:1"], citations: [{ url: "https://invented.example" }] }).success).toBe(false);
    const model = { question: "What happened?", topicState: { topic: "example", depth: "example" }, personaPatches: [], readiness: { concreteExampleRevisionIds: [], principleRevisionIds: [], exceptionRevisionIds: [] } };
    expect(interviewModelOutputSchema.safeParse(model).success).toBe(true);
    expect(interviewModelOutputSchema.safeParse({ ...model, model: "unapproved" }).success).toBe(false);
    expect(interviewModelOutputSchema.safeParse({ ...model, personaPatches: [{ field: "name", value: "Invented", evidenceRevisionIds: [] }] }).success).toBe(false);
  });
  it("keeps decimal money exact and within signed SQL bigint storage", () => {
    expect(moneyAmountSchema.parse("9007199254740993")).toBe("9007199254740993");
    for (const value of [1, "01", "-1", "1.5", "1e9", "9223372036854775808"]) expect(moneyAmountSchema.safeParse(value).success).toBe(false);
  });
  it("rejects active URL schemes and crossed evidence namespaces", () => {
    const web = { sourceType: "web", evidenceId: "web:1", ordinal: 1, excerpt: "Public excerpt", sourceName: "Source", title: "Title", retrievedAt: "2026-09-27T01:00:00Z" };
    expect(evidenceCitationSchema.safeParse({ ...web, url: "https://example.com" }).success).toBe(true);
    for (const url of ["javascript:alert(1)", "data:text/html,test", "https://secret@example.com"]) expect(evidenceCitationSchema.safeParse({ ...web, url }).success).toBe(false);
    expect(evidenceCitationSchema.safeParse({ ...web, url: "https://example.com", revisionId: "private:1" }).success).toBe(false);
  });
  it("marks fixture knowledge and display history explicitly", () => {
    expect([...CHUNKS, ...SOURCES, ...MESSAGES].every((record) => record.origin === "fixture")).toBe(true);
  });
});
