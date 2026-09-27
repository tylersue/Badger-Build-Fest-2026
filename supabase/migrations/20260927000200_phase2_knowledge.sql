-- Captured revisions are immutable. Current points at the newest saved text;
-- indexed/active changes only after all chunks for that revision are durable.
-- A failed edit therefore leaves the previous active revision searchable (D-02/07).
begin;

create table public.answers (
  id text primary key, agent_id text not null, question_id text not null,
  parent_answer_id text, current_revision_id text, indexed_revision_id text,
  state text not null default 'captured' check (state in ('captured','indexing','ready','failed')),
  deleted_at timestamptz, origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agent_id,id),
  foreign key(agent_id,question_id) references public.questions(agent_id,id),
  foreign key(agent_id,parent_answer_id) references public.answers(agent_id,id)
);
create table public.answer_revisions (
  id text primary key, agent_id text not null, answer_id text not null, question_id text not null,
  question text not null, text text not null, revision_number integer not null check (revision_number > 0),
  deleted_at timestamptz, created_at timestamptz not null default now(),
  unique(agent_id,id), unique(agent_id,id,answer_id), unique(answer_id,revision_number),
  foreign key(agent_id,answer_id) references public.answers(agent_id,id),
  foreign key(agent_id,question_id) references public.questions(agent_id,id)
);
alter table public.answers add constraint answers_current_revision_fk
  foreign key(agent_id,current_revision_id,id) references public.answer_revisions(agent_id,id,answer_id)
  deferrable initially deferred;
alter table public.answers add constraint answers_indexed_revision_fk
  foreign key(agent_id,indexed_revision_id,id) references public.answer_revisions(agent_id,id,answer_id)
  deferrable initially deferred;

create table public.sources (
  id text primary key, agent_id text not null references public.agents(id),
  kind text not null check (kind in ('pdf','docx','txt','md','text')),
  name text not null, state text not null default 'queued' check (state in ('queued','processing','ready','failed')),
  current_revision_id text, active_revision_id text, content_hash text not null,
  storage_path text, byte_count bigint not null check (byte_count >= 0),
  page_count integer check (page_count >= 0), chunk_count integer not null default 0 check (chunk_count >= 0),
  deleted_at timestamptz, error jsonb,
  origin text not null default 'live' check (origin in ('fixture','live')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agent_id,id)
);
create table public.source_revisions (
  id text primary key, agent_id text not null, source_id text not null,
  revision_number integer not null check (revision_number > 0),
  content_hash text not null, storage_path text, byte_count bigint not null check (byte_count >= 0),
  page_count integer check (page_count >= 0), deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(agent_id,id), unique(agent_id,id,source_id), unique(source_id,revision_number),
  foreign key(agent_id,source_id) references public.sources(agent_id,id)
);
alter table public.sources add constraint sources_current_revision_fk
  foreign key(agent_id,current_revision_id,id) references public.source_revisions(agent_id,id,source_id)
  deferrable initially deferred;
alter table public.sources add constraint sources_active_revision_fk
  foreign key(agent_id,active_revision_id,id) references public.source_revisions(agent_id,id,source_id)
  deferrable initially deferred;

-- Exactly one parent; composite keys prevent a worker from attaching an agent's
-- vector to another agent's answer or document revision.
create table public.chunks (
  id text primary key, agent_id text not null, revision_id text not null,
  source_id text, answer_id text, ordinal integer not null check (ordinal >= 0),
  content text not null, question text, page integer check (page > 0), heading_path text,
  embedding extensions.vector(1024) not null, created_at timestamptz not null default now(),
  check (num_nonnulls(source_id,answer_id) = 1),
  foreign key(agent_id,revision_id,source_id) references public.source_revisions(agent_id,id,source_id),
  foreign key(agent_id,revision_id,answer_id) references public.answer_revisions(agent_id,id,answer_id)
);
create unique index chunks_source_ordinal_idx on public.chunks(source_id,revision_id,ordinal) where source_id is not null;
create unique index chunks_answer_ordinal_idx on public.chunks(answer_id,revision_id,ordinal) where answer_id is not null;
create index chunks_agent_revision_idx on public.chunks(agent_id,revision_id);
create index answers_agent_state_idx on public.answers(agent_id,state) where deleted_at is null;
create index sources_agent_state_idx on public.sources(agent_id,state) where deleted_at is null;

