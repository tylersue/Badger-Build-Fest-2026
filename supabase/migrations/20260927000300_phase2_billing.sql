-- All money is BIGINT nanodollars. RPC calls are individual PostgreSQL transactions.
-- Lock order is UTC day (oldest first), wallet, operation. Provider calls never run here.
begin;
alter table public.provider_attempts
  add column price_version text not null default '2026-09-26-standard-v1',
  add column price_policy text not null default 'standard' check (price_policy = 'standard');

create or replace function public.price_attempt_units(p_model text, p_input integer, p_output integer,
  p_cache_read integer, p_cache_write integer, p_embedding integer, p_searches integer)
returns bigint language plpgsql immutable set search_path = pg_catalog, public as $$
declare v_input bigint; v_output bigint; v_read bigint; v_write bigint; v_embed bigint;
  v_numerator numeric; v_units numeric;
begin
  if least(p_input,p_output,p_cache_read,p_cache_write,p_embedding,p_searches) < 0 or
     p_input is null or p_output is null or p_cache_read is null or p_cache_write is null or p_embedding is null or p_searches is null
  then raise exception 'INVALID_USAGE'; end if;
  case p_model
    when 'claude-sonnet-5' then v_input:=2000000000; v_output:=10000000000; v_read:=200000000; v_write:=2500000000; v_embed:=0;
    when 'claude-opus-5-5' then v_input:=4000000000; v_output:=20000000000; v_read:=200000000; v_write:=5000000000; v_embed:=0;
    when 'claude-haiku-4-5' then v_input:=1000000000; v_output:=5000000000; v_read:=100000000; v_write:=1250000000; v_embed:=0;
    when 'voyage-4-lite' then v_input:=0; v_output:=0; v_read:=0; v_write:=0; v_embed:=20000000;
    else raise exception 'INVALID_MODEL';
  end case;
  v_numerator := p_input::numeric*v_input + p_output::numeric*v_output + p_cache_read::numeric*v_read
    + p_cache_write::numeric*v_write + p_embedding::numeric*v_embed;
  v_units := ceil(v_numerator / 1000000) + p_searches::numeric * 10000000;
  if v_units > 9223372036854775807 then raise exception 'INVALID_USAGE'; end if;
  return v_units::bigint;
end $$;

-- Force BIGINT fields to JSON decimal strings; PostgREST JSON numeric decoding
-- can otherwise silently lose precision beyond Number.MAX_SAFE_INTEGER.
create or replace function public.billing_operation_json(p_row public.operations)
returns jsonb language sql stable set search_path = pg_catalog, public as $$
  select to_jsonb(p_row) || jsonb_build_object('estimate_units',p_row.estimate_units::text,
    'held_units',p_row.held_units::text,'actual_units',p_row.actual_units::text,'max_units',p_row.max_units::text)
$$;
create or replace function public.billing_attempt_json(p_row public.provider_attempts)
returns jsonb language sql stable set search_path = pg_catalog, public as $$
  select to_jsonb(p_row) || jsonb_build_object('held_units',p_row.held_units::text,
    'gross_cost_units',p_row.gross_cost_units::text,'effective_cost_units',p_row.effective_cost_units::text)
$$;

create or replace function public.reserve_operation(p_id text, p_identity_id text, p_agent_id text,
  p_route text, p_request_key text, p_payload_hash text, p_purpose text,
  p_estimate_units bigint, p_max_units bigint, p_price_version text, p_cap_units bigint)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_day date := (now() at time zone 'UTC')::date; v_day_row public.daily_budgets%rowtype;
  v_wallet public.wallets%rowtype; v_existing public.operations%rowtype; v_owner text;
