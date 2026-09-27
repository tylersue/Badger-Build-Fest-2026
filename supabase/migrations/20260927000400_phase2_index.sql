begin;

-- Jobs own their immutable input and paid operation. A retry never needs the
-- browser to resend extracted text, nor can it change the paid stage keys.
alter table public.index_jobs add column operation_id text references public.operations(id);
alter table public.index_jobs add column segments jsonb;
alter table public.index_jobs add column batch_size integer not null default 8 check (batch_size between 1 and 8);
alter table public.index_jobs add column max_chunks integer not null default 2000 check (max_chunks between 1 and 2000);
alter table public.index_jobs add column retry_generation integer not null default 0 check (retry_generation >= 0);
alter table public.index_jobs add constraint index_jobs_segments_array check (segments is null or jsonb_typeof(segments) = 'array');
create index index_jobs_operation_idx on public.index_jobs(operation_id) where operation_id is not null;
create index quota_holds_agent_state_idx on public.quota_holds(agent_id,state,expires_at);

create function public.enqueue_index_revision(p_job_id text, p_agent_id text,
  p_answer_id text, p_source_id text, p_revision_id text, p_operation_id text,
  p_segments jsonb, p_max_chunks integer default 2000)
returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs; a public.answers; s public.sources;
  v_segments jsonb; v_chunks integer; v_active integer; v_held integer;
begin
  if length(p_job_id) > 200 or p_job_id = '' or p_agent_id = '' or p_revision_id = ''
    or num_nonnulls(p_answer_id,p_source_id) <> 1 or p_max_chunks not between 1 and 2000 then
    raise exception 'INVALID_INPUT';
  end if;
  -- Existing job is the sole idempotent resume target for this revision.
  select * into j from public.index_jobs where agent_id=p_agent_id and revision_id=p_revision_id;
  if found then
    if j.answer_id is distinct from p_answer_id or j.source_id is distinct from p_source_id
      or j.operation_id is distinct from p_operation_id then raise exception 'CONFLICT'; end if;
    return j;
  end if;
  perform 1 from public.agents where id=p_agent_id and deleted_at is null for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if not exists(select 1 from public.operations where id=p_operation_id and agent_id=p_agent_id
    and purpose in ('embedding','source','interview')) then raise exception 'INVALID_INPUT'; end if;
  if p_answer_id is not null then
    select * into a from public.answers where id=p_answer_id and agent_id=p_agent_id for update;
    if not found or a.deleted_at is not null or a.current_revision_id is distinct from p_revision_id then raise exception 'CONFLICT'; end if;
    if not exists(select 1 from public.answer_revisions r where r.id=p_revision_id and r.agent_id=p_agent_id
      and r.answer_id=p_answer_id and r.deleted_at is null) then raise exception 'CONFLICT'; end if;
    v_segments := p_segments;
  else
    select * into s from public.sources where id=p_source_id and agent_id=p_agent_id for update;
    if not found or s.deleted_at is not null or s.current_revision_id is distinct from p_revision_id then raise exception 'CONFLICT'; end if;
    if not exists(select 1 from public.source_revisions r where r.id=p_revision_id and r.agent_id=p_agent_id
      and r.source_id=p_source_id and r.deleted_at is null) then raise exception 'CONFLICT'; end if;
    v_segments := p_segments;
  end if;
  if jsonb_typeof(v_segments) <> 'array' or jsonb_array_length(v_segments) < 1
    or jsonb_array_length(v_segments) > 2000 or length(v_segments::text) > 250000 then raise exception 'INVALID_INPUT'; end if;
  -- Chunking is done before this RPC; validate the frozen payload and quota in
  -- one agent lock shared by all concurrent enqueues.
  if exists(select 1 from jsonb_array_elements(v_segments) e(value) where
    jsonb_typeof(e.value) <> 'object' or jsonb_typeof(e.value->'content') <> 'string'
    or length(e.value->>'content') not between 1 and 2000
    or (e.value->>'answerId') is distinct from p_answer_id
    or (e.value->>'sourceId') is distinct from p_source_id) then raise exception 'INVALID_INPUT'; end if;
  v_chunks := jsonb_array_length(v_segments);
  select count(*) into v_active from public.chunks c where c.agent_id=p_agent_id and
    ((c.answer_id is not null and exists(select 1 from public.answers x where x.id=c.answer_id
      and x.agent_id=p_agent_id and x.deleted_at is null and x.indexed_revision_id=c.revision_id
      and x.id is distinct from p_answer_id)) or
     (c.source_id is not null and exists(select 1 from public.sources x where x.id=c.source_id
      and x.agent_id=p_agent_id and x.deleted_at is null and x.active_revision_id=c.revision_id
      and x.id is distinct from p_source_id)));
  select coalesce(sum(chunks),0) into v_held from public.quota_holds where agent_id=p_agent_id
    and state='held' and expires_at > now();
  if v_active + v_held + v_chunks > p_max_chunks then raise exception 'QUOTA'; end if;
  insert into public.index_jobs(id,agent_id,answer_id,source_id,revision_id,operation_id,segments,
    total_batches,max_chunks,state) values(p_job_id,p_agent_id,p_answer_id,p_source_id,p_revision_id,p_operation_id,
    v_segments,ceil(v_chunks::numeric/8)::integer,p_max_chunks,'queued') returning * into j;
  insert into public.quota_holds(id,agent_id,source_id,request_key,bytes,chunks,expires_at)
    values('quota_'||p_job_id,p_agent_id,p_source_id,'index:'||p_job_id,0,v_chunks,now()+interval '1 day');
  if p_answer_id is not null then update public.answers set state='indexing' where id=p_answer_id;
  else update public.sources set state='processing', error=null where id=p_source_id; end if;
  return j;
