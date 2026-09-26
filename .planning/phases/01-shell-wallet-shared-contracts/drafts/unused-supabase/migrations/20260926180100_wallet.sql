-- Credit wallet: 1 credit = 1 cent. Balances only change inside the functions
-- below, which lock the wallet row, so a reservation and a settlement cannot
-- interleave. Hard stop at zero (D-10): reserve refuses when the estimate does
-- not fit, and settle never debits more than the balance.

create table public.wallets (
  identity_id uuid primary key references public.identities (id) on delete cascade,
  balance_cents int not null default 0 check (balance_cents >= 0),
  reserved_cents int not null default 0 check (reserved_cents >= 0),
  updated_at timestamptz not null default now()
);

create trigger wallets_updated_at before update on public.wallets for each row execute function public.set_updated_at();

-- ledger: every balance change, plus the platform's share of usage charges
-- (platform_cost / platform_margin rows have no identity).
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references public.identities (id) on delete cascade,
  kind text not null check (kind in ('seed', 'subscription', 'pack', 'debit', 'earnings', 'cashout', 'platform_cost', 'platform_margin')),
  amount_cents int not null,
  balance_after int,
  purpose text check (purpose in ('interview_turn', 'embedding', 'sandbox_message', 'chat_message')),
  ref_type text,
  ref_id uuid,
  note text,
  created_at timestamptz not null default now(),
  check ((kind in ('platform_cost', 'platform_margin')) = (identity_id is null))
);