begin
  if p_id is null or p_id !~ '^op_[0-9a-f-]{36}$' or length(p_route) not between 1 and 120 or
     length(p_request_key) not between 1 and 200 or length(p_payload_hash) <> 64 or
     p_payload_hash !~ '^[0-9a-f]{64}$' or p_purpose not in ('interview','embedding','sandbox','chat','source','persona') or
     p_estimate_units is null or p_estimate_units < 0 or p_max_units is null or p_max_units <= 0 or
     p_estimate_units > p_max_units or p_cap_units is null or p_cap_units < 0 or
     p_price_version is null or p_price_version <> '2026-09-26-standard-v1'
  then raise exception 'INVALID_INPUT'; end if;
  select owner_id into v_owner from public.agents where id=p_agent_id;
  if v_owner is distinct from p_identity_id and p_purpose in ('interview','source','persona','sandbox')
    then raise exception 'NOT_OWNER'; end if;
  insert into public.daily_budgets(day,cap_units) values(v_day,p_cap_units) on conflict(day) do nothing;
  select * into strict v_day_row from public.daily_budgets where day=v_day for update;
  select * into v_wallet from public.wallets where identity_id=p_identity_id for update;
  if not found then raise exception 'INSUFFICIENT_CREDITS'; end if;
  select * into v_existing from public.operations where identity_id=p_identity_id and route=p_route and request_key=p_request_key for update;
  if found then
    if v_existing.payload_hash <> p_payload_hash or v_existing.agent_id <> p_agent_id or v_existing.purpose <> p_purpose
       then raise exception 'CONFLICT'; end if;
    return public.billing_operation_json(v_existing);
  end if;
  if v_wallet.balance_units - v_wallet.held_units < p_max_units then raise exception 'INSUFFICIENT_CREDITS'
    using detail=format('available=%s needed=%s', greatest(v_wallet.balance_units-v_wallet.held_units,0), p_max_units); end if;
  if v_day_row.spent_units + v_day_row.held_units + p_max_units > v_day_row.cap_units then raise exception 'DAILY_CAP'
    using detail=format('available=%s needed=%s', greatest(v_day_row.cap_units-v_day_row.spent_units-v_day_row.held_units,0), p_max_units); end if;
  update public.wallets set held_units=held_units+p_max_units where identity_id=p_identity_id;
  update public.daily_budgets set held_units=held_units+p_max_units where day=v_day;
  insert into public.operations(id,identity_id,agent_id,route,request_key,payload_hash,purpose,estimate_units,
    held_units,max_units,price_version,reservation_day)
  values(p_id,p_identity_id,p_agent_id,p_route,p_request_key,p_payload_hash,p_purpose,p_estimate_units,
    p_max_units,p_max_units,p_price_version,v_day) returning * into v_existing;
  return public.billing_operation_json(v_existing);
end $$;

create or replace function public.expand_reservation(p_operation_id text, p_additional_units bigint, p_cap_units bigint)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_op public.operations%rowtype; v_day public.daily_budgets%rowtype; v_wallet public.wallets%rowtype;
  v_unallocated bigint; v_migrate bigint; v_today date := (now() at time zone 'UTC')::date; v_initial_day date;
