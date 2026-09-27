-- One opening grant per seeded identity. The ledger insert and wallet update
-- share a transaction and a wallet row lock, so replay and interrupted calls
-- cannot grant twice or leave a ledger row without a matching balance.
begin;
create function public.bootstrap_seed_credit(p_identity_id text)
returns table(balance_units bigint, granted boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare current_balance bigint;
declare inserted_id text;
begin
  if not exists (select 1 from public.identities where id = p_identity_id and origin = 'fixture') then
    raise exception 'unknown fixture identity';
  end if;
  insert into public.wallets(identity_id, balance_units, held_units)
    values (p_identity_id, 0, 0) on conflict (identity_id) do nothing;
  select w.balance_units into current_balance from public.wallets w
    where w.identity_id = p_identity_id for update;
  insert into public.ledger(id, identity_id, request_key, kind, amount_units,
    balance_after_units, note, origin)
    values ('seed-opening:' || p_identity_id, p_identity_id, 'seed-opening-v1',
      'seed', 50000000000, current_balance + 50000000000,
      'Opening balance · 5,000 credits', 'fixture')
    on conflict (identity_id, request_key) do nothing returning id into inserted_id;
  if inserted_id is not null then
    update public.wallets w set balance_units = w.balance_units + 50000000000
      where w.identity_id = p_identity_id returning w.balance_units into current_balance;
  end if;
  return query select current_balance, inserted_id is not null;
end $$;
revoke execute on function public.bootstrap_seed_credit(text) from public, anon, authenticated;
grant execute on function public.bootstrap_seed_credit(text) to service_role;

-- Validated legacy text is committed with its receipt. Retrying an import
-- returns the original result; reusing a key for different data fails closed.
create function public.commit_legacy_draft(
  p_identity_id text, p_import_key text, p_payload_hash text,
  p_kind text, p_payload jsonb
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public as $$
declare prior public.seed_imports%rowtype;
declare result jsonb;
declare record_id text;
declare v_agent_id text;
declare field_name text;
declare field_value jsonb;
declare next_position integer;
begin
  if p_identity_id not in ('maria','sam') or length(p_import_key) > 128 or length(p_import_key) < 1
     or p_kind not in ('profile','persona','answer') or length(p_payload_hash) <> 64 then
    raise exception 'invalid legacy import';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_identity_id || ':' || p_import_key, 0));
  select * into prior from public.seed_imports
    where identity_id = p_identity_id and import_key = p_import_key;
  if found then
    if prior.payload_hash <> p_payload_hash then raise exception 'legacy import key conflict' using errcode = '23505'; end if;
    return prior.result;
  end if;

  if p_kind = 'profile' then
    if p_payload ?| array['ledger','balance','balanceCents','amountCents','wallet','usage','ownerId','identityId'] then
      raise exception 'financial or owner data forbidden';
    end if;
    update public.profiles set
      display_name = coalesce(p_payload->>'displayName', display_name),
      photo_url = case when p_payload ? 'photoUrl' then p_payload->>'photoUrl' else photo_url end,
      field = coalesce(p_payload->>'field', field),
      credentials = coalesce(p_payload->>'credentials', credentials),
      years_experience = case when p_payload ? 'yearsExperience' then (p_payload->>'yearsExperience')::integer else years_experience end,
      contact_url = coalesce(p_payload->>'contactUrl', contact_url),
      bio = coalesce(p_payload->>'bio', bio),
      location = coalesce(p_payload->>'location', location),
      origin = 'live'
    where identity_id = p_identity_id;
    if not found then raise exception 'profile unavailable'; end if;
    record_id := p_identity_id;
  else
    v_agent_id := p_payload->>'agentId';
    if not exists (select 1 from public.agents where id = v_agent_id and owner_id = p_identity_id
      and status = 'draft' and deleted_at is null) then
      raise exception 'draft agent unavailable';
    end if;
    if p_kind = 'persona' then
      for field_name, field_value in select key, value from jsonb_each(p_payload->'patch') loop
        if field_name not in ('name','category','headline','description','howIWork','always','never','exampleQuestions','greeting') then
          raise exception 'invalid persona field';
        end if;
        insert into public.persona_fields(agent_id,field,value,origin)
          values (v_agent_id,field_name,field_value,'expert')
          on conflict(agent_id,field) do update set value = excluded.value, origin = 'expert';
      end loop;
      record_id := v_agent_id;
    elsif p_kind = 'answer' then
      perform 1 from public.interview_sessions where agent_id = v_agent_id for update;
      if not found then raise exception 'interview session unavailable'; end if;
      select coalesce(max(position),0) + 1 into next_position from public.questions where agent_id = v_agent_id;
      record_id := 'legacy-answer:' || p_identity_id || ':' || p_import_key;
      insert into public.questions(id,agent_id,session_id,position,text,origin)
        values ('legacy-question:' || p_identity_id || ':' || p_import_key,
          v_agent_id, 'session:' || v_agent_id, next_position, p_payload->>'question', 'live');
      insert into public.answers(id,agent_id,question_id,state,origin)
        values (record_id, v_agent_id, 'legacy-question:' || p_identity_id || ':' || p_import_key,
          'captured','live');
      insert into public.answer_revisions(id,agent_id,answer_id,question_id,question,text,revision_number)
        values ('legacy-revision:' || p_identity_id || ':' || p_import_key,
          v_agent_id, record_id, 'legacy-question:' || p_identity_id || ':' || p_import_key,
          p_payload->>'question', p_payload->>'text', 1);
      update public.answers set current_revision_id = 'legacy-revision:' || p_identity_id || ':' || p_import_key
        where id = record_id;
    end if;
  end if;
  result := jsonb_build_object('key',p_import_key,'kind',p_kind,'id',record_id,'imported',true);
  insert into public.seed_imports(id,identity_id,import_key,payload_hash,result)
    values ('legacy-import:' || p_identity_id || ':' || p_import_key,
      p_identity_id,p_import_key,p_payload_hash,result);
  return result;
end $$;
revoke execute on function public.commit_legacy_draft(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.commit_legacy_draft(text,text,text,text,jsonb) to service_role;

-- A new builder must never observe a half-created agent without its persona
-- fields and interview session.
create function public.create_demo_agent(
  p_identity_id text, p_agent_id text, p_name text, p_category text
) returns text language plpgsql security definer
set search_path = pg_catalog, public as $$
declare field_name text;
begin
  if p_identity_id <> 'maria' or p_category not in ('health_pt','tax_finance','career_admissions')
    or length(p_name) < 1 or length(p_name) > 120
    or p_agent_id !~ '^agent-[0-9a-f-]{36}$' then
    raise exception 'invalid agent';
  end if;
  insert into public.agents(id,owner_id,slug,category,status,origin)
    values (p_agent_id,p_identity_id,p_agent_id,p_category,'draft','live');
  foreach field_name in array array['name','category','headline','description','howIWork','always','never','exampleQuestions','greeting'] loop
    insert into public.persona_fields(agent_id,field,value,origin)
      values (p_agent_id,field_name,
        case when field_name = 'name' then to_jsonb(p_name)
          when field_name = 'category' then to_jsonb(p_category)
          when field_name in ('always','never','exampleQuestions') then '[]'::jsonb
          else to_jsonb(''::text) end,
        case when field_name = 'name' then 'expert' else 'blank' end);
  end loop;
  insert into public.interview_sessions(id,agent_id,state)
    values ('session:' || p_agent_id,p_agent_id,'paused');
  return p_agent_id;
end $$;
revoke execute on function public.create_demo_agent(text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_demo_agent(text,text,text,text) to service_role;
commit;
