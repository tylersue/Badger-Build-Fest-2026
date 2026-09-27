import "server-only";
import { z } from "zod";
import { modelForCategory } from "@/lib/config/models";
import { personaFormSchema, personaPatchSchema } from "@/lib/contracts/schemas";
import type { PersonaFieldName, PersonaFieldState, PersonaPatch, PersonaState, PersonaVersions, ServiceError } from "@/lib/contracts/phase2";
import type { PersonaForm } from "@/lib/types";
import { DatabaseFailure, requireServiceDb } from "@/lib/server/db";
import { EMPTY_PERSONA, personaToSystemPrompt } from "./prompt-template";

const FIELDS = Object.keys(EMPTY_PERSONA) as PersonaFieldName[];
const listFields = new Set<PersonaFieldName>(["always", "never", "exampleQuestions"]);
const validField = (field: string): field is PersonaFieldName => FIELDS.includes(field as PersonaFieldName);
const emptyValue = (field: PersonaFieldName): string | string[] => listFields.has(field) ? [] : "";
const isEmpty = (value: string | string[]) => Array.isArray(value) ? value.length === 0 : value.trim() === "";
type Field = PersonaFieldState;
type AgentRow = { category: PersonaForm["category"]; version: number; promptMode: PersonaState["promptMode"]; customPrompt: string | null; promptVersion: number };
export type PersonaSnapshot = { agent: AgentRow; fields: Partial<Record<PersonaFieldName, Field>> };
type FieldWrite = Pick<Field, "value" | "origin" | "evidenceRevisionIds" | "pendingSuggestion">;
export interface PersonaStore {
  load(agentId: string): Promise<PersonaSnapshot | null>;
  casField(agentId: string, field: PersonaFieldName, expectedVersion: number, next: FieldWrite): Promise<boolean>;
  casPrompt(agentId: string, expectedVersion: number, mode: PersonaState["promptMode"], text: string | null): Promise<boolean>;
  activeRevisionIds(agentId: string, ids: string[]): Promise<Set<string>>;
  setCategory(agentId: string, category: PersonaForm["category"]): Promise<void>;
}
export type PersonaFailure = { ok: false; error: ServiceError & {
  conflictFieldIds?: PersonaFieldName[]; current?: PersonaState; submittedPatch?: Partial<PersonaForm>;
} };
export type PersonaResult = { ok: true; data: PersonaState } | PersonaFailure;
const invalid = (message: string): PersonaFailure => ({ ok: false, error: { code: "invalid_input", message, retryable: false } });
const conflict = (ids: PersonaFieldName[], current: PersonaState, submittedPatch?: Partial<PersonaForm>): PersonaFailure => ({
  ok: false, error: { code: "conflict", message: "Persona changed since it was opened.", retryable: true,
    conflictFieldIds: ids, current, submittedPatch },
});
function checked<T>(result: { data: T; error: { code?: string } | null }): T {
  if (result.error) throw new DatabaseFailure("Persona database request failed.", result.error.code !== "PGRST301");
  return result.data;
}
export function createSqlPersonaStore(): PersonaStore {
  const db = () => requireServiceDb();
  return {
    async load(agentId) {
      const agent = checked(await db().from("agents").select("category,version,prompt_mode,custom_prompt,prompt_version").eq("id", agentId).is("deleted_at", null).maybeSingle());
      if (!agent) return null;
      const rows = checked(await db().from("persona_fields").select("field,value,origin,version,evidence_revision_ids,pending_suggestion").eq("agent_id", agentId));
      const fields: PersonaSnapshot["fields"] = {};
      for (const row of rows ?? []) {
        if (!validField(row.field)) continue;
        const parsed = personaFormSchema.shape[row.field].safeParse(row.value);
        if (!parsed.success) throw new DatabaseFailure("Stored persona field is invalid.", false);
        const pending = row.pending_suggestion === null ? null : z.object({
          value: personaFormSchema.shape[row.field], evidenceRevisionIds: z.array(z.string()), observedVersion: z.number().int().nonnegative(),
        }).safeParse(row.pending_suggestion);
        if (pending && !pending.success) throw new DatabaseFailure("Stored persona suggestion is invalid.", false);
        fields[row.field] = { value: parsed.data, origin: row.origin, version: row.version,
          evidenceRevisionIds: row.evidence_revision_ids, pendingSuggestion: pending?.data ?? null };
      }
      return { agent: { category: agent.category as PersonaForm["category"], version: agent.version,
        promptMode: agent.prompt_mode, customPrompt: agent.custom_prompt, promptVersion: agent.prompt_version }, fields };
    },
    async casField(agentId, field, expectedVersion, next) {
      if (expectedVersion === 0) {
        const row = checked(await db().from("persona_fields").upsert({ agent_id: agentId, field, value: next.value,
          origin: next.origin, evidence_revision_ids: next.evidenceRevisionIds,
          pending_suggestion: next.pendingSuggestion, version: 1 }, { onConflict: "agent_id,field", ignoreDuplicates: true }).select("field").maybeSingle());
        return row !== null;
      }
      const row = checked(await db().from("persona_fields").update({ value: next.value, origin: next.origin,
        evidence_revision_ids: next.evidenceRevisionIds, pending_suggestion: next.pendingSuggestion })
        .eq("agent_id", agentId).eq("field", field).eq("version", expectedVersion).select("field").maybeSingle());
      return row !== null;
    },
    async casPrompt(agentId, expectedVersion, mode, text) {
      const row = checked(await db().from("agents").update({ prompt_mode: mode, custom_prompt: text,
        prompt_version: expectedVersion + 1 }).eq("id", agentId).eq("prompt_version", expectedVersion)
        .is("deleted_at", null).select("id").maybeSingle());
      return row !== null;
    },
    async activeRevisionIds(agentId, ids) {
      if (!ids.length) return new Set();
      const rows = checked(await db().from("answers").select("current_revision_id").eq("agent_id", agentId)
        .is("deleted_at", null).in("current_revision_id", ids));
      return new Set((rows ?? []).map((row) => row.current_revision_id).filter((id): id is string => !!id));
    },
    async setCategory(agentId, category) {
      checked(await db().from("agents").update({ category }).eq("id", agentId).is("deleted_at", null));
    },
  };
}

