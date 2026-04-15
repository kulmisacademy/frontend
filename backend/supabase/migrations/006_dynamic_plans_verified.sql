-- Dynamic subscription plans (limits) + time-boxed plan / verified badge.
-- Run after 004_subscription_plans.sql. Safe to re-run (IF NOT EXISTS / idempotent updates).

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

-- Legacy column: optional for new rows; requests use request_type + target_plan_id.
alter table public.subscription_requests
  drop constraint if exists subscription_requests_plan_requested_check;

alter table public.subscription_requests
  alter column plan_requested drop not null;