begin
  if p_additional_units is null or p_additional_units <= 0 then raise exception 'INVALID_INPUT'; end if;
  select * into v_op from public.operations where id=p_operation_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  v_initial_day:=v_op.reservation_day;
  insert into public.daily_budgets(day,cap_units) values(v_today,p_cap_units) on conflict(day) do nothing;
  perform 1 from public.daily_budgets where day in (v_today,v_op.reservation_day) order by day for update;
  select * into v_day from public.daily_budgets where day=v_today;
  select * into v_wallet from public.wallets where identity_id=v_op.identity_id for update;
  select * into v_op from public.operations where id=p_operation_id for update;
  if v_op.reservation_day<>v_initial_day then raise exception 'STALE_ESTIMATE'; end if;
  if v_op.state in ('settled','cancelled') then raise exception 'CONFLICT'; end if;
  if exists(select 1 from public.provider_attempts where operation_id=p_operation_id and state='prepared')
    then raise exception 'STALE_ESTIMATE'; end if;
  select v_op.held_units-coalesce(sum(held_units),0) into v_unallocated
    from public.provider_attempts where operation_id=p_operation_id and state<>'settled';
  if v_unallocated<0 then raise exception 'CONFLICT'; end if;
  v_migrate:=case when v_op.reservation_day<>v_today then v_unallocated else 0 end;
  if v_wallet.balance_units-v_wallet.held_units < p_additional_units then raise exception 'INSUFFICIENT_CREDITS'; end if;
  if v_day.spent_units+v_day.held_units+p_additional_units+v_migrate > v_day.cap_units then raise exception 'DAILY_CAP'; end if;
  update public.wallets set held_units=held_units+p_additional_units where identity_id=v_op.identity_id;
  if v_migrate>0 then update public.daily_budgets set held_units=held_units-v_migrate where day=v_op.reservation_day; end if;
  update public.daily_budgets set held_units=held_units+p_additional_units+v_migrate where day=v_today;
  update public.operations set held_units=held_units+p_additional_units,max_units=max_units+p_additional_units,
    reservation_day=v_today
    where id=p_operation_id returning * into v_op;
  return public.billing_operation_json(v_op);
end $$;

-- Journal one state transition. Prepared entries allocate a portion of the operation hold.
-- A dispatch moves that portion from reservation day to its real UTC dispatch day.
create or replace function public.record_provider_attempt(p_attempt jsonb, p_cap_units bigint)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_op public.operations%rowtype; v_old public.provider_attempts%rowtype; v_new public.provider_attempts%rowtype;
  v_day date := (now() at time zone 'UTC')::date; v_hold bigint; v_allocated bigint; v_cost bigint;
  v_state text := p_attempt->>'state'; v_id text := p_attempt->>'id'; v_op_id text := p_attempt->>'operationId';
  v_metadata jsonb := coalesce(p_attempt->'requestMetadata','{}'::jsonb); v_dispatch_day date; v_initial_day date;
