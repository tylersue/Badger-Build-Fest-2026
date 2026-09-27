begin;

-- One durable request row is the replay boundary for each answer/control mutation.
create table public.interview_requests (
  agent_id text not null references public.agents(id), request_key text not null,
  payload_hash text not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(agent_id,request_key)
);
revoke all on public.interview_requests from public, anon, authenticated;
grant select, insert on public.interview_requests to service_role;

create function public.interview_action(
  p_agent_id text, p_action text, p_request_key text, p_payload_hash text,
  p_expected_version integer default null, p_question_id text default null,
  p_answer_id text default null, p_parent_answer_id text default null,
  p_text text default null)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare s public.interview_sessions; q public.questions; a public.answers;
  old_request public.interview_requests; v_answer_id text; v_revision_id text;
  v_result jsonb; v_topic jsonb; v_pending text; v_first text;
begin
  if p_agent_id is null or length(p_agent_id) not between 1 and 200
    or length(p_request_key) not between 1 and 200
    or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_action not in ('start','pause','resume','skip','continue','dismiss-ready','submit','edit','add-detail','delete','retry-index')
    or (p_text is not null and length(p_text) not between 1 and 100000) then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.agents where id=p_agent_id and deleted_at is null for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  select * into old_request from public.interview_requests
    where agent_id=p_agent_id and request_key=p_request_key;
  if found then
    if old_request.payload_hash <> p_payload_hash then raise exception 'CONFLICT'; end if;
    return old_request.result || jsonb_build_object('replayed',true);
  end if;
  select * into s from public.interview_sessions where agent_id=p_agent_id for update;
  if not found then raise exception 'INVALID_INPUT'; end if;
  v_topic := coalesce(s.topic_state,'{}'::jsonb);
  v_pending := v_topic->>'pendingQuestionId';

  if p_action='start' then
    if s.state='completed' then raise exception 'CONFLICT'; end if;
    if v_pending is null then
      v_first := 'question_'||gen_random_uuid()::text;
      insert into public.questions(id,agent_id,session_id,position,text)
        values(v_first,p_agent_id,s.id,(select count(*) from public.questions where session_id=s.id),
          'Who are you, and what kind of work do you do?');
      v_topic := v_topic || jsonb_build_object('pendingQuestionId',v_first,'topic','your work','depth','opening');
    end if;
    update public.interview_sessions set state='active',topic_state=v_topic where id=s.id;
  elsif p_action='pause' then
    update public.interview_sessions set state='paused' where id=s.id;
  elsif p_action='resume' or p_action='continue' then
    update public.interview_sessions set state='active',ready_dismissed=case when p_action='continue' then true else ready_dismissed end where id=s.id;
  elsif p_action='dismiss-ready' then
    update public.interview_sessions set ready_dismissed=true where id=s.id;
  elsif p_action='skip' then
    if s.state <> 'active' or v_pending is null then raise exception 'CONFLICT'; end if;
    update public.questions set skipped_at=now() where id=v_pending and agent_id=p_agent_id and skipped_at is null;
    v_topic := v_topic || jsonb_build_object('pendingQuestionId',null,'skippedQuestionId',v_pending);
    update public.interview_sessions set topic_state=v_topic where id=s.id;
  elsif p_action='submit' then
    if s.state <> 'active' or s.version <> p_expected_version or v_pending is distinct from p_question_id
      or p_text is null or btrim(p_text)='' or p_parent_answer_id is not null then raise exception 'CONFLICT'; end if;
    select * into q from public.questions where id=p_question_id and agent_id=p_agent_id
      and session_id=s.id and skipped_at is null;
    if not found or exists(select 1 from public.answers where question_id=q.id and parent_answer_id is null and deleted_at is null)
      then raise exception 'CONFLICT'; end if;
    v_answer_id := 'answer_'||gen_random_uuid()::text;
    v_revision_id := 'revision_'||gen_random_uuid()::text;
    insert into public.answers(id,agent_id,question_id,state) values(v_answer_id,p_agent_id,q.id,'captured');
    insert into public.answer_revisions(id,agent_id,answer_id,question_id,question,text,revision_number)
      values(v_revision_id,p_agent_id,v_answer_id,q.id,q.text,btrim(p_text),1);
    update public.answers set current_revision_id=v_revision_id where id=v_answer_id;
    update public.interview_sessions set topic_state=v_topic || jsonb_build_object('pendingQuestionId',null) where id=s.id;
  elsif p_action in ('edit','add-detail','delete','retry-index') then
    select * into a from public.answers where id=p_answer_id and agent_id=p_agent_id for update;
    if not found or a.deleted_at is not null or a.version <> p_expected_version then raise exception 'CONFLICT'; end if;
    if p_action='retry-index' then
      v_answer_id := a.id;
      v_revision_id := a.current_revision_id;
    elsif p_action='add-detail' then
      if a.parent_answer_id is not null or p_text is null or btrim(p_text)='' then raise exception 'CONFLICT'; end if;
      select * into q from public.questions where id=a.question_id and agent_id=p_agent_id;
      v_answer_id := 'answer_'||gen_random_uuid()::text;
      v_revision_id := 'revision_'||gen_random_uuid()::text;
      insert into public.answers(id,agent_id,question_id,parent_answer_id,state)
        values(v_answer_id,p_agent_id,a.question_id,a.id,'captured');
      insert into public.answer_revisions(id,agent_id,answer_id,question_id,question,text,revision_number)
        values(v_revision_id,p_agent_id,v_answer_id,a.question_id,q.text,btrim(p_text),1);
      update public.answers set current_revision_id=v_revision_id where id=v_answer_id;
    elsif p_action='edit' then
      if p_text is null or btrim(p_text)='' then raise exception 'INVALID_INPUT'; end if;
      select * into q from public.questions where id=a.question_id and agent_id=p_agent_id;
      v_answer_id := a.id;
      v_revision_id := 'revision_'||gen_random_uuid()::text;
      insert into public.answer_revisions(id,agent_id,answer_id,question_id,question,text,revision_number)
        values(v_revision_id,p_agent_id,a.id,a.question_id,q.text,btrim(p_text),
          (select coalesce(max(revision_number),0)+1 from public.answer_revisions where answer_id=a.id));
      update public.answers set current_revision_id=v_revision_id,state='captured' where id=a.id;
    else
      update public.answers set deleted_at=now() where id=a.id or (agent_id=p_agent_id and parent_answer_id=a.id);
      update public.index_jobs set state='failed',error='{"code":"stale"}'::jsonb,
        lease_owner=null,lease_expires_at=null where agent_id=p_agent_id
        and (answer_id=a.id or answer_id in (select id from public.answers where parent_answer_id=a.id))
        and state in ('queued','processing','failed');
      update public.quota_holds set state='released' where request_key in
        (select 'index:'||id from public.index_jobs where agent_id=p_agent_id
          and (answer_id=a.id or answer_id in (select id from public.answers where parent_answer_id=a.id))) and state='held';
      v_answer_id := a.id;
    end if;
  end if;
  select * into s from public.interview_sessions where id=s.id;
  v_result := jsonb_build_object('sessionVersion',s.version,'answerId',v_answer_id,
    'revisionId',v_revision_id,'replayed',false);
  insert into public.interview_requests(agent_id,request_key,payload_hash,result)
    values(p_agent_id,p_request_key,p_payload_hash,v_result);
  return v_result;