export function createPersonaService(store: PersonaStore) {
  async function read(agentId: string): Promise<PersonaState | null> {
    const snapshot = await store.load(agentId);
    if (!snapshot) return null;
    const fields = {} as PersonaState["fields"];
    for (const name of FIELDS) {
      const stored = snapshot.fields[name];
      fields[name] = (stored ?? { value: name === "category" ? snapshot.agent.category : emptyValue(name),
        origin: "blank", version: 0, evidenceRevisionIds: [], pendingSuggestion: null }) as never;
    }
    return { fields, version: snapshot.agent.version, promptMode: snapshot.agent.promptMode,
      customPrompt: snapshot.agent.customPrompt, promptVersion: snapshot.agent.promptVersion };
  }
  async function required(agentId: string): Promise<PersonaState> {
    const state = await read(agentId);
    if (!state) throw new DatabaseFailure("Agent is unavailable.", false);
    return state;
  }
  async function writeField(agentId: string, name: PersonaFieldName, expected: number, next: FieldWrite): Promise<boolean> {
    const wrote = await store.casField(agentId, name, expected, next);
    if (wrote && name === "category") await store.setCategory(agentId, next.value as PersonaForm["category"]);
    return wrote;
  }
  async function evidenceValid(agentId: string, ids: string[]): Promise<boolean> {
    if (!ids.length || ids.length > 50 || new Set(ids).size !== ids.length) return false;
    const active = await store.activeRevisionIds(agentId, ids);
    return ids.every((id) => active.has(id));
  }
  async function applyPersonaSuggestions(agentId: string, patches: PersonaPatch[], observedVersions: PersonaVersions): Promise<PersonaResult> {
    if (patches.length > FIELDS.length) return invalid("Too many persona suggestions.");
    await required(agentId);
    const conflicts: PersonaFieldName[] = [];
    const seen = new Set<PersonaFieldName>();
    for (const raw of patches) {
      const parsed = personaPatchSchema.safeParse(raw);
      if (!parsed.success || seen.has(raw.field) || observedVersions[raw.field] === undefined || isEmpty(raw.value))
        return invalid("Invalid persona suggestion.");
      seen.add(raw.field);
      if (!(await evidenceValid(agentId, raw.evidenceRevisionIds))) return invalid("Suggestion evidence is not active for this agent.");
      const current = (await required(agentId)).fields[raw.field] as Field;
      const observed = observedVersions[raw.field]!;
      if (current.pendingSuggestion && current.pendingSuggestion.observedVersion > observed) { conflicts.push(raw.field); continue; }
      const suggestion = { value: raw.value, evidenceRevisionIds: raw.evidenceRevisionIds, observedVersion: observed };
      const apply = current.version === observed && current.origin !== "expert";
      const wrote = await writeField(agentId, raw.field, current.version, apply ? {
        value: raw.value, origin: "interview", evidenceRevisionIds: raw.evidenceRevisionIds, pendingSuggestion: null,
      } : { value: current.value, origin: current.origin, evidenceRevisionIds: current.evidenceRevisionIds,
        pendingSuggestion: suggestion });
      if (!wrote) conflicts.push(raw.field);
    }
    const state = await required(agentId);
    return conflicts.length ? conflict(conflicts, state) : { ok: true, data: state };
  }
  async function savePersonaFields(agentId: string, patch: Partial<PersonaForm>, expectedVersions: PersonaVersions): Promise<PersonaResult> {
    const parsed = personaFormSchema.partial().safeParse(patch);
    if (!parsed.success || !Object.keys(patch).length) return invalid("Invalid persona fields.");
    const state = await required(agentId);
    const changed = Object.keys(patch) as PersonaFieldName[];
    if (changed.some((name) => expectedVersions[name] === undefined)) return invalid("Field version is required.");
    const conflicts = changed.filter((name) => state.fields[name].version !== expectedVersions[name]);
    if (conflicts.length) return conflict(conflicts, state, patch);
    for (const name of changed) {
      const current = (await required(agentId)).fields[name] as Field;
      if (current.version !== expectedVersions[name]) { conflicts.push(name); continue; }
      const value = patch[name] as string | string[];
      const wrote = await writeField(agentId, name, current.version, { value,
        origin: "expert", evidenceRevisionIds: current.evidenceRevisionIds, pendingSuggestion: current.pendingSuggestion });
      if (!wrote) conflicts.push(name);
    }
    const latest = await required(agentId);
    return conflicts.length ? conflict(conflicts, latest, patch) : { ok: true, data: latest };
  }
  async function acceptSuggestion(agentId: string, field: PersonaFieldName, expectedVersion: number): Promise<PersonaResult> {
    const state = await required(agentId);
    const current = state.fields[field] as Field;
    if (current.version !== expectedVersion) return conflict([field], state);
    const suggestion = current.pendingSuggestion;
    if (!suggestion || !(await evidenceValid(agentId, suggestion.evidenceRevisionIds))) return invalid("Suggestion is no longer available.");
    const wrote = await writeField(agentId, field, expectedVersion, { value: suggestion.value,
      origin: "interview", evidenceRevisionIds: suggestion.evidenceRevisionIds, pendingSuggestion: null });
    const latest = await required(agentId);
    return wrote ? { ok: true, data: latest } : conflict([field], latest);
  }
  async function keepSuggestion(agentId: string, field: PersonaFieldName, expectedVersion: number): Promise<PersonaResult> {
    const state = await required(agentId);
    const current = state.fields[field] as Field;
    if (current.version !== expectedVersion) return conflict([field], state);
    if (!current.pendingSuggestion) return invalid("Suggestion is no longer available.");
    const wrote = await writeField(agentId, field, expectedVersion, { value: current.value, origin: current.origin,
      evidenceRevisionIds: current.evidenceRevisionIds, pendingSuggestion: null });
    const latest = await required(agentId);
    return wrote ? { ok: true, data: latest } : conflict([field], latest);
  }
  async function setCustomPrompt(agentId: string, text: string, expectedVersion: number): Promise<PersonaResult> {
    if (text.length > 30_000) return invalid("Custom prompt is too long.");
    const state = await required(agentId);
    if (state.promptVersion !== expectedVersion) return conflict([], state);
    const wrote = await store.casPrompt(agentId, expectedVersion, "custom", text);
    const latest = await required(agentId);
    return wrote ? { ok: true, data: latest } : conflict([], latest);
  }
  async function regeneratePrompt(agentId: string, expectedVersion: number, confirmed: boolean): Promise<PersonaResult> {
    if (!confirmed) return invalid("Regeneration requires confirmation.");
    const state = await required(agentId);
    if (state.promptVersion !== expectedVersion) return conflict([], state);
    const wrote = await store.casPrompt(agentId, expectedVersion, "generated", null);
    const latest = await required(agentId);
    return wrote ? { ok: true, data: latest } : conflict([], latest);
  }
  async function reconcilePersonaEvidence(agentId: string): Promise<PersonaResult> {
    const state = await required(agentId);
    const allIds = [...new Set(FIELDS.flatMap((name) => [
      ...state.fields[name].evidenceRevisionIds,
      ...(state.fields[name].pendingSuggestion?.evidenceRevisionIds ?? []),
    ]))];
    const active = await store.activeRevisionIds(agentId, allIds);
    const conflicts: PersonaFieldName[] = [];
    for (const name of FIELDS) {
      const current = state.fields[name] as Field;
      const supported = current.evidenceRevisionIds.every((id) => active.has(id));
      const pending = current.pendingSuggestion;
      const pendingSupported = !pending || pending.evidenceRevisionIds.every((id) => active.has(id));
      if (supported && pendingSupported) continue;
      const next: FieldWrite = current.origin === "interview" && !supported
        ? { value: name === "category" ? EMPTY_PERSONA.category : emptyValue(name), origin: "blank",
            evidenceRevisionIds: [], pendingSuggestion: pendingSupported ? pending : null }
        : { value: current.value, origin: current.origin, evidenceRevisionIds: current.evidenceRevisionIds,
            pendingSuggestion: pendingSupported ? pending : null };
      if (!(await writeField(agentId, name, current.version, next))) conflicts.push(name);
    }
    const latest = await required(agentId);
    return conflicts.length ? conflict(conflicts, latest) : { ok: true, data: latest };
  }
  async function reviewFieldIds(agentId: string, state: PersonaState): Promise<PersonaFieldName[]> {
    const ids = [...new Set(FIELDS.flatMap((name) => state.fields[name].evidenceRevisionIds))];
    const active = await store.activeRevisionIds(agentId, ids);
    return FIELDS.filter((name) => state.fields[name].origin === "expert" &&
      state.fields[name].evidenceRevisionIds.some((id) => !active.has(id)));
  }
  return { read, applyPersonaSuggestions, savePersonaFields, acceptSuggestion, keepSuggestion,
    setCustomPrompt, regeneratePrompt, reconcilePersonaEvidence, reviewFieldIds };
}

export const personaService = createPersonaService(createSqlPersonaStore());
export function personaView(state: PersonaState, reviewFieldIds: PersonaFieldName[] = []) {
  const form = Object.fromEntries(FIELDS.map((name) => [name, state.fields[name].value])) as PersonaForm;
  const generatedPrompt = personaToSystemPrompt(form);
  return { state, form, generatedPrompt, activePrompt: state.promptMode === "custom" ? state.customPrompt ?? "" : generatedPrompt,
    model: modelForCategory(form.category), reviewFieldIds };
}

/** Frozen service signatures used by the interview lane. */
export const applyPersonaSuggestions = personaService.applyPersonaSuggestions;
export const savePersonaFields = personaService.savePersonaFields;
export const setCustomPrompt = personaService.setCustomPrompt;
export const regeneratePrompt = personaService.regeneratePrompt;
export const reconcilePersonaEvidence = personaService.reconcilePersonaEvidence;
