-- Subscription plans, verified stores, AI usage tracking, upgrade requests

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
