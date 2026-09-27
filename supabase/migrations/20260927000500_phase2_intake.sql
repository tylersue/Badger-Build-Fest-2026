begin;

-- Intake confirmation, byte/file quota, and retry revision creation share the
-- agent row lock. The index RPC uses the same lock for chunk reservations.
alter table public.intake_estimates add column retry_source_id text;
alter table public.intake_estimates add constraint intake_estimates_retry_source_fk
  foreign key(agent_id,retry_source_id) references public.sources(agent_id,id);

create table public.source_intake_runs (
  revision_id text primary key references public.source_revisions(id),
  agent_id text not null, source_id text not null,
  operation_id text not null references public.operations(id),
  job_id text not null unique,
  request_key text not null,
  state text not null default 'queued' check (state in ('queued','processing','indexed','failed')),
  lease_owner text, lease_expires_at timestamptz,
  error jsonb,
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(agent_id,request_key),
  foreign key(agent_id,revision_id,source_id) references public.source_revisions(agent_id,id,source_id)
);
create index source_intake_runs_lease_idx on public.source_intake_runs(state,lease_expires_at);

create table public.source_cleanup_jobs (
  source_id text primary key references public.sources(id),
  agent_id text not null references public.agents(id),
  storage_path text not null,
  state text not null default 'pending' check (state in ('pending','done')),
  attempts integer not null default 0 check (attempts>=0),
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(agent_id,source_id) references public.sources(agent_id,id)
);
create index source_cleanup_jobs_pending_idx on public.source_cleanup_jobs(agent_id,state,created_at)
  where state='pending';
create trigger touch_version before update on public.source_intake_runs
  for each row execute function public.touch_version();
create trigger touch_version before update on public.source_cleanup_jobs
  for each row execute function public.touch_version();

create function public.source_usage(p_agent_id text)
returns jsonb language sql security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object(
    'sources',(select count(*) from public.sources s where s.agent_id=p_agent_id and s.deleted_at is null and s.origin='live'),
    'bytes',(select coalesce(sum(s.byte_count),0) from public.sources s where s.agent_id=p_agent_id and s.deleted_at is null and s.origin='live'),
    'chunks',(select count(*) from public.chunks c where c.agent_id=p_agent_id and
      ((c.answer_id is not null and exists(select 1 from public.answers a where a.id=c.answer_id
        and a.agent_id=p_agent_id and a.deleted_at is null and a.indexed_revision_id=c.revision_id)) or
       (c.source_id is not null and exists(select 1 from public.sources s where s.id=c.source_id
        and s.agent_id=p_agent_id and s.deleted_at is null and s.active_revision_id=c.revision_id)))),
    'heldChunks',(select coalesce(sum(q.chunks),0) from public.quota_holds q where q.agent_id=p_agent_id
      and q.state='held' and q.expires_at>now()),
    'heldBytes',(select coalesce(sum(q.bytes),0) from public.quota_holds q where q.agent_id=p_agent_id
      and q.state='held' and q.source_id is null and q.expires_at>now())
  );
$$;

create function public.reserve_source_quota(
  p_agent_id text, p_identity_id text, p_token_hash text,
  p_request_key text, p_source_id text, p_revision_id text,
  p_job_id text, p_storage_path text, p_operation_id text,
  p_name text, p_kind text, p_content_hash text, p_byte_count bigint,
  p_price_version text, p_max_sources integer, p_max_agent_bytes bigint,
  p_retry_source_id text default null)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public as $$
declare e public.intake_estimates; s public.sources; r public.source_intake_runs;
  v_count bigint; v_bytes bigint; v_holds bigint; v_revision integer;
