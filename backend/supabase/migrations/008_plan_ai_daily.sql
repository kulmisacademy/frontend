-- Per-plan daily AI cap (UTC day). When ai_daily_limit is set, that cap applies per day.
-- When ai_daily_limit is null, existing ai_limit is a lifetime total (unchanged behavior).
alter table public.subscription_plans
  add column if not exists ai_daily_limit int;

alter table public.stores
  add column if not exists ai_generations_daily_utc_date date,
  add column if not exists ai_generations_daily_used integer not null default 0;

-- Free tier: 1 AI generation per UTC day (common SaaS pattern).
update public.subscription_plans
set ai_daily_limit = 1
where slug = 'free' and ai_daily_limit is null;

-- Daily cap replaces lifetime total for Free (avoid double-counting semantics).
update public.subscription_plans
set ai_limit = null
where slug = 'free';
