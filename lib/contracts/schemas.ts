import { z } from "zod";
import type { EvidenceCitation, RetrievedChunk, ServiceError } from "./phase2";

export const idSchema = z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_-]+$/);
export const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const moneyAmountSchema = z.string().regex(/^(0|[1-9][0-9]*)$/).max(19).refine((v) => /^(0|[1-9][0-9]{0,18})$/.test(v) && BigInt(v) <= BigInt("9223372036854775807"), "Money exceeds SQL bigint");
export const categorySchema = z.enum(["health_pt", "tax_finance", "career_admissions"]);
export const requestKeySchema = z.string().min(1).max(200).regex(/^[\x21-\x7e]+$/);
export const answerTextSchema = z.string().trim().min(1).max(100_000);
export const safeUrlSchema = z.url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "A public HTTP(S) link without credentials is required");
const shortText = z.string().max(2000);
const listText = z.array(shortText).max(30);
export const personaFormSchema = z.strictObject({
  name: z.string().max(200), category: categorySchema, headline: shortText,
  description: z.string().max(10_000), howIWork: z.string().max(10_000), always: listText,
  never: listText, exampleQuestions: listText, greeting: shortText,
});
export const personaFieldSchema = personaFormSchema.keyof();
export const personaVersionsSchema = z.strictObject({
  name: versionSchema.optional(), category: versionSchema.optional(), headline: versionSchema.optional(),
  description: versionSchema.optional(), howIWork: versionSchema.optional(), always: versionSchema.optional(),
  never: versionSchema.optional(), exampleQuestions: versionSchema.optional(), greeting: versionSchema.optional(),
});
const evidenceIds = z.array(idSchema).min(1).max(50);
export const personaPatchSchema = z.discriminatedUnion("field", [
  z.strictObject({ field: z.literal("name"), value: personaFormSchema.shape.name, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("category"), value: categorySchema, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("headline"), value: shortText, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("description"), value: personaFormSchema.shape.description, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("howIWork"), value: personaFormSchema.shape.howIWork, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("always"), value: listText, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("never"), value: listText, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("exampleQuestions"), value: listText, evidenceRevisionIds: evidenceIds }),
  z.strictObject({ field: z.literal("greeting"), value: shortText, evidenceRevisionIds: evidenceIds }),
]);
export const interviewControlSchema = z.enum(["start", "pause", "resume", "skip", "continue", "dismiss-ready"]);
/** Identity, agent path, model, request key and all prices are resolved outside the body. */
export const interviewRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("control"), control: interviewControlSchema }),
  z.strictObject({ action: z.literal("submit"), questionId: idSchema, text: answerTextSchema, expectedVersion: versionSchema, parentAnswerId: idSchema.optional() }),
]);
export const answerRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("edit"), text: answerTextSchema, expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("add-detail"), text: answerTextSchema, expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("retry-index"), expectedVersion: versionSchema }),
]);
export const deleteRequestSchema = z.strictObject({ expectedVersion: versionSchema });
export const personaRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("save-fields"), patch: personaFormSchema.partial(), expectedVersions: personaVersionsSchema }).refine((v) => Object.keys(v.patch).length > 0 && Object.keys(v.patch).every((k) => k in v.expectedVersions), "Each changed field requires its observed version"),
  z.strictObject({ action: z.literal("accept-suggestion"), field: personaFieldSchema, expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("keep-suggestion"), field: personaFieldSchema, expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("custom-prompt"), text: z.string().max(30_000), expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("regenerate-prompt"), expectedVersion: versionSchema, confirmed: z.literal(true) }),
]);
const sourceBody = { name: z.string().trim().min(1).max(255), text: answerTextSchema };
export const sourceRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("preflight"), ...sourceBody }),
  z.strictObject({ action: z.literal("confirm"), ...sourceBody, estimateToken: idSchema }),
]);
export const sourceRetryRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("preflight"), expectedVersion: versionSchema }),
  z.strictObject({ action: z.literal("retry"), expectedVersion: versionSchema, estimateToken: idSchema }),
]);
export const sourceFileMetadataSchema = z.strictObject({ name: sourceBody.name, kind: z.enum(["pdf", "docx", "txt", "md"]), byteCount: z.number().int().positive().max(5 * 1024 * 1024) });
export const sandboxRequestSchema = z.strictObject({ text: z.string().trim().min(1).max(20_000), conversationId: idSchema.optional() });
export const identityRequestSchema = z.strictObject({ identityId: z.enum(["maria", "sam"]) });
export const createAgentRequestSchema = z.strictObject({ name: z.string().trim().min(1).max(200), category: categorySchema.optional() });
export const profileRequestSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(200), photoUrl: safeUrlSchema.optional(), field: shortText,
  credentials: shortText, yearsExperience: z.number().int().min(0).max(100).nullable(),
  contactUrl: z.union([z.literal(""), safeUrlSchema]), bio: z.string().max(10_000), location: shortText,
});
export const grantRequestSchema = z.strictObject({ kind: z.enum(["subscription", "pack"]) });
export const resetRequestSchema = z.strictObject({});
export const importRequestSchema = z.strictObject({
  version: z.literal(1), agents: z.array(z.strictObject({ legacyId: idSchema, persona: personaFormSchema, customPrompt: z.string().max(30_000).nullable() })).max(50),
});
export const interviewModelOutputSchema = z.strictObject({
  question: z.string().trim().min(1).max(2000), topicState: z.strictObject({ topic: shortText, depth: z.enum(["opening", "example", "reasoning", "exception", "complete"]) }),
  personaPatches: z.array(personaPatchSchema).max(9),
  readiness: z.strictObject({ concreteExampleRevisionIds: z.array(idSchema).max(50), principleRevisionIds: z.array(idSchema).max(50), exceptionRevisionIds: z.array(idSchema).max(50) }),
});
export const sufficiencyModelOutputSchema = z.strictObject({ sufficient: z.boolean(), evidenceIds: z.array(idSchema).max(12), missingQuestion: z.string().max(2000) });
/** Models may reference issued evidence IDs, never mint provenance, URLs or cost. */
export const answerModelOutputSchema = z.strictObject({ text: z.string().max(50_000), evidenceIds: z.array(idSchema).max(50) });
export const serviceErrorSchema: z.ZodType<ServiceError> = z.strictObject({
  code: z.enum(["invalid_input", "not_owner", "conflict", "insufficient_credits", "daily_cap", "configuration", "quota", "stale_estimate", "provider", "indexing", "unknown_usage"]),
  message: shortText, retryable: z.boolean(), operationId: idSchema.optional(), neededUnits: moneyAmountSchema.optional(), availableUnits: moneyAmountSchema.optional(), resetAt: z.iso.datetime().optional(),
});
export const retrievedChunkSchema: z.ZodType<RetrievedChunk> = z.strictObject({
  id: idSchema, agentId: idSchema, revisionId: idSchema, sourceId: idSchema,
  sourceType: z.enum(["interview", "document"]), sourceName: shortText, content: z.string().max(100_000),
  question: shortText.nullable(), page: z.number().int().positive().nullable(), headingPath: shortText.nullable(), score: z.number().min(-1).max(1),
});
const citationBase = { evidenceId: idSchema, ordinal: z.number().int().positive(), excerpt: z.string().max(10_000), sourceName: shortText };
export const evidenceCitationSchema: z.ZodType<EvidenceCitation> = z.discriminatedUnion("sourceType", [
  z.strictObject({ ...citationBase, sourceType: z.enum(["interview", "document"]), sourceId: idSchema, revisionId: idSchema, chunkId: idSchema, question: shortText.nullable(), page: z.number().int().positive().nullable(), headingPath: shortText.nullable(), historical: z.boolean() }),
  z.strictObject({ ...citationBase, sourceType: z.literal("web"), title: shortText, url: safeUrlSchema, retrievedAt: z.iso.datetime() }),
]);
export const embeddingVectorSchema = z.array(z.number().finite()).length(1024);
export type InterviewRequest = z.infer<typeof interviewRequestSchema>;
export type AnswerRequest = z.infer<typeof answerRequestSchema>;
export type PersonaRequest = z.infer<typeof personaRequestSchema>;
export type SourceRequest = z.infer<typeof sourceRequestSchema>;
export type SandboxRequest = z.infer<typeof sandboxRequestSchema>;
