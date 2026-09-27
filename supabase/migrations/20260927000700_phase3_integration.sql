-- Server-owned publishing, private hirer context, and atomic chat settlement.
begin;

alter table public.agents add constraint agents_rate_step check (rate_multiplier * 2 = trunc(rate_multiplier * 2));
alter table public.operations add column chat_rate_multiplier numeric(3,2);
create table public.conversation_attachments (
  conversation_id text primary key references public.conversations(id) on delete cascade,
  agent_id text not null,
  hirer_id text not null references public.identities(id),
  name text not null check (length(name) between 1 and 255),
  content text not null check (length(content) between 1 and 50000),
  created_at timestamptz not null default now(),
  foreign key (agent_id,conversation_id) references public.conversations(agent_id,id)
);
create table public.chat_settlements (
  attempt_id text primary key references public.provider_attempts(id),
  operation_id text not null references public.operations(id),
  raw_units bigint not null check (raw_units >= 0),
  hirer_debit_units bigint not null check (hirer_debit_units >= raw_units),
  platform_margin_units bigint not null check (platform_margin_units >= 0),
  expert_credit_units bigint not null check (expert_credit_units >= 0),
  created_at timestamptz not null default now(),
  check (hirer_debit_units = raw_units + platform_margin_units + expert_credit_units)
);

create function public.set_agent_rate(p_agent_id text, p_owner_id text, p_rate numeric)
returns numeric language plpgsql set search_path = pg_catalog, public as $$
begin
  if p_rate is null or p_rate < 1 or p_rate > 5 or p_rate * 2 <> trunc(p_rate * 2)
    then raise exception 'INVALID_INPUT'; end if;
  update public.agents set rate_multiplier=p_rate where id=p_agent_id and owner_id=p_owner_id and deleted_at is null;
  if not found then raise exception 'NOT_OWNER'; end if;
  return p_rate;
end $$;

create function public.active_agent_chunk_count(p_agent_id text) returns integer
language sql stable set search_path = pg_catalog, public as $$
  select count(*)::integer from public.chunks c where c.agent_id=p_agent_id and (
    exists(select 1 from public.answers a where a.id=c.answer_id and a.deleted_at is null
      and a.indexed_revision_id=c.revision_id) or
    exists(select 1 from public.sources s where s.id=c.source_id and s.deleted_at is null
      and s.active_revision_id=c.revision_id));
$$;

create function public.set_agent_published(p_agent_id text, p_owner_id text, p_publish boolean, p_accept_consent boolean)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_agent public.agents%rowtype; v_fields jsonb; v_count integer;
begin
  select * into v_agent from public.agents where id=p_agent_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception 'NOT_OWNER'; end if;
  if not p_publish then
    update public.agents set status='unpublished' where id=p_agent_id returning * into v_agent;
    return jsonb_build_object('status',v_agent.status,'consentAcceptedAt',v_agent.consent_accepted_at);
  end if;
  select jsonb_object_agg(field,value) into v_fields from public.persona_fields where agent_id=p_agent_id;
  select public.active_agent_chunk_count(p_agent_id) into v_count;
  if coalesce(length(trim(v_fields->>'name')),0)=0 or coalesce(length(trim(v_fields->>'category')),0)=0 or
     coalesce(length(trim(v_fields->>'headline')),0)=0 or coalesce(length(trim(v_fields->>'description')),0)=0 or
     not exists(select 1 from jsonb_array_elements_text(coalesce(v_fields->'exampleQuestions','[]'::jsonb)) q where length(trim(q))>0) or
     v_count < 5 then raise exception 'PUBLISH_BLOCKED'; end if;
  if v_agent.consent_accepted_at is null and not coalesce(p_accept_consent,false) then raise exception 'CONSENT_REQUIRED'; end if;
  update public.agents set status='published', consent_accepted_at=coalesce(consent_accepted_at,now())
    where id=p_agent_id returning * into v_agent;
  return jsonb_build_object('status',v_agent.status,'consentAcceptedAt',v_agent.consent_accepted_at,'activeChunks',v_count);
