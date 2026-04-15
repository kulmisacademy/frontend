-- List price per subscription plan (admin-defined; billing integration optional).
alter table public.subscription_plans
  add column if not exists price numeric(12, 2) not null default 0
    check (price >= 0);

update public.subscription_plans set price = 0 where slug = 'free';