end $$;

create function public.interview_advance(p_agent_id text, p_expected_version integer,
  p_question text, p_topic_state jsonb, p_readiness jsonb)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare s public.interview_sessions; v_question_id text;
begin
  if length(p_question) not between 1 and 2000 or jsonb_typeof(p_topic_state)<>'object'
    or jsonb_typeof(p_readiness)<>'object' then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.agents where id=p_agent_id and deleted_at is null for update;
  select * into s from public.interview_sessions where agent_id=p_agent_id for update;
  if not found or s.version<>p_expected_version or s.topic_state->>'pendingQuestionId' is not null
    then raise exception 'CONFLICT'; end if;
  v_question_id := 'question_'||gen_random_uuid()::text;
  insert into public.questions(id,agent_id,session_id,position,text)
    values(v_question_id,p_agent_id,s.id,(select count(*) from public.questions where session_id=s.id),p_question);
  update public.interview_sessions set topic_state=p_topic_state || jsonb_build_object('pendingQuestionId',v_question_id),
    readiness_evidence=p_readiness where id=s.id returning * into s;
  return jsonb_build_object('questionId',v_question_id,'sessionVersion',s.version);
end $$;

revoke all on function public.interview_action(text,text,text,text,integer,text,text,text,text) from public,anon,authenticated;
revoke all on function public.interview_advance(text,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.interview_action(text,text,text,text,integer,text,text,text,text) to service_role;
grant execute on function public.interview_advance(text,integer,text,jsonb,jsonb) to service_role;
commit;
