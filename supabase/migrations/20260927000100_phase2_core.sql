-- Fresh Phase 2 schema. Text IDs preserve existing demo and sandbox:{agentId} IDs.
-- No auth/RLS: only the server service role may access these tables.
begin;
create extension if not exists vector with schema extensions;

create function public.touch_version() returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

create table public.identities (
  id text primary key, kind text not null check (kind in ('expert','hirer')),
  display_name text not null, avatar_initial text not null, avatar_color text not null,
  is_switchable boolean not null default false,
  origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not is_switchable or id in ('maria','sam'))
);
insert into public.identities (id,kind,display_name,avatar_initial,avatar_color,is_switchable,origin) values
  ('maria','expert','Maria Chen','M','#5a4636',true,'fixture'),
  ('sam','hirer','Sam Okafor','S','#2f5a4b',true,'fixture'),
  ('dev','expert','Dev Patel','D','#3b2560',false,'fixture'),
  ('priya','expert','Priya Nair','P','#084d31',false,'fixture'),
  ('luis','expert','Luis Ortega','L','#1566b8',false,'fixture'),
  ('hannah','expert','Hannah Kim','H','#6244a0',false,'fixture'),
  ('tom','expert','Tom Reyes','T','#079455',false,'fixture'),
  ('jordan','hirer','Jordan Lee','J','#5a3a36',false,'fixture'),
  ('alex','hirer','Alex Rivera','A','#36475a',false,'fixture');

