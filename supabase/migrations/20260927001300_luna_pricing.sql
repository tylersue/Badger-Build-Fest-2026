-- Extend the immutable standard-rate table for GPT-6 Luna and accept a new
-- operation price version. Existing operations, attempts, and unknown holds
-- retain their original version and state. The daily budget cap is unchanged.
begin;

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
    when 'gpt-6-luna' then v_input:=100000000; v_output:=500000000; v_read:=10000000; v_write:=125000000; v_embed:=0;
    when 'gpt-4.1-mini' then v_input:=400000000; v_output:=1600000000; v_read:=100000000; v_write:=400000000; v_embed:=0;
    when 'gpt-4.1' then v_input:=2000000000; v_output:=8000000000; v_read:=500000000; v_write:=2000000000; v_embed:=0;
    when 'text-embedding-3-small' then v_input:=0; v_output:=0; v_read:=0; v_write:=0; v_embed:=20000000;
    else raise exception 'INVALID_MODEL';
  end case;
  if p_model='gpt-6-luna' and p_input::bigint+p_cache_read::bigint+p_cache_write::bigint>272000 then
    v_input:=v_input*2; v_read:=v_read*2; v_write:=v_write*2;
    v_output:=v_output*3/2;
  end if;
  v_numerator := p_input::numeric*v_input + p_output::numeric*v_output + p_cache_read::numeric*v_read
    + p_cache_write::numeric*v_write + p_embedding::numeric*v_embed;
  v_units := ceil(v_numerator / 1000000) + p_searches::numeric * 10000000;
  if v_units > 9223372036854775807 then raise exception 'INVALID_USAGE'; end if;
  return v_units::bigint;
end $$;

create or replace function public.reserve_operation_raw(p_id text, p_identity_id text, p_agent_id text,
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
     p_price_version is null or p_price_version not in ('2026-09-26-standard-v1','2026-09-27-luna-v1')
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

commit;
