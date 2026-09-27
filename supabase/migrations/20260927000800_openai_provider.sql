begin;

alter table public.provider_attempts drop constraint provider_attempts_provider_check;
alter table public.provider_attempts add constraint provider_attempts_provider_check
  check (provider in ('anthropic', 'voyage', 'openai'));

-- Existing model rates stay fixed. New OpenAI models use published standard rates
-- in the same nanodollar units as the application pricing table.
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
    when 'gpt-4.1-mini' then v_input:=400000000; v_output:=1600000000; v_read:=100000000; v_write:=400000000; v_embed:=0;
    when 'gpt-4.1' then v_input:=2000000000; v_output:=8000000000; v_read:=500000000; v_write:=2000000000; v_embed:=0;
    when 'text-embedding-3-small' then v_input:=0; v_output:=0; v_read:=0; v_write:=0; v_embed:=20000000;
    else raise exception 'INVALID_MODEL';
  end case;
  v_numerator := p_input::numeric*v_input + p_output::numeric*v_output + p_cache_read::numeric*v_read
    + p_cache_write::numeric*v_write + p_embedding::numeric*v_embed;
  v_units := ceil(v_numerator / 1000000) + p_searches::numeric * 10000000;
  if v_units > 9223372036854775807 then raise exception 'INVALID_USAGE'; end if;
  return v_units::bigint;
end $$;

-- Existing Voyage vectors have a different vector space even though both use
-- 1024 dimensions. New indexing uses the OpenAI default; old rows cannot be
-- retrieved until their source or answer is reindexed with OpenAI.
alter table public.chunks add column embedding_model text not null default 'voyage-4-lite';
alter table public.chunks alter column embedding_model set default 'text-embedding-3-small';
alter table public.chunks add constraint chunks_embedding_model_check
  check (embedding_model in ('voyage-4-lite', 'text-embedding-3-small'));

create or replace function public.active_agent_chunk_count(p_agent_id text) returns integer
language sql stable set search_path = pg_catalog, public as $$
  select count(*)::integer from public.chunks c where c.agent_id=p_agent_id
    and c.embedding_model='text-embedding-3-small' and (
    exists(select 1 from public.answers a where a.id=c.answer_id and a.deleted_at is null
      and a.indexed_revision_id=c.revision_id) or
    exists(select 1 from public.sources s where s.id=c.source_id and s.deleted_at is null
      and s.active_revision_id=c.revision_id));
$$;

create or replace function public.search_agent_knowledge(p_agent_id text, p_embedding extensions.vector(1024), p_k integer default 6)
returns table(id text,agent_id text,revision_id text,source_id text,source_type text,
  source_name text,content text,question text,page integer,heading_path text,score double precision)
language sql stable security definer set search_path = pg_catalog, public, extensions as $$
  select c.id,c.agent_id,c.revision_id,c.answer_id,'interview'::text,'Interview answers'::text,
    c.content,c.question,c.page,c.heading_path,1-(c.embedding <=> p_embedding) as score
  from public.chunks c join public.answers a on a.id=c.answer_id and a.agent_id=c.agent_id
  join public.answer_revisions r on r.id=c.revision_id and r.answer_id=a.id and r.agent_id=a.agent_id
  where c.agent_id=p_agent_id and c.embedding_model='text-embedding-3-small'
    and a.deleted_at is null and r.deleted_at is null and a.indexed_revision_id=c.revision_id
    and not exists(select 1 from public.answers parent where parent.id=a.parent_answer_id
      and parent.agent_id=a.agent_id and parent.deleted_at is not null)
  union all
  select c.id,c.agent_id,c.revision_id,c.source_id,'document'::text,s.name,
    c.content,c.question,c.page,c.heading_path,1-(c.embedding <=> p_embedding) as score
  from public.chunks c join public.sources s on s.id=c.source_id and s.agent_id=c.agent_id
  join public.source_revisions r on r.id=c.revision_id and r.source_id=s.id and r.agent_id=s.agent_id
  where c.agent_id=p_agent_id and c.embedding_model='text-embedding-3-small'
    and s.deleted_at is null and r.deleted_at is null and s.active_revision_id=c.revision_id
  order by score desc,id limit least(greatest(coalesce(p_k,6),1),12)
$$;

-- Do not advertise an expert whose published knowledge is still in the old
-- vector space. Existing conversations remain usable under Phase 3 rules.
update public.agents set status='unpublished'
where status='published' and public.active_agent_chunk_count(id) < 5;

commit;