begin
  if v_id is null or v_id !~ '^att_[0-9a-f-]{36}$' or v_op_id is null or
     v_state is null or v_state not in ('prepared','dispatched','completed','failed','unknown') or
     p_cap_units is null or p_cap_units < 0 or jsonb_typeof(v_metadata) <> 'object' or
     octet_length(v_metadata::text)>4096 then raise exception 'INVALID_INPUT'; end if;
  select * into v_op from public.operations where id=v_op_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  v_initial_day:=v_op.reservation_day;
  select dispatch_day into v_dispatch_day from public.provider_attempts where id=v_id;
  insert into public.daily_budgets(day,cap_units) values(v_day,p_cap_units) on conflict(day) do nothing;
  -- A transition can touch reservation and dispatch days; sorted lock order avoids deadlocks.
  perform 1 from public.daily_budgets where day in (v_day,v_op.reservation_day,v_dispatch_day) order by day for update;
  perform 1 from public.wallets where identity_id=v_op.identity_id for update;
  select * into v_op from public.operations where id=v_op_id for update;
  if v_op.reservation_day<>v_initial_day then raise exception 'STALE_ESTIMATE'; end if;
  select * into v_old from public.provider_attempts where id=v_id for update;
  if found and v_old.dispatch_day is distinct from v_dispatch_day then raise exception 'STALE_ESTIMATE'; end if;
  if v_state='prepared' then
    if found then
      if v_old.operation_id<>v_op_id or v_old.stage_key<>p_attempt->>'stageKey' or v_old.attempt<>(p_attempt->>'attempt')::integer
        or v_old.provider<>p_attempt->>'provider' or v_old.model<>p_attempt->>'model'
        or v_old.request_metadata<>v_metadata or
        (p_attempt->>'heldUnits' is not null and v_old.held_units<>(p_attempt->>'heldUnits')::bigint)
        then raise exception 'CONFLICT'; end if;
      return public.billing_attempt_json(v_old);
    end if;
    if v_op.state in ('settled','cancelled') then raise exception 'CONFLICT'; end if;
    v_hold := coalesce((p_attempt->>'heldUnits')::bigint,
      v_op.held_units-(select coalesce(sum(held_units),0) from public.provider_attempts where operation_id=v_op_id and state<>'settled'));
    select coalesce(sum(held_units),0) into v_allocated from public.provider_attempts where operation_id=v_op_id and state<>'settled';
    if v_hold is null or v_hold <= 0 then raise exception 'INVALID_INPUT'; end if;
    if v_allocated+v_hold>v_op.held_units then raise exception 'INSUFFICIENT_CREDITS'
      using detail=format('available=%s needed=%s', greatest(v_op.held_units-v_allocated,0), v_hold); end if;
    insert into public.provider_attempts(id,operation_id,stage_key,attempt,provider,model,state,held_units,request_metadata,price_version,price_policy)
    values(v_id,v_op_id,p_attempt->>'stageKey',(p_attempt->>'attempt')::integer,p_attempt->>'provider',
      p_attempt->>'model','prepared',v_hold,v_metadata,v_op.price_version,'standard') returning * into v_new;
    return public.billing_attempt_json(v_new);
  end if;
  if not found or v_old.operation_id<>v_op_id then raise exception 'CONFLICT'; end if;
  if v_old.state=v_state then
    if v_state='completed' and
      (v_old.input_tokens is distinct from coalesce((p_attempt->>'inputTokens')::integer,0) or
       v_old.output_tokens is distinct from coalesce((p_attempt->>'outputTokens')::integer,0) or
       v_old.cache_read_tokens is distinct from coalesce((p_attempt->>'cacheReadTokens')::integer,0) or
       v_old.cache_write_tokens is distinct from coalesce((p_attempt->>'cacheWriteTokens')::integer,0) or
       v_old.embedding_tokens is distinct from coalesce((p_attempt->>'embeddingTokens')::integer,0) or
       v_old.successful_search_count is distinct from coalesce((p_attempt->>'successfulSearchCount')::integer,0))
      then raise exception 'CONFLICT'; end if;
    if v_state='dispatched' and v_old.provider_request_id is distinct from nullif(p_attempt->>'providerRequestId','')
      then raise exception 'CONFLICT'; end if;
    return public.billing_attempt_json(v_old);
  end if;
  if (v_old.state='prepared' and v_state not in ('dispatched','failed')) or
     (v_old.state='dispatched' and v_state not in ('completed','failed','unknown')) or
     (v_old.state='unknown' and v_state not in ('completed','failed')) or
     v_old.state in ('completed','failed','settled') then raise exception 'CONFLICT'; end if;
  if v_state='dispatched' then
    if v_day<>v_op.reservation_day then
      if (select spent_units+held_units+v_old.held_units>cap_units from public.daily_budgets where day=v_day)
        then raise exception 'DAILY_CAP'; end if;
      update public.daily_budgets set held_units=held_units-v_old.held_units where day=v_op.reservation_day;
      update public.daily_budgets set held_units=held_units+v_old.held_units where day=v_day;
    end if;
    update public.provider_attempts set state='dispatched',dispatch_day=v_day,
      provider_request_id=nullif(p_attempt->>'providerRequestId','') where id=v_id returning * into v_new;
    update public.operations set state='running' where id=v_op_id;
  elsif v_state='unknown' then
    update public.provider_attempts set state='unknown',provider_request_id=coalesce(nullif(p_attempt->>'providerRequestId',''),provider_request_id)
      where id=v_id returning * into v_new;
    update public.operations set state='unknown' where id=v_op_id;
  elsif v_state='completed' then
    if p_attempt->>'inputTokens' is null or p_attempt->>'outputTokens' is null or
       p_attempt->>'cacheReadTokens' is null or p_attempt->>'cacheWriteTokens' is null or
       p_attempt->>'embeddingTokens' is null or p_attempt->>'successfulSearchCount' is null
      then raise exception 'UNKNOWN_USAGE'; end if;
    v_cost := public.price_attempt_units(v_old.model,coalesce((p_attempt->>'inputTokens')::integer,0),
      coalesce((p_attempt->>'outputTokens')::integer,0),coalesce((p_attempt->>'cacheReadTokens')::integer,0),
      coalesce((p_attempt->>'cacheWriteTokens')::integer,0),coalesce((p_attempt->>'embeddingTokens')::integer,0),
      coalesce((p_attempt->>'successfulSearchCount')::integer,0));
    update public.provider_attempts set state='completed',
      input_tokens=coalesce((p_attempt->>'inputTokens')::integer,0),output_tokens=coalesce((p_attempt->>'outputTokens')::integer,0),
      cache_read_tokens=coalesce((p_attempt->>'cacheReadTokens')::integer,0),
      cache_write_tokens=coalesce((p_attempt->>'cacheWriteTokens')::integer,0),
      embedding_tokens=coalesce((p_attempt->>'embeddingTokens')::integer,0),
      successful_search_count=coalesce((p_attempt->>'successfulSearchCount')::integer,0),
      gross_cost_units=v_cost,effective_cost_units=v_cost,latency_ms=(p_attempt->>'latencyMs')::integer,
      provider_request_id=coalesce(nullif(p_attempt->>'providerRequestId',''),provider_request_id)
      where id=v_id returning * into v_new;
  else
    -- Failed after dispatch is still ambiguous unless zero usage is proven by evidence.
    if v_old.dispatch_day is not null then raise exception 'UNKNOWN_USAGE'; end if;
    update public.provider_attempts set state='failed' where id=v_id returning * into v_new;
  end if;
  return public.billing_attempt_json(v_new);