begin
  if p_request_key is null or length(p_request_key) not between 1 and 200 or
     p_agent_id is null or p_identity_id is null or
     p_source_id !~ '^src_[0-9a-f-]{36}$' or
     p_revision_id !~ '^srev_[0-9a-f-]{36}$' or
     p_job_id !~ '^job_[0-9a-f-]{36}$' or
     p_storage_path !~ ('^'||p_agent_id||'/src_[0-9a-f-]{36}/[0-9a-f-]{36}$') or
     p_byte_count < 1 or p_byte_count>5242880 or p_max_sources not between 1 and 100 or
     p_max_agent_bytes < p_byte_count then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.agents where id=p_agent_id and owner_id=p_identity_id
    and deleted_at is null for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  select * into r from public.source_intake_runs where agent_id=p_agent_id and request_key=p_request_key;
  if found then
    select * into s from public.sources where id=r.source_id;
    if s.deleted_at is not null or s.content_hash<>p_content_hash or s.name<>p_name or
       s.kind<>p_kind or s.byte_count<>p_byte_count or
       (p_retry_source_id is not null and r.source_id<>p_retry_source_id) then
      raise exception 'CONFLICT'; end if;
    return jsonb_build_object('sourceId',r.source_id,'revisionId',r.revision_id,
      'jobId',r.job_id,'operationId',r.operation_id,'storagePath',s.storage_path,'replayed',true);
  end if;
  select * into e from public.intake_estimates where token_hash=p_token_hash and agent_id=p_agent_id for update;
  if not found or e.expires_at<=now() or e.consumed_at is not null or
     e.name<>p_name or e.kind<>p_kind or e.content_hash<>p_content_hash or
     e.byte_count<>p_byte_count or e.price_version<>p_price_version or
     e.estimate_version<>1 or e.retry_source_id is distinct from p_retry_source_id then
    raise exception 'STALE_ESTIMATE'; end if;
  if not exists(select 1 from public.operations where id=p_operation_id and agent_id=p_agent_id
    and identity_id=p_identity_id and purpose='source' and request_key=p_request_key
    and payload_hash=p_content_hash and price_version=p_price_version
    and estimate_units=e.estimate_units and max_units=e.max_units
    and state in ('reserved','running')) then raise exception 'CONFLICT'; end if;
  select count(*),coalesce(sum(byte_count),0) into v_count,v_bytes
    from public.sources where agent_id=p_agent_id and deleted_at is null
    and origin='live' and (p_retry_source_id is null or id<>p_retry_source_id);
  select coalesce(sum(bytes),0) into v_holds from public.quota_holds
    where agent_id=p_agent_id and state='held' and expires_at>now()
      and source_id is null;
  if v_count + 1 > p_max_sources or v_bytes + v_holds + p_byte_count > p_max_agent_bytes
    then raise exception 'QUOTA'; end if;
  if p_retry_source_id is null then
    insert into public.sources(id,agent_id,kind,name,content_hash,storage_path,byte_count,
      current_revision_id,state,origin)
    values(p_source_id,p_agent_id,p_kind,p_name,p_content_hash,p_storage_path,p_byte_count,
      p_revision_id,'queued','live');
    v_revision:=1;
  else
    select * into s from public.sources where id=p_retry_source_id and agent_id=p_agent_id for update;
    if not found or s.deleted_at is not null or s.state<>'failed' or
       s.name<>p_name or s.kind<>p_kind or s.content_hash<>p_content_hash or
       s.byte_count<>p_byte_count or s.storage_path is null then raise exception 'CONFLICT'; end if;
    if exists(select 1 from public.provider_attempts a join public.source_intake_runs x
      on x.operation_id=a.operation_id where x.source_id=s.id and a.state in ('dispatched','unknown'))
      then raise exception 'UNKNOWN_USAGE'; end if;
    select coalesce(max(revision_number),0)+1 into v_revision from public.source_revisions where source_id=s.id;
    update public.sources set current_revision_id=p_revision_id,state='queued',error=null
      where id=s.id;
  end if;
  insert into public.source_revisions(id,agent_id,source_id,revision_number,content_hash,
    storage_path,byte_count) values(p_revision_id,p_agent_id,coalesce(p_retry_source_id,p_source_id),
    v_revision,p_content_hash,case when p_retry_source_id is null then p_storage_path else s.storage_path end,p_byte_count);
  insert into public.source_intake_runs(revision_id,agent_id,source_id,operation_id,job_id,request_key)
    values(p_revision_id,p_agent_id,coalesce(p_retry_source_id,p_source_id),p_operation_id,p_job_id,p_request_key);
  if p_retry_source_id is null then
    insert into public.quota_holds(id,agent_id,source_id,request_key,bytes,chunks,expires_at)
      values('quota_'||p_source_id,p_agent_id,p_source_id,'source:'||p_request_key,
        p_byte_count,0,now()+interval '1 day');
  end if;
  update public.intake_estimates set consumed_at=now() where id=e.id;
  return jsonb_build_object('sourceId',coalesce(p_retry_source_id,p_source_id),
    'revisionId',p_revision_id,'jobId',p_job_id,'operationId',p_operation_id,
    'storagePath',case when p_retry_source_id is null then p_storage_path else s.storage_path end,
    'replayed',false);
end $$;

