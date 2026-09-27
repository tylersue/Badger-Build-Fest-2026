-- Keep the category used by runtime/model selection and its persona ownership row
-- in one transaction. Every field write uses the same version guard.
begin;

create function public.persona_cas_field(
  p_agent_id text,
  p_field text,
  p_expected_version integer,
  p_value jsonb,
  p_origin text,
  p_evidence_revision_ids text[],
  p_pending_suggestion jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed integer;
  category_value text;
begin
  if p_expected_version < 0 or p_field not in
    ('name','category','headline','description','howIWork','always','never','exampleQuestions','greeting')
    or p_origin not in ('blank','interview','expert') then
    return false;
  end if;

  perform 1 from public.agents where id = p_agent_id and deleted_at is null for update;
  if not found then return false; end if;

  if p_field = 'category' then
    category_value := p_value #>> '{}';
    if category_value not in ('health_pt','tax_finance','career_admissions') then return false; end if;
  end if;

  if p_expected_version = 0 then
    insert into public.persona_fields (agent_id,field,value,origin,evidence_revision_ids,pending_suggestion)
    values (p_agent_id,p_field,p_value,p_origin,p_evidence_revision_ids,p_pending_suggestion)
    on conflict (agent_id,field) do nothing;
    get diagnostics changed = row_count;
  else
    update public.persona_fields set value = p_value, origin = p_origin,
      evidence_revision_ids = p_evidence_revision_ids, pending_suggestion = p_pending_suggestion
    where agent_id = p_agent_id and field = p_field and version = p_expected_version;
    get diagnostics changed = row_count;
  end if;

  if changed <> 1 then return false; end if;
  if p_field = 'category' then
    update public.agents set category = category_value where id = p_agent_id;
  end if;
  return true;
end $$;

revoke all on function public.persona_cas_field(text,text,integer,jsonb,text,text[],jsonb) from public, anon, authenticated;
grant execute on function public.persona_cas_field(text,text,integer,jsonb,text,text[],jsonb) to service_role;
commit;