end $$;

create or replace function public.settle_operation(p_operation_id text)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_op public.operations%rowtype; v_wallet public.wallets%rowtype; v_attempt public.provider_attempts%rowtype;
  v_day date; v_total bigint := 0; v_unallocated bigint; v_unknown boolean; v_initial_day date;
begin
  select * into v_op from public.operations where id=p_operation_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  v_initial_day:=v_op.reservation_day;
  perform 1 from public.daily_budgets where day in
    (select reservation_day from public.operations where id=p_operation_id union
     select dispatch_day from public.provider_attempts where operation_id=p_operation_id and dispatch_day is not null)
    order by day for update;
  select * into v_wallet from public.wallets where identity_id=v_op.identity_id for update;
  select * into v_op from public.operations where id=p_operation_id for update;
  if v_op.reservation_day<>v_initial_day then raise exception 'STALE_ESTIMATE'; end if;
  if v_op.state='cancelled' then raise exception 'CONFLICT'; end if;
  for v_attempt in select * from public.provider_attempts where operation_id=p_operation_id
    and state in ('completed','failed') order by id for update loop
    v_day := coalesce(v_attempt.dispatch_day,v_op.reservation_day);
    if v_attempt.state='completed' then
      v_total := v_attempt.effective_cost_units;
      if v_total is null then raise exception 'UNKNOWN_USAGE'; end if;
    else v_total := 0; end if;
    update public.wallets set balance_units=balance_units-v_total,held_units=held_units-v_attempt.held_units
      where identity_id=v_op.identity_id returning * into v_wallet;
    update public.daily_budgets set held_units=held_units-v_attempt.held_units,spent_units=spent_units+v_total where day=v_day;
    if v_total>0 then
      insert into public.ledger(id,identity_id,operation_id,attempt_id,request_key,kind,amount_units,balance_after_units,purpose)
      values('led_'||gen_random_uuid()::text,v_op.identity_id,p_operation_id,v_attempt.id,
        'usage:'||v_attempt.id,'debit',-v_total,v_wallet.balance_units,v_op.purpose);
    end if;
    update public.provider_attempts set state='settled',held_units=0 where id=v_attempt.id;
    update public.operations set held_units=held_units-v_attempt.held_units,actual_units=coalesce(actual_units,0)+v_total where id=p_operation_id;
  end loop;
  select * into v_op from public.operations where id=p_operation_id for update;
  select exists(select 1 from public.provider_attempts where operation_id=p_operation_id and state in ('dispatched','unknown')) into v_unknown;
  if not exists(select 1 from public.provider_attempts where operation_id=p_operation_id and state='prepared') then
    select v_op.held_units-coalesce(sum(held_units),0) into v_unallocated
      from public.provider_attempts where operation_id=p_operation_id and state in ('dispatched','unknown');
    if v_unallocated<0 then raise exception 'CONFLICT'; end if;
    if v_unallocated>0 then
      -- Only surplus unrelated to an unfinished dispatch may be released.
      update public.wallets set held_units=held_units-v_unallocated where identity_id=v_op.identity_id;
      update public.daily_budgets set held_units=held_units-v_unallocated where day=v_op.reservation_day;
      update public.operations set held_units=held_units-v_unallocated where id=p_operation_id returning * into v_op;
    end if;
  end if;
  if v_unknown then
    update public.operations set state='unknown' where id=p_operation_id returning * into v_op;
  elsif v_op.held_units=0 then
    update public.operations set state='settled',actual_units=coalesce(actual_units,0) where id=p_operation_id returning * into v_op;
  end if;
  return public.billing_operation_json(v_op);
