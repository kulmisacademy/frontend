-- Run in Supabase SQL Editor (or supabase db push). Adjust schema if needed.

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

-- Public bucket for store logos (readable by URL). Service role uploads bypass RLS.
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public read store logos" on storage.objects;

create policy "Public read store logos"
on storage.objects for select
to public
using (bucket_id = 'store-logos');

-- Optional: seed an admin (set password hash via app or bcrypt tool — do not use a weak password)
-- insert into public.users (name, email, password, role, phone)
-- values ('Admin', 'admin@example.com', '$2a$12$...bcrypt...', 'admin', '+252000000000');