create table public.index_jobs (
  id text primary key, agent_id text not null references public.agents(id),
  answer_id text, source_id text, revision_id text not null,
  state text not null default 'queued' check (state in ('queued','processing','ready','failed')),
  lease_owner text, lease_expires_at timestamptz,
  completed_batches integer not null default 0 check (completed_batches >= 0),
  total_batches integer not null default 0 check (total_batches >= 0),
  indexed_chunks integer not null default 0 check (indexed_chunks >= 0),
  error jsonb, version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (num_nonnulls(source_id,answer_id) = 1),
  unique(agent_id,revision_id),
  foreign key(agent_id,revision_id,source_id) references public.source_revisions(agent_id,id,source_id),
  foreign key(agent_id,revision_id,answer_id) references public.answer_revisions(agent_id,id,answer_id)
);
create index index_jobs_lease_idx on public.index_jobs(state,lease_expires_at);

create table public.quota_holds (
  id text primary key, agent_id text not null references public.agents(id),
  source_id text, request_key text not null, state text not null default 'held'
    check (state in ('held','committed','released')),
  bytes bigint not null check (bytes >= 0), chunks integer not null check (chunks >= 0),
  expires_at timestamptz not null, version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agent_id,request_key), foreign key(agent_id,source_id) references public.sources(agent_id,id)
);
create table public.intake_estimates (
  id text primary key, agent_id text not null references public.agents(id),
  token_hash text not null unique, name text not null,
  kind text not null check (kind in ('pdf','docx','txt','md','text')),
  content_hash text not null, byte_count bigint not null check (byte_count >= 0),
  estimate_units bigint not null check (estimate_units >= 0),
  max_units bigint not null check (max_units >= 0), price_version text not null,
  estimate_version integer not null check (estimate_version > 0),
  expires_at timestamptz not null, consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index intake_estimates_agent_expiry_idx on public.intake_estimates(agent_id,expires_at);

-- Suggestions cite captured revisions for this agent. Expert-owned fields keep
-- their version and receive pending suggestions instead of silent overwrites (D-04).
alter table public.persona_fields add constraint persona_evidence_is_array
  check (array_position(evidence_revision_ids,null) is null);

create function public.guard_revision_tombstone() returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if old.deleted_at is not null then
    if new.deleted_at is null or new.current_revision_id is distinct from old.current_revision_id then
      raise exception 'tombstoned revision owner cannot be reactivated';
    end if;
    if tg_table_name = 'answers' then
      if new.indexed_revision_id is distinct from old.indexed_revision_id then
        raise exception 'tombstoned answer cannot be reindexed';
      end if;
    elsif new.active_revision_id is distinct from old.active_revision_id then
      raise exception 'tombstoned source cannot be reindexed';
    end if;
  end if;
  return new;
end $$;
create trigger answers_guard_tombstone before update on public.answers
  for each row execute function public.guard_revision_tombstone();
create trigger sources_guard_tombstone before update on public.sources
  for each row execute function public.guard_revision_tombstone();

create function public.reject_revision_mutation() returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  raise exception 'revision history is append-only';
end $$;
create trigger answer_revisions_immutable before update or delete on public.answer_revisions
  for each row execute function public.reject_revision_mutation();
create trigger source_revisions_immutable before update or delete on public.source_revisions
  for each row execute function public.reject_revision_mutation();

do $$ declare name text; begin
  foreach name in array array['answers','sources','index_jobs','quota_holds'] loop
    execute format('create trigger touch_version before update on public.%I for each row execute function public.touch_version()', name);
  end loop;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
  values ('expert-sources','expert-sources',false,5242880,
    array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
revoke all on storage.buckets,storage.objects from public,anon,authenticated;
grant all on storage.buckets,storage.objects to service_role;
commit;
