-- Per-store sequence for ORD-001, ORD-002, … and lifecycle: pending → approved | rejected

create table if not exists public.store_order_seq (
  store_id uuid primary key references public.stores (id) on delete cascade,
  n int not null default 0
);

-- Seed counters from existing order counts (so new codes continue sensibly)
insert into public.store_order_seq (store_id, n)
select store_id, count(*)::int
from public.store_orders
group by store_id
on conflict (store_id) do update set n = excluded.n;

create or replace function public.bump_store_order_seq(p_store_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  insert into public.store_order_seq (store_id, n)
  values (p_store_id, 1)
  on conflict (store_id) do update
    set n = store_order_seq.n + 1
  returning n into v;
  return v;
end;
$$;

revoke all on function public.bump_store_order_seq(uuid) from public;
grant execute on function public.bump_store_order_seq(uuid) to service_role;

-- Migrate legacy status
update public.store_orders
set status = 'approved'
where status = 'completed';

alter table public.store_orders drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Display code (unique across all orders)
alter table public.store_orders add column if not exists order_code text;

update public.store_orders
set order_code = 'L-' || replace(id::text, '-', '')
where order_code is null or trim(order_code) = '';

drop index if exists store_orders_order_code_uq;

create unique index if not exists store_orders_store_order_code_uq
  on public.store_orders (store_id, order_code);

alter table public.store_orders alter column order_code set not null;