end $$;

create function public.create_hirer_conversation(p_id text, p_agent_id text, p_hirer_id text, p_title text)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_agent public.agents%rowtype; v_conversation public.conversations%rowtype;
begin
  if p_id !~ '^conv_[0-9a-f-]{36}$' or length(trim(p_title)) not between 1 and 200
    then raise exception 'INVALID_INPUT'; end if;
  select * into v_agent from public.agents where id=p_agent_id and deleted_at is null for share;
  if not found or v_agent.status<>'published' then raise exception 'NOT_PUBLISHED'; end if;
  if v_agent.owner_id=p_hirer_id then raise exception 'NOT_OWNER'; end if;
  insert into public.conversations(id,agent_id,hirer_id,mode,title) values(p_id,p_agent_id,p_hirer_id,'chat',trim(p_title))
    returning * into v_conversation;
  return to_jsonb(v_conversation);
end $$;

-- Keep Phase 2's provider ledger and recovery logic, then add markup inside the same transaction.
alter function public.reserve_operation(text,text,text,text,text,text,text,bigint,bigint,text,bigint)
  rename to reserve_operation_raw;
create function public.reserve_operation(p_id text, p_identity_id text, p_agent_id text,
  p_route text, p_request_key text, p_payload_hash text, p_purpose text,
  p_estimate_units bigint, p_max_units bigint, p_price_version text, p_cap_units bigint)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_rate numeric(3,2) := 1; v_result jsonb;
begin
  if p_purpose='chat' then
    select rate_multiplier into v_rate from public.agents where id=p_agent_id and deleted_at is null for share;
    if not found then raise exception 'NOT_OWNER'; end if;
  end if;
  v_result:=public.reserve_operation_raw(p_id,p_identity_id,p_agent_id,p_route,p_request_key,p_payload_hash,p_purpose,
    ceil(p_estimate_units*v_rate)::bigint,ceil(p_max_units*v_rate)::bigint,p_price_version,p_cap_units);
  if p_purpose='chat' then
    update public.operations set chat_rate_multiplier=v_rate where id=v_result->>'id' and chat_rate_multiplier is null;
    select public.billing_operation_json(o) into v_result from public.operations o where id=v_result->>'id';
  end if;
  return v_result;
end $$;

create function public.apply_chat_settlements(p_operation_id text) returns void
language plpgsql set search_path = pg_catalog, public as $$
declare v_op public.operations%rowtype; v_attempt public.provider_attempts%rowtype;
  v_owner text; v_raw bigint; v_debit bigint; v_margin bigint; v_platform bigint; v_expert bigint;
  v_hirer_balance bigint; v_expert_balance bigint; v_conversation_id text;