end $$;

-- Evidence is an explicit operator record. The only zero-cost release path is
-- a prepared attempt with no dispatch, or a signed-off proof of no provider dispatch.
create table public.reconciliation_evidence (
  id text primary key, operation_id text not null references public.operations(id),
  attempt_id text references public.provider_attempts(id), action text not null
    check(action in ('prove_undispatched','record_usage')),
  note text not null check(length(note) between 12 and 2000),
  recorded_by text not null check(length(recorded_by) between 2 and 120),
  usage jsonb, created_at timestamptz not null default now(), unique(attempt_id,action)
);
create or replace function public.reconcile_operation(p_operation_id text, p_evidence jsonb)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_op public.operations%rowtype; v_attempt public.provider_attempts%rowtype; v_item jsonb; v_action text;
  v_cost bigint; v_day date; v_wallet public.wallets%rowtype; v_unallocated bigint; v_initial_day date;
begin
  if jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence)=0 then raise exception 'INVALID_EVIDENCE'; end if;
  select * into v_op from public.operations where id=p_operation_id;
  if not found then raise exception 'INVALID_INPUT'; end if;
  v_initial_day:=v_op.reservation_day;
  perform 1 from public.daily_budgets where day in
    (select reservation_day from public.operations where id=p_operation_id union
     select dispatch_day from public.provider_attempts where operation_id=p_operation_id and dispatch_day is not null)
    order by day for update;
  select * into v_wallet from public.wallets where identity_id=v_op.identity_id for update;
  select * into v_op from public.operations where id=p_operation_id for update;
  if v_op.reservation_day<>v_initial_day then raise exception 'STALE_ESTIMATE'; end if;
  for v_item in select value from jsonb_array_elements(p_evidence) loop
    v_action := v_item->>'action';
    if v_action not in ('prove_undispatched','record_usage') or length(v_item->>'note')<12 or
       length(v_item->>'recordedBy')<2 then raise exception 'INVALID_EVIDENCE'; end if;
    select * into v_attempt from public.provider_attempts where id=v_item->>'attemptId' and operation_id=p_operation_id for update;
    if not found then raise exception 'INVALID_EVIDENCE'; end if;
    if v_attempt.state='settled' then continue; end if;
    if v_action='prove_undispatched' then
      if v_attempt.state not in ('prepared','unknown','dispatched') then raise exception 'CONFLICT'; end if;
      v_cost:=0;
    else
      if v_attempt.state not in ('dispatched','unknown') or jsonb_typeof(v_item->'usage')<>'object'
        then raise exception 'INVALID_EVIDENCE'; end if;
      if v_item->'usage'->>'inputTokens' is null or v_item->'usage'->>'outputTokens' is null or
         v_item->'usage'->>'cacheReadTokens' is null or v_item->'usage'->>'cacheWriteTokens' is null or
         v_item->'usage'->>'embeddingTokens' is null or v_item->'usage'->>'successfulSearchCount' is null
        then raise exception 'INVALID_EVIDENCE'; end if;
      v_cost:=public.price_attempt_units(v_attempt.model,coalesce((v_item->'usage'->>'inputTokens')::integer,0),
        coalesce((v_item->'usage'->>'outputTokens')::integer,0),
        coalesce((v_item->'usage'->>'cacheReadTokens')::integer,0),
        coalesce((v_item->'usage'->>'cacheWriteTokens')::integer,0),
        coalesce((v_item->'usage'->>'embeddingTokens')::integer,0),
        coalesce((v_item->'usage'->>'successfulSearchCount')::integer,0));
    end if;
    insert into public.reconciliation_evidence(id,operation_id,attempt_id,action,note,recorded_by,usage)
    values('rec_'||gen_random_uuid()::text,p_operation_id,v_attempt.id,v_action,v_item->>'note',v_item->>'recordedBy',v_item->'usage');
    v_day:=coalesce(v_attempt.dispatch_day,v_op.reservation_day);
    update public.wallets set balance_units=balance_units-v_cost,held_units=held_units-v_attempt.held_units
      where identity_id=v_op.identity_id returning * into v_wallet;
    update public.daily_budgets set held_units=held_units-v_attempt.held_units,spent_units=spent_units+v_cost where day=v_day;
    if v_cost>0 then
      insert into public.ledger(id,identity_id,operation_id,attempt_id,request_key,kind,amount_units,balance_after_units,purpose,note)
      values('led_'||gen_random_uuid()::text,v_op.identity_id,p_operation_id,v_attempt.id,
        'usage:'||v_attempt.id,'debit',-v_cost,v_wallet.balance_units,v_op.purpose,'operator reconciled');
    end if;
    update public.provider_attempts set state='settled',held_units=0,gross_cost_units=v_cost,effective_cost_units=v_cost,
      input_tokens=case when v_action='record_usage' then coalesce((v_item->'usage'->>'inputTokens')::integer,0) else null end,
      output_tokens=case when v_action='record_usage' then coalesce((v_item->'usage'->>'outputTokens')::integer,0) else null end,
      cache_read_tokens=case when v_action='record_usage' then coalesce((v_item->'usage'->>'cacheReadTokens')::integer,0) else null end,
      cache_write_tokens=case when v_action='record_usage' then coalesce((v_item->'usage'->>'cacheWriteTokens')::integer,0) else null end,
      embedding_tokens=case when v_action='record_usage' then coalesce((v_item->'usage'->>'embeddingTokens')::integer,0) else null end,
      successful_search_count=case when v_action='record_usage' then coalesce((v_item->'usage'->>'successfulSearchCount')::integer,0) else null end
      where id=v_attempt.id;
    update public.operations set held_units=held_units-v_attempt.held_units,actual_units=coalesce(actual_units,0)+v_cost where id=p_operation_id;
  end loop;
  select * into v_op from public.operations where id=p_operation_id for update;
  if not exists(select 1 from public.provider_attempts where operation_id=p_operation_id and state='prepared') then
    select v_op.held_units-coalesce(sum(held_units),0) into v_unallocated
      from public.provider_attempts where operation_id=p_operation_id and state in ('dispatched','unknown');
    if v_unallocated<0 then raise exception 'CONFLICT'; end if;
    if v_unallocated>0 then
      update public.wallets set held_units=held_units-v_unallocated where identity_id=v_op.identity_id;
      update public.daily_budgets set held_units=held_units-v_unallocated where day=v_op.reservation_day;
      update public.operations set held_units=held_units-v_unallocated where id=p_operation_id returning * into v_op;
    end if;
  end if;
  if not exists(select 1 from public.provider_attempts where operation_id=p_operation_id and state in ('dispatched','unknown'))
    and v_op.held_units=0 then update public.operations set state='settled' where id=p_operation_id returning * into v_op; end if;
  return public.billing_operation_json(v_op);
