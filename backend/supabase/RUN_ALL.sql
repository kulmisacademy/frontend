-- =============================================================================
-- LAAS24: run this ENTIRE script once in Supabase → SQL Editor → New query → Run
-- Creates users, stores, products, orders, storage bucket, and policies.
-- =============================================================================

-- --- 001_auth_and_stores.sql ---
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null check (role in ('customer', 'vendor', 'admin')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  store_name text not null,
  logo text,
  location jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_token_hash_idx on public.password_resets (token_hash);

insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public read store logos" on storage.objects;

create policy "Public read store logos"
on storage.objects for select
to public
using (bucket_id = 'store-logos');

-- --- 002_store_system.sql ---
alter table public.stores
  add column if not exists slug text;

alter table public.stores
  add column if not exists banner_url text;

alter table public.stores
  add column if not exists description text;

alter table public.stores
  add column if not exists whatsapp_phone text;

create unique index if not exists stores_slug_unique on public.stores (slug) where slug is not null;

alter table public.stores alter column status set default 'approved';

update public.stores set status = 'approved' where status = 'pending';

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  old_price numeric(12, 2),
  category text not null default 'General',
  images jsonb not null default '[]'::jsonb,
  video_url text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_store_id_idx on public.products (store_id);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  customer_name text,
  customer_phone text,
  message text,
  items_summary text,
  total numeric(12, 2) default 0,
  created_at timestamptz not null default now()
);

create index if not exists store_orders_store_id_idx on public.store_orders (store_id);

-- --- 003_products_features_location.sql ---
alter table public.products
  add column if not exists features jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists location text;

-- Product `description` is full text; `features` is a JSON array of strings (same usage as TEXT[] in the app).

-- --- 004_subscription_plans.sql ---
alter table public.stores
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium'));

alter table public.stores
  add column if not exists verified boolean not null default false;

alter table public.stores
  add column if not exists ai_generations_used integer not null default 0
    check (ai_generations_used >= 0);

update public.stores
  set plan = coalesce(plan, 'free'),
      verified = coalesce(verified, false),
      ai_generations_used = coalesce(ai_generations_used, 0)
where true;

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  plan_requested text not null check (plan_requested in ('premium')),
  contact_phone text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid references public.users (id) on delete set null
);

create index if not exists subscription_requests_store_id_idx
  on public.subscription_requests (store_id);

create index if not exists subscription_requests_status_idx
  on public.subscription_requests (status);

create index if not exists subscription_requests_created_idx
  on public.subscription_requests (created_at desc);

-- --- 005_catalog_performance_indexes.sql ---
-- Speeds up marketplace filters and sort (category, price, location text, store listings).
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_price on public.products (price);
create index if not exists idx_products_location on public.products (location)
  where location is not null and btrim(location) <> '';
create index if not exists idx_products_store_created on public.products (store_id, created_at desc);
create index if not exists idx_products_in_stock on public.products (in_stock)
  where in_stock = true;

-- --- 006_dynamic_plans_verified.sql ---
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_limit int not null check (product_limit >= 0),
  video_limit int not null check (video_limit >= 0),
  ai_limit int,
  is_system boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint subscription_plans_ai_limit_nonneg
    check (ai_limit is null or ai_limit >= 0)
);

insert into public.subscription_plans (name, slug, product_limit, video_limit, ai_limit, is_system, sort_order, active)
values
  ('Free', 'free', 20, 5, 1, true, 0, true),
  ('Premium', 'premium', 500, 100, null, true, 1, true)
on conflict (slug) do nothing;

alter table public.stores
  add column if not exists plan_id uuid references public.subscription_plans (id),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists verified_expires_at timestamptz;

update public.stores s
set plan_id = coalesce(
  s.plan_id,
  (select p.id from public.subscription_plans p where p.slug = case when s.plan = 'premium' then 'premium' else 'free' end limit 1)
)
where s.plan_id is null;

alter table public.subscription_requests
  add column if not exists request_type text default 'plan',
  add column if not exists target_plan_id uuid references public.subscription_plans (id),
  add column if not exists duration_months int not null default 1;

update public.subscription_requests
set request_type = coalesce(nullif(trim(request_type), ''), 'plan')
where request_type is null;

update public.subscription_requests r
set
  target_plan_id = coalesce(
    r.target_plan_id,
    (select id from public.subscription_plans where slug = 'premium' limit 1)
  ),
  duration_months = case when r.duration_months is null or r.duration_months < 1 then 1 else r.duration_months end
where r.target_plan_id is null and r.plan_requested = 'premium';

alter table public.subscription_requests
  alter column request_type set not null;

alter table public.subscription_requests
  drop constraint if exists subscription_requests_request_type_check;

alter table public.subscription_requests
  add constraint subscription_requests_request_type_check
  check (request_type in ('plan', 'verified'));

alter table public.stores
  drop constraint if exists stores_plan_check;

alter table public.subscription_requests
  drop constraint if exists subscription_requests_plan_requested_check;

alter table public.subscription_requests
  alter column plan_requested drop not null;

-- --- 007_subscription_plan_price.sql ---
alter table public.subscription_plans
  add column if not exists price numeric(12, 2) not null default 0
    check (price >= 0);

update public.subscription_plans set price = 0 where slug = 'free';

-- --- 008_plan_ai_daily.sql ---
alter table public.subscription_plans
  add column if not exists ai_daily_limit int;

