-- Store system: slug, banner, live by default, products, orders

alter table public.stores
  add column if not exists slug text;

alter table public.stores
  add column if not exists banner_url text;

alter table public.stores
  add column if not exists description text;

alter table public.stores
  add column if not exists whatsapp_phone text;

-- Unique slug (nullable first — backfill then set not null in app or second migration)
create unique index if not exists stores_slug_unique on public.stores (slug) where slug is not null;

-- New stores go live immediately
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