begin
  select * into v_op from public.operations where id=p_operation_id for update;
  if v_op.purpose<>'chat' then return; end if;
  if v_op.chat_rate_multiplier is null then raise exception 'INVALID_INPUT'; end if;
  select owner_id into v_owner from public.agents where id=v_op.agent_id;
  select conversation_id into v_conversation_id from public.messages
    where operation_id=p_operation_id and role='user';
  for v_attempt in select * from public.provider_attempts where operation_id=p_operation_id and state='settled'
    and not exists(select 1 from public.chat_settlements cs where cs.attempt_id=provider_attempts.id)
    order by id loop
    v_raw:=coalesce(v_attempt.effective_cost_units,0);
    v_debit:=ceil(v_raw*v_op.chat_rate_multiplier)::bigint;
    v_margin:=v_debit-v_raw;
    v_platform:=round(v_margin*0.15)::bigint;
    v_expert:=v_margin-v_platform;
    update public.wallets set balance_units=balance_units-v_margin where identity_id=v_op.identity_id returning balance_units into v_hirer_balance;
    update public.ledger set amount_units=-v_debit,balance_after_units=v_hirer_balance,
      ref_type=case when v_conversation_id is null then null else 'conversation' end,
      ref_id=v_conversation_id
      where attempt_id=v_attempt.id and identity_id=v_op.identity_id and kind='debit';
    if v_expert>0 then
      update public.wallets set balance_units=balance_units+v_expert where identity_id=v_owner returning balance_units into v_expert_balance;
      insert into public.ledger(id,identity_id,operation_id,attempt_id,request_key,kind,amount_units,balance_after_units,purpose,ref_type,ref_id)
        values('led_'||gen_random_uuid()::text,v_owner,p_operation_id,v_attempt.id,'earnings:'||v_attempt.id,
          'earnings',v_expert,v_expert_balance,'chat',
          case when v_conversation_id is null then null else 'conversation' end,v_conversation_id);
    end if;
    insert into public.ledger(id,identity_id,operation_id,attempt_id,request_key,kind,amount_units,purpose,ref_type,ref_id)
      values('led_'||gen_random_uuid()::text,null,p_operation_id,v_attempt.id,'cost:'||v_attempt.id,
        'platform_cost',v_raw,'chat',case when v_conversation_id is null then null else 'conversation' end,v_conversation_id);
    insert into public.ledger(id,identity_id,operation_id,attempt_id,request_key,kind,amount_units,purpose,ref_type,ref_id)
      values('led_'||gen_random_uuid()::text,null,p_operation_id,v_attempt.id,'margin:'||v_attempt.id,
        'platform_margin',v_platform,'chat',case when v_conversation_id is null then null else 'conversation' end,v_conversation_id);
    insert into public.chat_settlements(attempt_id,operation_id,raw_units,hirer_debit_units,platform_margin_units,expert_credit_units)
      values(v_attempt.id,p_operation_id,v_raw,v_debit,v_platform,v_expert);
    update public.operations set actual_units=actual_units+v_margin where id=p_operation_id;
  end loop;
end $$;

alter function public.settle_operation(text) rename to settle_operation_raw;
create function public.settle_operation(p_operation_id text) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare v_result jsonb;
begin
  v_result:=public.settle_operation_raw(p_operation_id);
  perform public.apply_chat_settlements(p_operation_id);
  select public.billing_operation_json(o) into v_result from public.operations o where id=p_operation_id;
  return v_result;
end $$;

alter function public.reconcile_operation(text,jsonb) rename to reconcile_operation_raw;
create function public.reconcile_operation(p_operation_id text,p_evidence jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare v_result jsonb;
begin
  v_result:=public.reconcile_operation_raw(p_operation_id,p_evidence);
  perform public.apply_chat_settlements(p_operation_id);
  select public.billing_operation_json(o) into v_result from public.operations o where id=p_operation_id;
  return v_result;
end $$;

revoke all on public.conversation_attachments,public.chat_settlements from public,anon,authenticated;
grant all on public.conversation_attachments,public.chat_settlements to service_role;
revoke execute on function public.active_agent_chunk_count(text),public.set_agent_rate(text,text,numeric),public.set_agent_published(text,text,boolean,boolean),
  public.create_hirer_conversation(text,text,text,text),public.reserve_operation_raw(text,text,text,text,text,text,text,bigint,bigint,text,bigint),
  public.apply_chat_settlements(text),public.settle_operation_raw(text),public.reconcile_operation_raw(text,jsonb)
  from public,anon,authenticated;
grant execute on function public.active_agent_chunk_count(text),public.set_agent_rate(text,text,numeric),public.set_agent_published(text,text,boolean,boolean),
  public.create_hirer_conversation(text,text,text,text),public.reserve_operation(text,text,text,text,text,text,text,bigint,bigint,text,bigint),
  public.settle_operation(text),public.reconcile_operation(text,jsonb) to service_role;
revoke execute on function public.reserve_operation(text,text,text,text,text,text,text,bigint,bigint,text,bigint),
  public.settle_operation(text),public.reconcile_operation(text,jsonb) from public,anon,authenticated;
commit;
