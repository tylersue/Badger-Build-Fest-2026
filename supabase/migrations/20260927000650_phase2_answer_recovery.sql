begin;

-- Serialize normal event/message writes with recovery on the operation row.
create function public.append_answer_event(p_agent_id text, p_message_id text, p_event jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_operation_id text := p_event->>'operationId';
begin
  perform 1 from public.operations where id=v_operation_id and agent_id=p_agent_id for update;
  if not found or exists(select 1 from public.message_events where operation_id=v_operation_id and type='done')
    then raise exception 'CONFLICT'; end if;
  insert into public.message_events(id,agent_id,message_id,operation_id,sequence,type,payload)
  values(p_event->>'eventId',p_agent_id,p_message_id,v_operation_id,
    (p_event->>'sequence')::integer,p_event->>'type',p_event);
end $$;

create function public.finish_answer_message(p_message_id text, p_value jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_operation_id text;
begin
  select operation_id into v_operation_id from public.messages where id=p_message_id and role='assistant';
  if v_operation_id is null then raise exception 'CONFLICT'; end if;
  perform 1 from public.operations where id=v_operation_id for update;
  if exists(select 1 from public.message_events where operation_id=v_operation_id and type='done')
    then raise exception 'CONFLICT'; end if;
  update public.messages set content=p_value->>'text',citations=p_value->'citations',
    retrieved=jsonb_build_object('chunks',p_value->'retrieved','gap',p_value->'gap'),
    tool_steps=p_value->'steps',charged_units=(p_value->>'chargedUnits')::bigint
  where id=p_message_id;
end $$;

-- A recovered operation cannot start or advance another paid provider stage.
-- Reconciliation may still move an ambiguous attempt to settled later.
create function public.fence_recovered_answer_attempt()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.state in ('prepared','dispatched','completed','unknown') and
    exists(select 1 from public.message_events where operation_id=new.operation_id and type='recovery-claim')
    then raise exception 'CONFLICT'; end if;
  return new;
end $$;
create trigger fence_recovered_answer_attempt before insert or update on public.provider_attempts
  for each row execute function public.fence_recovered_answer_attempt();

-- One transaction claims an abandoned answer, settles only journaled usage,
-- and writes its final transcript. The five-minute grace exceeds the bounded
-- provider stages; it prevents a concurrent retry from racing a live owner.
create function public.recover_answer_operation(p_operation_id text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_op public.operations%rowtype; v_message public.messages%rowtype;
  v_last_at timestamptz; v_last_seq integer; v_settled jsonb; v_wallet public.wallets%rowtype;
  v_text text; v_citations jsonb; v_chunks jsonb; v_gap text; v_steps jsonb;
  v_retrieved jsonb; v_cost text; v_event jsonb; v_seq integer; v_failure boolean;
begin
  select * into v_op from public.operations where id=p_operation_id;
  if not found then return false; end if;
  -- Keep the same budget -> wallet -> operation lock order as settle_operation.
  perform 1 from public.daily_budgets where day in
    (select reservation_day from public.operations where id=p_operation_id union
     select dispatch_day from public.provider_attempts where operation_id=p_operation_id and dispatch_day is not null)
    order by day for update;
  perform 1 from public.wallets where identity_id=v_op.identity_id for update;
  select * into v_op from public.operations where id=p_operation_id for update;
  select * into v_message from public.messages where operation_id=p_operation_id and role='assistant' for update;
  if not found then return false; end if;
  if exists(select 1 from public.message_events where operation_id=p_operation_id and type='done')
    then return false; end if;
  select max(sequence), max(created_at) into v_last_seq,v_last_at
    from public.message_events where operation_id=p_operation_id;
  select greatest(v_op.updated_at,v_message.updated_at,coalesce(v_last_at,v_op.created_at),
    coalesce((select max(updated_at) from public.provider_attempts where operation_id=p_operation_id),v_op.created_at))
    into v_last_at;
  if v_last_at > now()-interval '5 minutes' then return false; end if;

  -- A prepared attempt has no dispatch day: it is proven unused. Dispatched
  -- and unknown attempts remain held by settle_operation for reconciliation.
  update public.provider_attempts set state='failed' where operation_id=p_operation_id and state='prepared';
  v_settled:=public.settle_operation(p_operation_id);
  select * into v_wallet from public.wallets where identity_id=v_op.identity_id;
  v_cost:=case when v_settled->>'state'='settled' then v_settled->>'actual_units' else null end;

  select coalesce(string_agg(payload->>'delta','' order by sequence),'') into v_text
    from public.message_events where operation_id=p_operation_id and type='text-delta';
  select payload->'citations' into v_citations from public.message_events
    where operation_id=p_operation_id and type='citations' order by sequence desc limit 1;
  select payload->'chunks' into v_chunks from public.message_events
    where operation_id=p_operation_id and type='sources' order by sequence desc limit 1;
  select payload->>'message' into v_gap from public.message_events
    where operation_id=p_operation_id and type='knowledge-gap' order by sequence desc limit 1;
  select coalesce(jsonb_agg(t.step order by t.seq),'[]'::jsonb) into v_steps from
    (select distinct on (payload->'step'->>'id') payload->'step' as step,sequence as seq
      from public.message_events where operation_id=p_operation_id and type in ('tool-start','tool-update','tool-result')
      order by payload->'step'->>'id',sequence desc) t;
  v_citations:=coalesce(v_citations,'[]'::jsonb);
  v_retrieved:=jsonb_build_object('chunks',coalesce(v_chunks,'[]'::jsonb),'gap',v_gap);
  if v_message.content<>'' then
    v_text:=v_message.content;
    v_citations:=v_message.citations;
    v_retrieved:=v_message.retrieved;
    v_steps:=v_message.tool_steps;
  end if;
  -- The runtime emits a complete answer in one text event. A citation-bearing
  -- answer is safe only when its citation event was also durable.
  v_failure:=v_text='' or (v_text<>'I don''t have enough verified information to answer that yet.'
    and v_text<>v_message.content and jsonb_array_length(v_citations)=0);
  if v_failure then v_text:='This answer was interrupted before it could finish.'; v_citations:='[]'::jsonb; end if;
  update public.messages set content=v_text,citations=v_citations,retrieved=v_retrieved,
    tool_steps=v_steps,charged_units=v_cost::bigint where id=v_message.id;

  v_seq:=coalesce(v_last_seq,-1)+1;
  v_event:=jsonb_build_object('type','recovery-claim','operationId',p_operation_id,
    'eventId','evt_'||gen_random_uuid(),'sequence',v_seq);
  insert into public.message_events(id,agent_id,message_id,operation_id,sequence,type,payload)
    values(v_event->>'eventId',v_op.agent_id,v_message.id,p_operation_id,v_seq,'recovery-claim',v_event);
  v_seq:=v_seq+1;
  if v_failure then
    v_event:=jsonb_build_object('type','error','operationId',p_operation_id,'eventId','evt_'||gen_random_uuid(),
      'sequence',v_seq,'error',jsonb_build_object('code',case when v_cost is null then 'unknown_usage' else 'provider' end,
      'message','This answer was interrupted before it could finish.','retryable',false,'operationId',p_operation_id));
    insert into public.message_events(id,agent_id,message_id,operation_id,sequence,type,payload)
      values(v_event->>'eventId',v_op.agent_id,v_message.id,p_operation_id,v_seq,'error',v_event);
    v_seq:=v_seq+1;
  end if;
  v_event:=jsonb_build_object('type','cost','operationId',p_operation_id,'eventId','evt_'||gen_random_uuid(),
    'sequence',v_seq,'status',case when v_cost is null then 'pending' else 'settled' end,
    'estimateUnits',v_op.estimate_units::text,'chargedUnits',v_cost,
    'balanceUnits',v_wallet.balance_units::text,'heldUnits',v_wallet.held_units::text);
  insert into public.message_events(id,agent_id,message_id,operation_id,sequence,type,payload)
    values(v_event->>'eventId',v_op.agent_id,v_message.id,p_operation_id,v_seq,'cost',v_event);
  v_seq:=v_seq+1;
  v_event:=jsonb_build_object('type','done','operationId',p_operation_id,'eventId','evt_'||gen_random_uuid(),
    'sequence',v_seq,'messageId',v_message.id);
  insert into public.message_events(id,agent_id,message_id,operation_id,sequence,type,payload)
    values(v_event->>'eventId',v_op.agent_id,v_message.id,p_operation_id,v_seq,'done',v_event);
  return true;
end $$;

revoke execute on function public.append_answer_event(text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.finish_answer_message(text,jsonb) from public,anon,authenticated;
revoke execute on function public.recover_answer_operation(text) from public,anon,authenticated;
revoke execute on function public.fence_recovered_answer_attempt() from public,anon,authenticated;
grant execute on function public.append_answer_event(text,text,jsonb) to service_role;
grant execute on function public.finish_answer_message(text,jsonb) to service_role;
grant execute on function public.recover_answer_operation(text) to service_role;
commit;
