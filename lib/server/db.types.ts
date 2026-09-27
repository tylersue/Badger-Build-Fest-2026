/** Phase 2 schema surface. Regenerate from the applied migrations at the live gate. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type Mutable = { version: number; created_at: string; updated_at: string };
type Origin = { origin: "fixture" | "live" };
type Id = { id: string };
type Scoped = Id & { agent_id: string };
type Money = number; // PostgREST returns PostgreSQL BIGINT as JSON numbers; convert to bigint before arithmetic.

export type Database = {
  public: {
    Tables: {
      identities: Table<Id & Mutable & Origin & { kind: "expert" | "hirer"; display_name: string; avatar_initial: string; avatar_color: string; is_switchable: boolean }>;
      profiles: Table<Mutable & Origin & { identity_id: string; display_name: string; photo_url: string | null; field: string; credentials: string; years_experience: number | null; contact_url: string; bio: string; location: string }>;
      agents: Table<Id & Mutable & Origin & { owner_id: string; slug: string; icon: string; category: string; status: string; rate_multiplier: number; consent_accepted_at: string | null; prompt_mode: "generated" | "custom"; custom_prompt: string | null; prompt_version: number; rating_avg: number; rating_count: number; usage_count: number; deleted_at: string | null }>;
      persona_fields: Table<Mutable & { agent_id: string; field: string; value: Json; origin: "blank" | "interview" | "expert"; evidence_revision_ids: string[]; pending_suggestion: Json | null }>;
      interview_sessions: Table<Scoped & Mutable & { state: string; topic_state: Json; readiness_evidence: Json; ready_dismissed: boolean }>;
      questions: Table<Scoped & Mutable & Origin & { session_id: string; position: number; text: string; skipped_at: string | null }>;
      answers: Table<Scoped & Mutable & Origin & { question_id: string; parent_answer_id: string | null; current_revision_id: string | null; indexed_revision_id: string | null; state: string; deleted_at: string | null }>;
      answer_revisions: Table<Scoped & { answer_id: string; question_id: string; question: string; text: string; revision_number: number; deleted_at: string | null; created_at: string }>;
      sources: Table<Scoped & Mutable & Origin & { kind: string; name: string; state: string; current_revision_id: string | null; active_revision_id: string | null; content_hash: string; storage_path: string | null; byte_count: Money; page_count: number | null; chunk_count: number; deleted_at: string | null; error: Json | null }>;
      source_revisions: Table<Scoped & { source_id: string; revision_number: number; content_hash: string; storage_path: string | null; byte_count: Money; page_count: number | null; deleted_at: string | null; created_at: string }>;
      chunks: Table<Scoped & { revision_id: string; source_id: string | null; answer_id: string | null; ordinal: number; content: string; question: string | null; page: number | null; heading_path: string | null; embedding: string; created_at: string }>;
      index_jobs: Table<Scoped & Mutable & { answer_id: string | null; source_id: string | null; revision_id: string; state: string; lease_owner: string | null; lease_expires_at: string | null; completed_batches: number; total_batches: number; indexed_chunks: number; error: Json | null }>;
      quota_holds: Table<Scoped & Mutable & { source_id: string | null; request_key: string; state: string; bytes: Money; chunks: number; expires_at: string }>;
      intake_estimates: Table<Scoped & { token_hash: string; name: string; kind: string; content_hash: string; byte_count: Money; estimate_units: Money; max_units: Money; price_version: string; estimate_version: number; expires_at: string; consumed_at: string | null; created_at: string }>;
      conversations: Table<Scoped & Mutable & Origin & { hirer_id: string; mode: string; title: string; share_transcript: boolean }>;
      messages: Table<Scoped & Mutable & Origin & { conversation_id: string; operation_id: string | null; role: string; content: string; citations: Json; retrieved: Json; tool_steps: Json; feedback: string | null; charged_units: Money | null }>;
      message_events: Table<Scoped & { message_id: string | null; operation_id: string; sequence: number; type: string; payload: Json; created_at: string }>;
      wallets: Table<Mutable & { identity_id: string; balance_units: Money; held_units: Money }>;
      ledger: Table<Id & Origin & { identity_id: string | null; operation_id: string | null; attempt_id: string | null; request_key: string; kind: string; amount_units: Money; balance_after_units: Money | null; purpose: string | null; ref_type: string | null; ref_id: string | null; note: string; created_at: string }>;
      operations: Table<Id & Mutable & { identity_id: string; agent_id: string; route: string; request_key: string; payload_hash: string; purpose: string; state: string; estimate_units: Money; held_units: Money; actual_units: Money | null; max_units: Money; price_version: string; reservation_day: string }>;
      provider_attempts: Table<Id & Mutable & { operation_id: string; stage_key: string; attempt: number; provider: string; model: string; state: string; provider_request_id: string | null; dispatch_day: string | null; input_tokens: number | null; output_tokens: number | null; cache_read_tokens: number | null; cache_write_tokens: number | null; embedding_tokens: number | null; successful_search_count: number | null; gross_cost_units: Money | null; effective_cost_units: Money | null; held_units: Money; latency_ms: number | null; request_metadata: Json }>;
      daily_budgets: Table<Mutable & { day: string; cap_units: Money; spent_units: Money; held_units: Money }>;
      seed_imports: Table<Id & { identity_id: string; import_key: string; payload_hash: string; result: Json; created_at: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      persona_cas_field: {
        Args: { p_agent_id: string; p_field: string; p_expected_version: number; p_value: Json;
          p_origin: "blank" | "interview" | "expert"; p_evidence_revision_ids: string[];
          p_pending_suggestion: Json | null };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