end $$;

-- Grants are server-selected (the client supplies kind/key only). Distinct click
-- keys are repeatable, while replaying a click has one ledger effect.
create or replace function public.grant_mock_credits(p_identity_id text, p_kind text, p_request_key text)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare v_wallet public.wallets%rowtype; v_grant bigint; v_existing public.ledger%rowtype;
begin
  if p_identity_id not in ('maria','sam') then raise exception 'NOT_OWNER'; end if;
  if p_kind='subscription' then v_grant:=20000000000;
  elsif p_kind='pack' then v_grant:=10000000000;
  else raise exception 'INVALID_INPUT'; end if;
  if p_request_key is null or length(p_request_key) not between 1 and 200 then raise exception 'INVALID_INPUT'; end if;
  insert into public.wallets(identity_id) values(p_identity_id) on conflict do nothing;
  select * into v_wallet from public.wallets where identity_id=p_identity_id for update;
  select * into v_existing from public.ledger where identity_id=p_identity_id and request_key='grant:'||p_request_key;
  if found then
    if v_existing.kind<>p_kind then raise exception 'CONFLICT'; end if;
    return jsonb_build_object('balance_units',v_wallet.balance_units::text,'grant_units',v_existing.amount_units::text,'replayed',true);
  end if;
  update public.wallets set balance_units=balance_units+v_grant where identity_id=p_identity_id returning * into v_wallet;
  insert into public.ledger(id,identity_id,request_key,kind,amount_units,balance_after_units)
  values('led_'||gen_random_uuid()::text,p_identity_id,'grant:'||p_request_key,p_kind,v_grant,v_wallet.balance_units);
  return jsonb_build_object('balance_units',v_wallet.balance_units::text,'grant_units',v_grant::text,'replayed',false);