end $$;

create function public.claim_index_job(p_job_id text, p_lease_owner text)
returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs;
begin
  if length(p_lease_owner) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
  select * into j from public.index_jobs where id=p_job_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.agents where id=j.agent_id for update;
  select * into j from public.index_jobs where id=p_job_id for update;
  if j.state='ready' then return j; end if;
  if j.state='failed' and j.error->>'code' in ('unknown_usage','stale') then return j; end if;
  if j.state='processing' and j.lease_expires_at > now() and j.lease_owner <> p_lease_owner then
    return j;
  end if;
  if (j.answer_id is not null and not exists(select 1 from public.answers a where a.id=j.answer_id
    and a.agent_id=j.agent_id and a.current_revision_id=j.revision_id and a.deleted_at is null)) or
    (j.source_id is not null and not exists(select 1 from public.sources s where s.id=j.source_id
    and s.agent_id=j.agent_id and s.current_revision_id=j.revision_id and s.deleted_at is null)) then
    update public.index_jobs set state='failed',error='{"code":"stale"}',lease_owner=null,
      lease_expires_at=null where id=j.id returning * into j;
    update public.quota_holds set state='released' where request_key='index:'||j.id and state='held';
    return j;
  end if;
  -- Failed jobs release quota. A later retry must reserve it again under the
  -- same agent lock before any additional paid batch is sent.
  if not exists(select 1 from public.quota_holds q where q.request_key='index:'||j.id
    and q.state='held' and q.expires_at > now()) then
    if (select count(*) from public.chunks c where c.agent_id=j.agent_id and
      ((c.answer_id is not null and exists(select 1 from public.answers x where x.id=c.answer_id
        and x.agent_id=j.agent_id and x.deleted_at is null and x.indexed_revision_id=c.revision_id
        and x.id is distinct from j.answer_id)) or
       (c.source_id is not null and exists(select 1 from public.sources x where x.id=c.source_id
        and x.agent_id=j.agent_id and x.deleted_at is null and x.active_revision_id=c.revision_id
        and x.id is distinct from j.source_id))))
      + (select coalesce(sum(chunks),0) from public.quota_holds q where q.agent_id=j.agent_id
        and q.id <> 'quota_'||j.id and q.state='held' and q.expires_at > now())
      + jsonb_array_length(j.segments) > j.max_chunks then raise exception 'QUOTA'; end if;
    update public.quota_holds set state='held',expires_at=now()+interval '1 day'
      where request_key='index:'||j.id;
  end if;
  update public.index_jobs set state='processing',lease_owner=p_lease_owner,
    retry_generation=retry_generation+case when state='failed' then 1 else 0 end,
    lease_expires_at=now()+interval '120 seconds',error=null where id=j.id returning * into j;
  return j;
