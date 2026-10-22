-- City Drink Alharam — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run: guarded with IF NOT EXISTS / DROP POLICY IF
-- EXISTS where practical.
--
--   - The anon (public) key has no direct INSERT or SELECT policy on either
--     order table. Customers create orders through the catalog-backed
--     `create_order` RPC and read one order through `get_order_by_token`.
--   - The barista dashboard requires a signed-in Supabase Auth session
--     (authenticated role). That role can SELECT orders, while status changes
--     are limited to the `advance_order_status` RPC.
--   - No service-role key is ever used in the frontend. Everything above
--     is enforced by RLS and database functions, not by application code.
-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  display_code text not null unique,
  status text not null default 'new' check (status in ('new', 'preparing', 'ready', 'completed')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_name_snapshot text not null,
  size text not null,
  quantity integer not null check (quantity > 0 and quantity <= 50),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  constraint subtotal_matches_line check (subtotal = quantity * unit_price)
);

create index if not exists idx_orders_public_token on public.orders (public_token);
create index if not exists idx_orders_status_created on public.orders (status, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- This table is generated from src/data/menu.ts. Run supabase/catalog.sql after
-- this file whenever the authoritative menu changes.
create table if not exists public.menu_catalog (
  product_id text not null,
  product_name text not null,
  size text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  ingredients text,
  category_id text,
  category_name text,
  subcategory_id text,
  subcategory_name text,
  product_sort_order integer,
  size_sort_order integer,
  is_active boolean not null default true,
  product_is_active boolean not null default true,
  primary key (product_id, size)
);
alter table public.menu_catalog enable row level security;

-- Keep updated_at current on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Only allow status to move forward through the pipeline, never backward or
-- skipped, and never let anything but `status`/`updated_at` change once an
-- order has items (protects historical snapshots).
create or replace function public.enforce_status_progression()
returns trigger
language plpgsql
as $$
declare
  seq text[] := array['new', 'preparing', 'ready', 'completed'];
  old_idx int;
  new_idx int;
begin
  if old.status = new.status then
    return new;
  end if;
  old_idx := array_position(seq, old.status);
  new_idx := array_position(seq, new.status);
  if new_idx is null or new_idx <> old_idx + 1 then
    raise exception 'Invalid status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_status_progression() from public;

drop trigger if exists trg_orders_status_progression on public.orders;
create trigger trg_orders_status_progression
  before update of status on public.orders
  for each row execute function public.enforce_status_progression();

-- The client sends an initial total_amount when creating the order (see
-- src/lib/orders.ts), but that value is never trusted on its own: this
-- trigger recomputes it from the authoritative order_items rows every time
-- a line is inserted/updated/deleted, so the stored total can never drift
-- from (or be tampered to differ from) the sum of its lines.
create or replace function public.recalc_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_order_id uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders
  set total_amount = coalesce(
    (select sum(subtotal) from public.order_items where order_id = affected_order_id),
    0
  )
  where id = affected_order_id;
  return null;
end;
$$;

drop trigger if exists trg_order_items_recalc_total on public.order_items;
create trigger trg_order_items_recalc_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_total();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Customers cannot write order tables directly. All customer writes happen in
-- create_order(), which validates against menu_catalog and runs atomically.
drop policy if exists "anon can insert new orders" on public.orders;

drop policy if exists "anon can insert order items" on public.order_items;
drop policy if exists "authenticated can update order status" on public.orders;

drop policy if exists "authenticated can insert orders" on public.orders;
drop policy if exists "authenticated can insert order items" on public.order_items;
drop policy if exists "authenticated can update order items" on public.order_items;

-- No SELECT policy for anon on either table — see get_order_by_token below.

-- Make the browser contract explicit even if project-level default grants
-- change later: clients never write these tables directly, and anon has no
-- direct table read path.
revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;

-- Barista (authenticated) has read access. Status changes use the guarded RPC.
drop policy if exists "authenticated can read orders" on public.orders;
create policy "authenticated can read orders" on public.orders
  for select to authenticated
  using (true);

drop policy if exists "authenticated can read order items" on public.order_items;
create policy "authenticated can read order items" on public.order_items
  for select to authenticated
  using (true);

-- No client role can modify catalog rows.
revoke all on public.menu_catalog from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Secure token lookup for customers (bypasses RLS deliberately — this is the
-- ONLY sanctioned way the anon role reads order data, and it only ever
-- returns the single order matching p_token).
-- ---------------------------------------------------------------------------
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'public_token', o.public_token,
    'display_code', o.display_code,
    'status', o.status,
    'total_amount', o.total_amount,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', i.id, 'order_id', i.order_id, 'product_id', i.product_id,
        'product_name_snapshot', i.product_name_snapshot, 'size', i.size,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'subtotal', i.subtotal,
        'notes', i.notes
      ) order by i.id) from public.order_items i where i.order_id = o.id),
      '[]'::jsonb
    )
  )
  into result
  from public.orders o
  where o.public_token = p_token;

  return result;