alter table public.stores
  add column if not exists ai_generations_daily_utc_date date,
  add column if not exists ai_generations_daily_used integer not null default 0;

update public.subscription_plans
set ai_daily_limit = 1
where slug = 'free' and ai_daily_limit is null;

update public.subscription_plans
set ai_limit = null
where slug = 'free';

-- --- 009_orders_ratings_follows.sql ---
alter table public.store_orders
  add column if not exists product_id uuid references public.products (id) on delete set null;

alter table public.store_orders
  add column if not exists customer_id uuid references public.users (id) on delete set null;

create index if not exists store_orders_product_id_idx on public.store_orders (product_id)
  where product_id is not null;

create index if not exists store_orders_customer_id_idx on public.store_orders (customer_id)
  where customer_id is not null;

create table if not exists public.store_ratings (
  id uuid primary key default gen_random_uuid (),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  order_id uuid not null references public.store_orders (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  feedback text,
  created_at timestamptz not null default now (),
  constraint store_ratings_order_id_unique unique (order_id)
);

create index if not exists store_ratings_store_id_idx on public.store_ratings (store_id);
create index if not exists store_ratings_created_idx on public.store_ratings (created_at desc);

create table if not exists public.store_follows (
  id uuid primary key default gen_random_uuid (),
  store_id uuid not null references public.stores (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now (),
  constraint store_follows_store_customer_unique unique (store_id, customer_id)
);

create index if not exists store_follows_customer_id_idx on public.store_follows (customer_id);

-- --- 010_store_orders_products_json.sql ---
alter table public.store_orders
  add column if not exists products jsonb not null default '[]'::jsonb;

-- --- 011_order_code_and_status.sql ---
create table if not exists public.store_order_seq (
  store_id uuid primary key references public.stores (id) on delete cascade,
  n int not null default 0
);

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

update public.store_orders
set status = 'approved'
where status = 'completed';

alter table public.store_orders drop constraint if exists store_orders_status_check;

alter table public.store_orders
  add constraint store_orders_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.store_orders add column if not exists order_code text;

update public.store_orders
set order_code = 'L-' || replace(id::text, '-', '')
where order_code is null or trim(order_code) = '';

drop index if exists store_orders_order_code_uq;

create unique index if not exists store_orders_store_order_code_uq
  on public.store_orders (store_id, order_code);

alter table public.store_orders alter column order_code set not null;

-- --- 012_stores_plan_slug_dynamic.sql ---
alter table public.stores drop constraint if exists stores_plan_check;

-- --- 013_affiliate_system.sql ---
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  password text not null,
  ref_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists affiliates_ref_code_idx on public.affiliates (ref_code);

create table if not exists public.affiliate_system_settings (
  id text primary key default 'default' check (id = 'default'),
  commission_type text not null default 'percent'
    check (commission_type in ('percent', 'fixed')),
  commission_value numeric(12, 4) not null default 10
    check (commission_value >= 0),
  min_withdrawal numeric(12, 2) not null default 5 check (min_withdrawal >= 0),
  first_n_bonus_stores int not null default 5 check (first_n_bonus_stores >= 0),
  first_n_bonus_extra_percent numeric(12, 4) not null default 0
    check (first_n_bonus_extra_percent >= 0),
  updated_at timestamptz not null default now()
);

insert into public.affiliate_system_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.stores
  add column if not exists referred_by_affiliate_id uuid
    references public.affiliates (id) on delete set null;

create index if not exists stores_referred_by_affiliate_id_idx
  on public.stores (referred_by_affiliate_id)
  where referred_by_affiliate_id is not null;

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (store_id)
);

create index if not exists affiliate_referrals_affiliate_id_idx
  on public.affiliate_referrals (affiliate_id);
create index if not exists affiliate_referrals_status_idx
  on public.affiliate_referrals (status);

create table if not exists public.affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paid')),
  method text not null
    check (method in ('evc_plus', 'sahal', 'whatsapp')),
  phone text not null,
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists affiliate_withdrawals_affiliate_id_idx
  on public.affiliate_withdrawals (affiliate_id);
create index if not exists affiliate_withdrawals_status_idx
  on public.affiliate_withdrawals (status);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  store_id uuid references public.stores (id) on delete cascade,
  subscription_request_id uuid references public.subscription_requests (id) on delete set null,
  plan_slug text,
  plan_price numeric(12, 2),
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'requested', 'approved', 'paid')),
  withdrawal_id uuid references public.affiliate_withdrawals (id) on delete set null,
  source text not null default 'subscription'
    check (source in ('subscription', 'manual_bonus')),
  notes text,
  created_at timestamptz not null default now(),
  constraint affiliate_commissions_store_source_chk
    check (
      (source = 'manual_bonus' and store_id is null)
      or (source = 'subscription' and store_id is not null)
    )
);

create index if not exists affiliate_commissions_affiliate_id_idx
  on public.affiliate_commissions (affiliate_id);
create index if not exists affiliate_commissions_store_id_idx
  on public.affiliate_commissions (store_id)
  where store_id is not null;
create index if not exists affiliate_commissions_status_idx
  on public.affiliate_commissions (status);

create unique index if not exists affiliate_commissions_subscription_request_id_key
  on public.affiliate_commissions (subscription_request_id)
  where subscription_request_id is not null;

alter table public.affiliates enable row level security;
alter table public.affiliate_system_settings enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_withdrawals enable row level security;
alter table public.affiliate_commissions enable row level security;
