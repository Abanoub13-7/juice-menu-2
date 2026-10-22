-- juice-menu-faisel-st — 1/5 core schema: extension, tables, indexes, RLS,
-- trigger functions, triggers and table-level grants.
-- Reconstructed from the repository's SQL (supabase/migrations_legacy_reference/):
-- baseline_remote.sql + 20260914_order_item_notes + 20260915_categories_and_admin_cleanup.
-- Additive only: no DROP / TRUNCATE / DELETE statements. Contains NO data rows.

-- Supabase convention: extensions live in the "extensions" schema (already on every
-- function search_path below, so gen_random_bytes() resolves).
create extension if not exists "pgcrypto" with schema extensions;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid(),
  display_code text not null,
  status text not null default 'new',
  total_amount numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_display_code_key unique (display_code),
  constraint orders_public_token_key unique (public_token),
  constraint orders_status_check check (status in ('new', 'preparing', 'ready', 'completed')),
  constraint orders_total_amount_check check (total_amount >= 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_name_snapshot text not null,
  size text not null,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  subtotal numeric(10, 2) not null,
  notes text,
  constraint order_items_quantity_check check (quantity > 0 and quantity <= 50),
  constraint order_items_unit_price_check check (unit_price >= 0),
  constraint order_items_subtotal_check check (subtotal >= 0),
  constraint subtotal_matches_line check (subtotal = quantity * unit_price),
  constraint order_items_notes_length_check check (notes is null or char_length(notes) <= 500)
);

create table public.menu_catalog (
  product_id text not null,
  product_name text not null,
  size text not null,
  unit_price numeric(10, 2) not null,
  ingredients text,
  category_id text not null,
  category_name text not null,
  subcategory_id text,
  subcategory_name text,
  product_sort_order integer not null,
  size_sort_order integer not null,
  is_active boolean not null default true,
  product_is_active boolean not null default true,
  constraint menu_catalog_pkey primary key (product_id, size),
  constraint menu_catalog_unit_price_check check (unit_price >= 0)
);

create table public.menu_categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) > 0),
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create index idx_orders_public_token on public.orders (public_token);
create index idx_orders_status_created on public.orders (status, created_at desc);
create index idx_order_items_order_id on public.order_items (order_id);
create index idx_menu_catalog_active_order
  on public.menu_catalog (product_sort_order, size_sort_order)
  where is_active and product_is_active;

-- Row Level Security (never disabled).
alter table public.menu_catalog enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.menu_categories enable row level security;

-- Signed-in staff (authenticated) may read orders. Customers have NO direct
-- table access; they use the SECURITY DEFINER RPCs defined in the next migration.
create policy "authenticated can read orders"
  on public.orders for select to authenticated using (true);
create policy "authenticated can read order items"
  on public.order_items for select to authenticated using (true);
-- menu_catalog / menu_categories: intentionally NO policies (RPC-only access).
-- No INSERT / UPDATE / DELETE policy exists on any table.

-- Trigger functions and triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.enforce_status_progression()
returns trigger
language plpgsql
as $function$
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
$function$;

create or replace function public.recalc_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger trg_orders_status_progression
  before update of status on public.orders
  for each row execute function public.enforce_status_progression();

create trigger trg_order_items_recalc_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_total();


-- Table grants (effective state observed on the deployed project, plus menu_categories).
revoke all on public.menu_catalog, public.orders, public.order_items, public.menu_categories
  from public, anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant all on public.menu_catalog, public.orders, public.order_items, public.menu_categories to service_role;

-- Trigger functions have no meaning outside triggers; privilege state matches the deployed baseline.
grant execute on function public.set_updated_at() to public;
grant execute on function public.enforce_status_progression() to public;
grant execute on function public.recalc_order_total() to public;