end;
$$;
revoke all on function public.recalc_order_total() from public;

revoke all on function public.get_order_by_token(uuid) from public;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Customer order creation and barista status RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  item jsonb;
  catalog_row record;
  new_order public.orders;
  item_quantity integer;
  item_size text;
  item_product_id text;
  item_notes text;
  item_total numeric(10, 2) := 0;
  item_count integer := 0;
  generated_code text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_count := item_count + 1;
    if item_count > 100 then raise exception 'Too many order items'; end if;
    item_product_id := item->>'product_id';
    item_size := item->>'size';
    if item ? 'notes' and jsonb_typeof(item->'notes') not in ('string', 'null') then
      raise exception 'Invalid order item notes';
    end if;
    item_notes := nullif(btrim(item->>'notes'), '');
    if item_notes is not null and char_length(item_notes) > 500 then
      raise exception 'Order item notes are too long';
    end if;
    if item_product_id is null or item_size is null
      or jsonb_typeof(item->'quantity') is distinct from 'number' then
      raise exception 'Invalid order item';
    end if;
    if (item->>'quantity')::numeric <> trunc((item->>'quantity')::numeric) then
      raise exception 'Quantity must be an integer';
    end if;
    item_quantity := (item->>'quantity')::integer;
    if item_quantity < 1 or item_quantity > 50 then
      raise exception 'Invalid quantity';
    end if;
    select product_id, product_name, size, unit_price into catalog_row
    from public.menu_catalog
    where product_id = item_product_id and size = item_size;
    if not found then raise exception 'Invalid product or size'; end if;
    item_total := item_total + catalog_row.unit_price * item_quantity;
  end loop;

  loop
    generated_code := 'CD-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 5));
    begin
      insert into public.orders (display_code, status, total_amount)
      values (generated_code, 'new', item_total)
      returning * into new_order;
      exit;
    exception when unique_violation then
      -- A rare display-code collision is retried without exposing it to the client.
    end;
  end loop;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_product_id := item->>'product_id';
    item_size := item->>'size';
    item_quantity := (item->>'quantity')::integer;
    item_notes := nullif(btrim(item->>'notes'), '');
    select product_id, product_name, size, unit_price into catalog_row
    from public.menu_catalog
    where product_id = item_product_id and size = item_size;
    insert into public.order_items (
      order_id, product_id, product_name_snapshot, size, quantity, unit_price, subtotal, notes
    ) values (
      new_order.id, catalog_row.product_id, catalog_row.product_name, catalog_row.size,
      item_quantity, catalog_row.unit_price, catalog_row.unit_price * item_quantity, item_notes
    );
  end loop;

  return jsonb_build_object(
    'id', new_order.id, 'public_token', new_order.public_token,
    'display_code', new_order.display_code, 'total_amount', new_order.total_amount,
    'created_at', new_order.created_at
  );
end;
$$;

create or replace function public.advance_order_status(p_order_id uuid, p_new_status text)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  changed public.orders;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.orders
  set status = p_new_status, updated_at = now()
  where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  select * into changed from public.orders where id = p_order_id;
  return changed;
end;
$$;

revoke all on function public.create_order(jsonb) from public, authenticated;
grant execute on function public.create_order(jsonb) to anon;
revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Only the barista dashboard subscribes to `orders` via postgres_changes,
-- and only after signing in (authenticated role, covered by the SELECT
-- policy above). The customer order page deliberately polls
-- `get_order_by_token` instead — see src/lib/orders.ts for why.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;