end $$;

create function public.yield_index_job(p_job_id text, p_lease_owner text)
returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs;
begin
  select * into j from public.index_jobs where id=p_job_id for update;
  if not found or j.state <> 'processing' or j.lease_owner is distinct from p_lease_owner
    or j.lease_expires_at <= now() then raise exception 'CONFLICT'; end if;
  update public.index_jobs set state='queued',lease_owner=null,lease_expires_at=null
    where id=p_job_id returning * into j;
  return j;
end $$;

create function public.complete_index_batch(p_job_id text, p_lease_owner text,
  p_batch integer, p_chunks jsonb) returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs; expected_count integer;
begin
  select * into j from public.index_jobs where id=p_job_id for update;
  if not found or j.state <> 'processing' or j.lease_owner is distinct from p_lease_owner
    or j.lease_expires_at <= now() then raise exception 'CONFLICT'; end if;
  if p_batch < j.completed_batches then return j; end if;
  if p_batch <> j.completed_batches or p_batch >= j.total_batches then raise exception 'CONFLICT'; end if;
  expected_count := least(j.batch_size,jsonb_array_length(j.segments)-p_batch*j.batch_size);
  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) <> expected_count then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from jsonb_array_elements(p_chunks) with ordinality e(v,n) where
    (e.v->>'ordinal')::integer <> p_batch*j.batch_size+(e.n-1)::integer
    or jsonb_typeof(e.v->'embedding') <> 'array' or jsonb_array_length(e.v->'embedding') <> 1024) then
    raise exception 'INVALID_INPUT'; end if;
  insert into public.chunks(id,agent_id,revision_id,answer_id,source_id,ordinal,content,
    question,page,heading_path,embedding)
  select 'chunk_'||j.id||'_'||(p_batch*j.batch_size+(e.n-1)::integer),j.agent_id,j.revision_id,
    j.answer_id,j.source_id,p_batch*j.batch_size+(e.n-1)::integer,
    j.segments->(p_batch*j.batch_size+(e.n-1)::integer)->>'content',
    j.segments->(p_batch*j.batch_size+(e.n-1)::integer)->>'question',
    nullif(j.segments->(p_batch*j.batch_size+(e.n-1)::integer)->>'page','')::integer,
    j.segments->(p_batch*j.batch_size+(e.n-1)::integer)->>'headingPath',
    (e.v->'embedding')::text::extensions.vector(1024)
  from jsonb_array_elements(p_chunks) with ordinality e(v,n);
  update public.index_jobs set completed_batches=completed_batches+1,
    indexed_chunks=indexed_chunks+expected_count,lease_expires_at=now()+interval '120 seconds'
    where id=j.id returning * into j;
  return j;
end $$;

create function public.activate_revision(p_job_id text, p_lease_owner text)
returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs; changed integer;
begin
  select * into j from public.index_jobs where id=p_job_id for update;
  if not found or j.state <> 'processing' or j.lease_owner is distinct from p_lease_owner
    or j.lease_expires_at <= now() or j.completed_batches <> j.total_batches
    or j.indexed_chunks <> jsonb_array_length(j.segments) then raise exception 'CONFLICT'; end if;
  if j.answer_id is not null then
    update public.answers set indexed_revision_id=j.revision_id,state='ready'
      where id=j.answer_id and agent_id=j.agent_id and current_revision_id=j.revision_id
        and deleted_at is null returning 1 into changed;
  else
    update public.sources set active_revision_id=j.revision_id,state='ready',
      chunk_count=j.indexed_chunks,error=null where id=j.source_id and agent_id=j.agent_id
      and current_revision_id=j.revision_id and deleted_at is null returning 1 into changed;
  end if;
  if changed is null then
    update public.index_jobs set state='failed',error='{"code":"stale"}',lease_owner=null,
      lease_expires_at=null where id=j.id returning * into j;
    update public.quota_holds set state='released' where request_key='index:'||j.id and state='held';
  else
    update public.index_jobs set state='ready',lease_owner=null,lease_expires_at=null
      where id=j.id returning * into j;
    update public.quota_holds set state='committed' where request_key='index:'||j.id and state='held';
  end if;
  return j;
