-- Product-linked orders, logged-in customer id, ratings (per completed order), follows

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