create table public.profiles (
  identity_id text primary key references public.identities(id), display_name text not null,
  photo_url text, field text not null default '', credentials text not null default '',
  years_experience integer check (years_experience between 0 and 100),
  contact_url text not null default '', bio text not null default '', location text not null default '',
  origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.agents (
  id text primary key, owner_id text not null references public.identities(id), slug text not null unique,
  icon text not null default 'bot', category text not null default 'career_admissions'
    check (category in ('health_pt','tax_finance','career_admissions')),
  status text not null default 'draft' check (status in ('draft','published','unpublished')),
  rate_multiplier numeric(3,2) not null default 1 check (rate_multiplier between 1 and 5),
  consent_accepted_at timestamptz, prompt_mode text not null default 'generated' check (prompt_mode in ('generated','custom')),
  custom_prompt text, prompt_version integer not null default 1 check (prompt_version > 0),
  rating_avg numeric(3,2) not null default 0, rating_count integer not null default 0, usage_count integer not null default 0,
  deleted_at timestamptz, origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index agents_owner_idx on public.agents(owner_id);
create table public.persona_fields (
  agent_id text not null references public.agents(id),
  field text not null check (field in ('name','category','headline','description','howIWork','always','never','exampleQuestions','greeting')),
  value jsonb not null, origin text not null default 'blank' check (origin in ('blank','interview','expert')),
  evidence_revision_ids text[] not null default '{}', pending_suggestion jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (agent_id,field),
  check ((field in ('always','never','exampleQuestions') and jsonb_typeof(value) = 'array')
    or (field not in ('always','never','exampleQuestions') and jsonb_typeof(value) = 'string'))
);
create table public.interview_sessions (
  id text primary key, agent_id text not null unique references public.agents(id),
  state text not null default 'paused' check (state in ('active','paused','completed')),
  topic_state jsonb not null default '{}', readiness_evidence jsonb not null default '{}',
  ready_dismissed boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(agent_id,id)
);
create table public.questions (
  id text primary key, agent_id text not null, session_id text not null, position integer not null check (position >= 0),
  text text not null, skipped_at timestamptz,
  origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agent_id,id), unique(session_id,position),
  foreign key(agent_id,session_id) references public.interview_sessions(agent_id,id)
);
create table public.wallets (
  identity_id text primary key references public.identities(id),
  balance_units bigint not null default 0, held_units bigint not null default 0 check (held_units >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Negative balance can represent a real provider overrun. Never clamp actual cost.
create table public.daily_budgets (
  day date primary key, cap_units bigint not null check (cap_units >= 0),
  spent_units bigint not null default 0 check (spent_units >= 0), held_units bigint not null default 0 check (held_units >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.operations (
  id text primary key, identity_id text not null references public.identities(id), agent_id text not null references public.agents(id),
  route text not null, request_key text not null, payload_hash text not null,
  purpose text not null check (purpose in ('interview','embedding','sandbox','chat','source','persona')),
  state text not null default 'reserved' check (state in ('reserved','running','completed','failed','unknown','settled','cancelled')),
  estimate_units bigint not null check (estimate_units >= 0), held_units bigint not null check (held_units >= 0),
  actual_units bigint check (actual_units >= 0), max_units bigint not null check (max_units >= 0), price_version text not null,
  reservation_day date not null references public.daily_budgets(day),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(identity_id,route,request_key), unique(agent_id,id)
);
create table public.provider_attempts (
  id text primary key, operation_id text not null references public.operations(id), stage_key text not null,
  attempt integer not null check (attempt >= 1), provider text not null check (provider in ('anthropic','voyage')),
  model text not null, state text not null check (state in ('prepared','dispatched','completed','failed','unknown','settled')),
  provider_request_id text, dispatch_day date references public.daily_budgets(day),
  input_tokens integer check (input_tokens >= 0), output_tokens integer check (output_tokens >= 0),
  cache_read_tokens integer check (cache_read_tokens >= 0), cache_write_tokens integer check (cache_write_tokens >= 0),
  embedding_tokens integer check (embedding_tokens >= 0), successful_search_count integer check (successful_search_count >= 0),
  gross_cost_units bigint check (gross_cost_units >= 0), effective_cost_units bigint check (effective_cost_units >= 0),
  held_units bigint not null default 0 check (held_units >= 0), latency_ms integer check (latency_ms >= 0),
  request_metadata jsonb not null check (jsonb_typeof(request_metadata) = 'object' and octet_length(request_metadata::text) <= 4096),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(operation_id,stage_key,attempt)
);
create table public.ledger (
  id text primary key, identity_id text references public.identities(id), operation_id text references public.operations(id),
  attempt_id text references public.provider_attempts(id), request_key text not null,
  kind text not null check (kind in ('seed','subscription','pack','debit','earnings','cashout','platform_cost','platform_margin')),
  amount_units bigint not null, balance_after_units bigint, purpose text, ref_type text, ref_id text, note text not null default '',
  origin text not null default 'live' check (origin in ('fixture','live')),
  created_at timestamptz not null default now(), unique nulls not distinct(identity_id,request_key), unique(attempt_id,kind,identity_id)
);
create table public.conversations (
  id text primary key, agent_id text not null references public.agents(id), hirer_id text not null references public.identities(id),
  mode text not null check (mode in ('sandbox','chat')), title text not null default 'New conversation',
  share_transcript boolean not null default false, origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(agent_id,id)
);
create table public.messages (
  id text primary key, agent_id text not null, conversation_id text not null, operation_id text,
  role text not null check (role in ('user','assistant')), content text not null,
  citations jsonb not null default '[]', retrieved jsonb not null default '[]', tool_steps jsonb not null default '[]',
  feedback text check (feedback in ('up','down')), charged_units bigint check (charged_units >= 0),
  origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(agent_id,id),
  unique(operation_id,role), foreign key(agent_id,conversation_id) references public.conversations(agent_id,id),
  foreign key(agent_id,operation_id) references public.operations(agent_id,id)
);
create table public.message_events (
  id text primary key, agent_id text not null, message_id text, operation_id text not null,
  sequence integer not null check (sequence >= 0), type text not null, payload jsonb not null,
  created_at timestamptz not null default now(), unique(operation_id,sequence),
  foreign key(agent_id,message_id) references public.messages(agent_id,id),
  foreign key(agent_id,operation_id) references public.operations(agent_id,id)
);
create table public.seed_imports (
  id text primary key, identity_id text not null references public.identities(id), import_key text not null,
  payload_hash text not null, result jsonb not null, created_at timestamptz not null default now(), unique(identity_id,import_key)
);
create index conversations_identity_idx on public.conversations(hirer_id,agent_id);
create index messages_conversation_idx on public.messages(conversation_id,created_at);
create index operations_identity_idx on public.operations(identity_id,created_at);
create index attempts_day_idx on public.provider_attempts(dispatch_day,state);
create index ledger_identity_idx on public.ledger(identity_id,created_at);

do $$ declare name text; begin
  foreach name in array array['identities','profiles','agents','persona_fields','interview_sessions','questions','wallets','daily_budgets','operations','provider_attempts','conversations','messages'] loop
    execute format('create trigger touch_version before update on public.%I for each row execute function public.touch_version()', name);
  end loop;
end $$;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
commit;