create index ledger_identity_idx on public.ledger (identity_id, created_at desc);
create index ledger_ref_idx on public.ledger (ref_type, ref_id);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  purpose text not null check (purpose in ('interview_turn', 'embedding', 'sandbox_message', 'chat_message')),
  estimate_cents int not null check (estimate_cents > 0),
  status text not null default 'held' check (status in ('held', 'settled', 'released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references public.identities (id) on delete cascade,
  agent_id uuid references public.agents (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  purpose text not null,
  model text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cache_read_tokens int not null default 0,
  cost_cents numeric(10, 4) not null default 0,
  latency_ms int,
  reservation_id uuid references public.reservations (id) on delete set null,
  created_at timestamptz not null default now()
);

create index llm_usage_created_idx on public.llm_usage (created_at);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  ledger_id uuid references public.ledger (id),
  created_at timestamptz not null default now()
);

-- Reserve the estimated cost before a metered call. Raises INSUFFICIENT_CREDITS
-- when balance - reserved < estimate.
create or replace function public.wallet_reserve(p_identity uuid, p_purpose text, p_estimate_cents int)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  w public.wallets;
  r_id uuid;
begin
  if p_estimate_cents is null or p_estimate_cents <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_purpose not in ('interview_turn', 'embedding', 'sandbox_message', 'chat_message') then
    raise exception 'INVALID_PURPOSE';
  end if;

  select * into w from public.wallets where identity_id = p_identity for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if w.balance_cents - w.reserved_cents < p_estimate_cents then
    raise exception 'INSUFFICIENT_CREDITS'
      using detail = format('available=%s needed=%s', w.balance_cents - w.reserved_cents, p_estimate_cents);
  end if;

  insert into public.reservations (identity_id, purpose, estimate_cents)
  values (p_identity, p_purpose, p_estimate_cents)
  returning id into r_id;

  update public.wallets set reserved_cents = reserved_cents + p_estimate_cents where identity_id = p_identity;
  return r_id;
end;
$$;

-- Settle a reservation to the real cost after the call. Never debits more than
-- the balance; any shortfall is recorded in the ledger note.
create or replace function public.wallet_settle(
  p_reservation uuid,
  p_actual_cents int,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  r public.reservations;
  w public.wallets;
  v_debit int;
  v_shortfall int;
  v_balance int;
  v_note text;
begin
  if p_actual_cents is null or p_actual_cents < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into r from public.reservations where id = p_reservation for update;
  if not found or r.status <> 'held' then
    raise exception 'RESERVATION_NOT_HELD';
  end if;

  select * into w from public.wallets where identity_id = r.identity_id for update;

  v_debit := least(p_actual_cents, w.balance_cents);
  v_shortfall := p_actual_cents - v_debit;
  v_balance := w.balance_cents - v_debit;

  update public.wallets
  set balance_cents = v_balance,
      reserved_cents = greatest(reserved_cents - r.estimate_cents, 0)
  where identity_id = r.identity_id;

  if v_debit > 0 then
    v_note := p_note;
    if v_shortfall > 0 then
      v_note := coalesce(v_note, '') || format(' · shortfall %s credits', v_shortfall);
    end if;
    insert into public.ledger (identity_id, kind, amount_cents, balance_after, purpose, ref_type, ref_id, note)
    values (r.identity_id, 'debit', -v_debit, v_balance, r.purpose, p_ref_type, p_ref_id, v_note);
  end if;

  update public.reservations set status = 'settled', settled_at = now() where id = p_reservation;

  return jsonb_build_object('balance_cents', v_balance, 'debited_cents', v_debit, 'shortfall_cents', v_shortfall);
end;
$$;

-- Release a reservation without charging (the call failed).
create or replace function public.wallet_release(p_reservation uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  r public.reservations;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if not found or r.status <> 'held' then
    return;
  end if;
  update public.wallets
  set reserved_cents = greatest(reserved_cents - r.estimate_cents, 0)
  where identity_id = r.identity_id;
  update public.reservations set status = 'released', settled_at = now() where id = p_reservation;
end;
$$;

-- Add credits. Mock Subscribe and Buy pack call this and are repeatable (D-11).
create or replace function public.wallet_grant(
  p_identity uuid,
  p_kind text,
  p_amount_cents int,
  p_note text default null,
  p_ref_type text default null,
  p_ref_id uuid default null
)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_kind not in ('seed', 'subscription', 'pack', 'earnings') then
    raise exception 'INVALID_KIND';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.wallets (identity_id) values (p_identity) on conflict do nothing;
  perform 1 from public.wallets where identity_id = p_identity for update;

  update public.wallets set balance_cents = balance_cents + p_amount_cents
  where identity_id = p_identity
  returning balance_cents into v_balance;

  insert into public.ledger (identity_id, kind, amount_cents, balance_after, ref_type, ref_id, note)
  values (p_identity, p_kind, p_amount_cents, v_balance, p_ref_type, p_ref_id, p_note);

  return v_balance;
end;
$$;

-- Return the presentation to its seeded state: drop runtime wallet activity
-- (seed rows use ids with the 00000000-0000-4000-80 prefix) and recompute
-- balances from the remaining ledger.
create or replace function public.demo_reset()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ledger int;
  v_usage int;
  v_res int;
  v_pay int;
begin
  delete from public.payouts where id::text not like '00000000-0000-4000-80%';
  get diagnostics v_pay = row_count;
  delete from public.llm_usage where id::text not like '00000000-0000-4000-80%';
  get diagnostics v_usage = row_count;
  delete from public.reservations where id::text not like '00000000-0000-4000-80%';
  get diagnostics v_res = row_count;
  delete from public.ledger where id::text not like '00000000-0000-4000-80%';
  get diagnostics v_ledger = row_count;

  update public.wallets
  set balance_cents = coalesce((select sum(amount_cents) from public.ledger l where l.identity_id = wallets.identity_id), 0),
      reserved_cents = 0;

  return jsonb_build_object('ledger', v_ledger, 'llm_usage', v_usage, 'reservations', v_res, 'payouts', v_pay);
end;
$$;

revoke all on public.wallets, public.ledger, public.reservations, public.llm_usage, public.payouts from anon, authenticated;
revoke execute on function
  public.wallet_reserve(uuid, text, int),
  public.wallet_settle(uuid, int, text, uuid, text),
  public.wallet_release(uuid),
  public.wallet_grant(uuid, text, int, text, text, uuid),
  public.demo_reset()
from public, anon, authenticated;
grant execute on function
  public.wallet_reserve(uuid, text, int),
  public.wallet_settle(uuid, int, text, uuid, text),
  public.wallet_release(uuid),
  public.wallet_grant(uuid, text, int, text, text, uuid),
  public.demo_reset()
to service_role;
