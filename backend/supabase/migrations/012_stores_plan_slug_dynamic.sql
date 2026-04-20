-- Allow any subscription_plans.slug on stores.plan (limits use plan_id).
-- 006 drops this constraint when applied; this migration is safe if already dropped.
alter table public.stores drop constraint if exists stores_plan_check;
