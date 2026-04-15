-- Cart-style orders: line items as JSON for WhatsApp / multi-item checkout

alter table public.store_orders
  add column if not exists products jsonb not null default '[]'::jsonb;
