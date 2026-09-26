-- Phase 1 core schema for the BUILD -> PUBLISH -> HIRE -> USE loop.
--
-- Presentation MVP (Phase 1 decision D-01): there is no authentication and no RLS.
-- Two seeded identities with a sidebar switcher stand in for accounts.
-- Every read and write goes through the server-only service-role client
-- (lib/supabase/admin.ts). The Data API is closed to the anon and
-- authenticated roles at the end of this file, so the public anon key
-- cannot read or change anything.

create extension if not exists vector with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- identities: the seeded people (two are switchable: one expert, one hirer)
create table public.identities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('expert', 'hirer')),
  display_name text not null,
  avatar_initial text not null,
  avatar_color text not null default '#5a4636',
  avatar_url text,
  is_switchable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- profiles: expert profile fields (AUTH-03). Credentials are self-reported.
create table public.profiles (
  identity_id uuid primary key references public.identities (id) on delete cascade,
  field text,
  credentials text,
  years_experience int check (years_experience between 0 and 70),
  contact_url text,
  bio text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- agents: persona + publishing state. The model is set per category in
-- config (lib/llm/registry.ts), so there is no model column.
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.identities (id),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('health_pt', 'tax_finance', 'career_admissions')),
  icon text not null default 'bot',
  headline text,
  description text,
  persona jsonb not null default '{}'::jsonb,
  system_prompt text,
  greeting text,
  example_questions text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  rate_multiplier numeric(3, 2) not null default 1 check (rate_multiplier between 1 and 5),
  consent_accepted_at timestamptz,
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  usage_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  kind text not null check (kind in ('interview', 'pdf', 'docx', 'txt', 'md', 'text')),
  name text not null,
  storage_path text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed')),
  error text,
  chunk_count int not null default 0,
  page_count int,
  bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- chunks: retrievable knowledge. Tenant isolation for retrieval is the
-- agent_id filter (no RLS), so every retrieval query must filter on it.
create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  position int not null default 0,
  page int,
  heading_path text,
  question text,
  content text not null,
  embedding extensions.vector(1024),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  turn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  position int not null,
  question text not null,
  answer text,
  chunk_id uuid references public.chunks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, position)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  hirer_id uuid not null references public.identities (id),
  is_sandbox boolean not null default false,
  title text not null default 'New conversation',
  share_transcript boolean not null default false,
  message_count int not null default 0,
  spent_cents int not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  feedback text check (feedback in ('up', 'down')),
  cost_cents int,
  tokens_in int,
  tokens_out int,
  model text,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  hirer_id uuid not null references public.identities (id),
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (agent_id, hirer_id)
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('agent', 'conversation')),
  agent_id uuid references public.agents (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  reporter_id uuid references public.identities (id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index agents_owner_idx on public.agents (owner_id);
create index agents_status_idx on public.agents (status);
create index sources_agent_idx on public.sources (agent_id);
create index chunks_agent_idx on public.chunks (agent_id);
create index chunks_fts_idx on public.chunks using gin (fts);
create index interview_turns_agent_idx on public.interview_turns (agent_id);
create index conversations_hirer_idx on public.conversations (hirer_id);
create index conversations_agent_idx on public.conversations (agent_id);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index flags_status_idx on public.flags (status);

create trigger identities_updated_at before update on public.identities for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger agents_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute function public.set_updated_at();
create trigger chunks_updated_at before update on public.chunks for each row execute function public.set_updated_at();
create trigger interview_sessions_updated_at before update on public.interview_sessions for each row execute function public.set_updated_at();
create trigger interview_turns_updated_at before update on public.interview_turns for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

-- Close the Data API to anon/authenticated (no RLS in the MVP, see header).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