end $$;

revoke all on public.reconciliation_evidence from public, anon, authenticated;
grant all on public.reconciliation_evidence to service_role;
revoke execute on function public.price_attempt_units(text,integer,integer,integer,integer,integer,integer) from public, anon, authenticated;
revoke execute on function public.billing_operation_json(public.operations) from public, anon, authenticated;
revoke execute on function public.billing_attempt_json(public.provider_attempts) from public, anon, authenticated;
revoke execute on function public.reserve_operation(text,text,text,text,text,text,text,bigint,bigint,text,bigint) from public, anon, authenticated;
revoke execute on function public.expand_reservation(text,bigint,bigint) from public, anon, authenticated;
revoke execute on function public.record_provider_attempt(jsonb,bigint) from public, anon, authenticated;
revoke execute on function public.settle_operation(text) from public, anon, authenticated;
revoke execute on function public.reconcile_operation(text,jsonb) from public, anon, authenticated;
revoke execute on function public.grant_mock_credits(text,text,text) from public, anon, authenticated;
grant execute on function public.price_attempt_units(text,integer,integer,integer,integer,integer,integer) to service_role;
grant execute on function public.reserve_operation(text,text,text,text,text,text,text,bigint,bigint,text,bigint) to service_role;
grant execute on function public.expand_reservation(text,bigint,bigint) to service_role;
grant execute on function public.record_provider_attempt(jsonb,bigint) to service_role;
grant execute on function public.settle_operation(text) to service_role;
grant execute on function public.reconcile_operation(text,jsonb) to service_role;
grant execute on function public.grant_mock_credits(text,text,text) to service_role;
commit;
