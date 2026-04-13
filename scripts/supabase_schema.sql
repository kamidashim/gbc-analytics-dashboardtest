-- Run this in your Supabase SQL editor (Database → SQL Editor → New query)

create table if not exists orders (
  id            bigserial primary key,
  crm_id        text unique not null,
  first_name    text,
  last_name     text,
  phone         text,
  email         text,
  status        text default 'new',
  total_price   numeric(12, 2) default 0,
  city          text,
  utm_source    text,
  items_json    text,
  created_at    timestamptz default now()
);

-- Index for fast dashboard queries
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_status     on orders (status);

-- Enable Row Level Security (anonymous read-only for dashboard)
alter table orders enable row level security;

create policy "Public read-only" on orders
  for select using (true);