end $$;

create function public.fail_index_job(p_job_id text, p_lease_owner text, p_code text)
returns public.index_jobs language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare j public.index_jobs;
begin
  select * into j from public.index_jobs where id=p_job_id for update;
  if not found or j.lease_owner is distinct from p_lease_owner or j.state <> 'processing'
    or p_code not in ('provider','indexing','unknown_usage') then raise exception 'CONFLICT'; end if;
  update public.index_jobs set state='failed',error=jsonb_build_object('code',p_code),
    lease_owner=null,lease_expires_at=null where id=j.id returning * into j;
  update public.quota_holds set state='released' where request_key='index:'||j.id and state='held';
  if j.answer_id is not null then
    update public.answers set state='failed' where id=j.answer_id and agent_id=j.agent_id
      and current_revision_id=j.revision_id and deleted_at is null;
  else
    update public.sources set state='failed',error=jsonb_build_object('code',p_code) where id=j.source_id and agent_id=j.agent_id
      and current_revision_id=j.revision_id and deleted_at is null;
  end if;
  return j;
end $$;

-- Both branches filter ownership and current active revisions before sorting.
-- Union is exact cosine search over the capped agent corpus.
create function public.search_agent_knowledge(p_agent_id text, p_embedding extensions.vector(1024), p_k integer default 6)
returns table(id text,agent_id text,revision_id text,source_id text,source_type text,
  source_name text,content text,question text,page integer,heading_path text,score double precision)
language sql stable security definer set search_path = pg_catalog, public, extensions as $$
  select c.id,c.agent_id,c.revision_id,c.answer_id,'interview'::text,'Interview answers'::text,
    c.content,c.question,c.page,c.heading_path,1-(c.embedding <=> p_embedding) as score
  from public.chunks c join public.answers a on a.id=c.answer_id and a.agent_id=c.agent_id
  join public.answer_revisions r on r.id=c.revision_id and r.answer_id=a.id and r.agent_id=a.agent_id
  where c.agent_id=p_agent_id and a.deleted_at is null and r.deleted_at is null
    and a.indexed_revision_id=c.revision_id
    and not exists(select 1 from public.answers parent where parent.id=a.parent_answer_id
      and parent.agent_id=a.agent_id and parent.deleted_at is not null)
  union all
  select c.id,c.agent_id,c.revision_id,c.source_id,'document'::text,s.name,
    c.content,c.question,c.page,c.heading_path,1-(c.embedding <=> p_embedding) as score
  from public.chunks c join public.sources s on s.id=c.source_id and s.agent_id=c.agent_id
  join public.source_revisions r on r.id=c.revision_id and r.source_id=s.id and r.agent_id=s.agent_id
  where c.agent_id=p_agent_id and s.deleted_at is null and r.deleted_at is null
    and s.active_revision_id=c.revision_id
  order by score desc,id limit least(greatest(coalesce(p_k,6),1),12)
$$;

revoke execute on function public.enqueue_index_revision(text,text,text,text,text,text,jsonb,integer) from public,anon,authenticated;
revoke execute on function public.claim_index_job(text,text) from public,anon,authenticated;
revoke execute on function public.yield_index_job(text,text) from public,anon,authenticated;
revoke execute on function public.complete_index_batch(text,text,integer,jsonb) from public,anon,authenticated;
revoke execute on function public.activate_revision(text,text) from public,anon,authenticated;
revoke execute on function public.fail_index_job(text,text,text) from public,anon,authenticated;
revoke execute on function public.search_agent_knowledge(text,extensions.vector,integer) from public,anon,authenticated;
grant execute on function public.enqueue_index_revision(text,text,text,text,text,text,jsonb,integer) to service_role;
grant execute on function public.claim_index_job(text,text) to service_role;
grant execute on function public.yield_index_job(text,text) to service_role;
grant execute on function public.complete_index_batch(text,text,integer,jsonb) to service_role;
grant execute on function public.activate_revision(text,text) to service_role;
grant execute on function public.fail_index_job(text,text,text) to service_role;
grant execute on function public.search_agent_knowledge(text,extensions.vector,integer) to service_role;
commit;