create function public.claim_source_processing(p_revision_id text,p_lease_owner text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.source_intake_runs; s public.sources;
begin
  if length(p_lease_owner) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
  select * into r from public.source_intake_runs where revision_id=p_revision_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.agents where id=r.agent_id for update;
  select * into r from public.source_intake_runs where revision_id=p_revision_id for update;
  select * into s from public.sources where id=r.source_id and agent_id=r.agent_id for update;
  if s.deleted_at is not null or s.current_revision_id is distinct from r.revision_id then
    update public.source_intake_runs set state='failed',error='{"code":"stale"}',lease_owner=null,
      lease_expires_at=null where revision_id=r.revision_id;
    return jsonb_build_object('claimed',false,'state','failed');
  end if;
  if r.state in ('indexed','failed') then return jsonb_build_object('claimed',false,'state',r.state); end if;
  if r.state='processing' and r.lease_expires_at>now() and r.lease_owner<>p_lease_owner
    then return jsonb_build_object('claimed',false,'state','processing'); end if;
  update public.source_intake_runs set state='processing',lease_owner=p_lease_owner,
    lease_expires_at=now()+interval '2 minutes' where revision_id=p_revision_id;
  update public.sources set state='processing' where id=r.source_id;
  return jsonb_build_object('claimed',true,'state','processing','sourceId',r.source_id,
    'operationId',r.operation_id,'jobId',r.job_id,'storagePath',s.storage_path,
    'name',s.name,'kind',s.kind);
end $$;

create function public.fail_source_upload(p_revision_id text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.source_intake_runs;
begin
  select * into r from public.source_intake_runs where revision_id=p_revision_id for update;
  if not found or r.state<>'queued' then raise exception 'CONFLICT'; end if;
  update public.source_intake_runs set state='failed',error='{"code":"storage"}' where revision_id=r.revision_id;
  update public.sources set state='failed',deleted_at=now(),error='{"code":"storage"}'
    where id=r.source_id and agent_id=r.agent_id;
  update public.quota_holds set state='released' where source_id=r.source_id and state='held' and chunks=0;
  return true;
end $$;

create function public.finish_source_parsing(p_revision_id text,p_lease_owner text,
  p_state text,p_page_count integer,p_error_code text default null)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.source_intake_runs; s public.sources;
begin
  select * into r from public.source_intake_runs where revision_id=p_revision_id for update;
  if not found or r.lease_owner is distinct from p_lease_owner or r.state<>'processing'
    or p_state not in ('indexed','failed') then raise exception 'CONFLICT'; end if;
  select * into s from public.sources where id=r.source_id and agent_id=r.agent_id for update;
  if s.deleted_at is not null or s.current_revision_id is distinct from r.revision_id then
    raise exception 'CONFLICT'; end if;
  update public.source_intake_runs set state=p_state,
    error=case when p_error_code is null then null else jsonb_build_object('code',p_error_code) end,
    lease_owner=null,lease_expires_at=null where revision_id=p_revision_id;
  if p_state='failed' then
    update public.sources set state='failed',error=jsonb_build_object('code',coalesce(p_error_code,'parse'))
      where id=r.source_id;
    update public.quota_holds set state='released' where source_id=r.source_id and state='held' and chunks=0;
  else
    update public.sources set page_count=p_page_count where id=r.source_id;
    update public.quota_holds set state='committed' where source_id=r.source_id and state='held' and chunks=0;
  end if;
  return true;
end $$;

create function public.tombstone_source(p_agent_id text,p_source_id text,p_identity_id text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.sources;
begin
  perform 1 from public.agents where id=p_agent_id and owner_id=p_identity_id
    and deleted_at is null for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  select * into s from public.sources where id=p_source_id and agent_id=p_agent_id for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if s.deleted_at is null then
    update public.sources set deleted_at=now(),state='failed',error='{"code":"deleted"}' where id=s.id;
    update public.source_intake_runs set state='failed',error='{"code":"deleted"}',
      lease_owner=null,lease_expires_at=null where source_id=s.id and state in ('queued','processing');
    update public.index_jobs set state='failed',error='{"code":"stale"}',
      lease_owner=null,lease_expires_at=null where source_id=s.id and state in ('queued','processing');
    update public.quota_holds set state='released' where source_id=s.id and state='held';
    if s.storage_path is not null then
      insert into public.source_cleanup_jobs(source_id,agent_id,storage_path)
        values(s.id,s.agent_id,s.storage_path) on conflict do nothing;
    end if;
  end if;
  return jsonb_build_object('sourceId',s.id,'storagePath',s.storage_path,'deleted',true,
    'operationIds',(select coalesce(jsonb_agg(distinct operation_id),'[]'::jsonb)
      from public.source_intake_runs where source_id=s.id));
end $$;

revoke all on public.source_intake_runs from public,anon,authenticated;
grant all on public.source_intake_runs to service_role;
revoke all on public.source_cleanup_jobs from public,anon,authenticated;
grant all on public.source_cleanup_jobs to service_role;
revoke execute on function public.source_usage(text) from public,anon,authenticated;
grant execute on function public.source_usage(text) to service_role;
revoke execute on function public.reserve_source_quota(text,text,text,text,text,text,text,text,text,text,text,text,bigint,text,integer,bigint,text) from public,anon,authenticated;
revoke execute on function public.claim_source_processing(text,text) from public,anon,authenticated;
revoke execute on function public.fail_source_upload(text) from public,anon,authenticated;
revoke execute on function public.finish_source_parsing(text,text,text,integer,text) from public,anon,authenticated;
revoke execute on function public.tombstone_source(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_source_quota(text,text,text,text,text,text,text,text,text,text,text,text,bigint,text,integer,bigint,text) to service_role;
grant execute on function public.claim_source_processing(text,text) to service_role;
grant execute on function public.fail_source_upload(text) to service_role;
grant execute on function public.finish_source_parsing(text,text,text,integer,text) to service_role;
grant execute on function public.tombstone_source(text,text,text) to service_role;
commit;
