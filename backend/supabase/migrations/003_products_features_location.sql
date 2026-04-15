alter table public.products
  add column if not exists features jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists location text;
