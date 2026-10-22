-- Remote schema baseline for juice-menu.
-- Captured from the linked project with SELECT-only Supabase CLI queries on 2026-09-13.
-- This is a schema/state document, not a migration and not a data backup.
-- It intentionally contains no INSERT statements for menu_catalog, orders, or order_items.
-- Remote migration history is not reconstructed here.
-- Observed owner for the three tables and public functions: postgres.
-- Observed FORCE ROW LEVEL SECURITY state for the three tables: false.

create extension if not exists "pgcrypto";

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
  constraint order_items_quantity_check check (quantity > 0 and quantity <= 50),
  constraint order_items_unit_price_check check (unit_price >= 0),
  constraint order_items_subtotal_check check (subtotal >= 0),
  constraint subtotal_matches_line check (subtotal = quantity * unit_price)
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

create index idx_orders_public_token on public.orders (public_token);
create index idx_orders_status_created on public.orders (status, created_at desc);
create index idx_order_items_order_id on public.order_items (order_id);
create index idx_menu_catalog_active_order
  on public.menu_catalog (product_sort_order, size_sort_order)
  where is_active and product_is_active;

alter table public.menu_catalog enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "authenticated can read orders"
  on public.orders for select to authenticated using (true);

create policy "authenticated can read order items"
  on public.order_items for select to authenticated using (true);

-- Remote state has no policy on menu_catalog.
-- Remote state has no INSERT, UPDATE, or DELETE policy on the three tables.

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

create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
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
        'quantity', i.quantity, 'unit_price', i.unit_price, 'subtotal', i.subtotal
      ) order by i.id) from public.order_items i where i.order_id = o.id),
      '[]'::jsonb
    )
  )
  into result
  from public.orders o
  where o.public_token = p_token;
  return result;
end;
$function$;

create or replace function public.create_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  item jsonb;
  catalog_row record;
  new_order public.orders;
  item_quantity integer;
  item_size text;
  item_product_id text;
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
    where product_id = item_product_id
      and size = item_size
      and is_active
      and product_is_active;
    if not found then raise exception 'Invalid or inactive product or size'; end if;
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
    end;
  end loop;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_product_id := item->>'product_id';
    item_size := item->>'size';
    item_quantity := (item->>'quantity')::integer;
    select product_id, product_name, size, unit_price into catalog_row
    from public.menu_catalog
    where product_id = item_product_id
      and size = item_size
      and is_active
      and product_is_active;
    insert into public.order_items (
      order_id, product_id, product_name_snapshot, size, quantity, unit_price, subtotal
    ) values (
      new_order.id, catalog_row.product_id, catalog_row.product_name, catalog_row.size,
      item_quantity, catalog_row.unit_price, catalog_row.unit_price * item_quantity
    );
  end loop;

  return jsonb_build_object(
    'id', new_order.id,
    'public_token', new_order.public_token,
    'display_code', new_order.display_code,
    'total_amount', new_order.total_amount,
    'created_at', new_order.created_at
  );
end;
$function$;

create or replace function public.advance_order_status(p_order_id uuid, p_new_status text)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
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
$function$;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin role required';
  end if;
end;
$function$;

create or replace function public.get_menu_catalog()
returns table (
  product_id text,
  product_name text,
  size text,
  unit_price numeric(10, 2),
  ingredients text,
  category_id text,
  category_name text,
  subcategory_id text,
  subcategory_name text,
  product_sort_order integer,
  size_sort_order integer,
  is_active boolean,
  product_is_active boolean
)
language sql
security definer
set search_path = pg_catalog, public, extensions
as $function$
  select c.product_id, c.product_name, c.size, c.unit_price,
         c.ingredients, c.category_id, c.category_name,
         c.subcategory_id, c.subcategory_name,
         c.product_sort_order, c.size_sort_order,
         c.is_active, c.product_is_active
  from public.menu_catalog c
  where c.is_active and c.product_is_active
  order by c.product_sort_order, c.size_sort_order;
$function$;

create or replace function public.get_menu_catalog_admin()
returns table (
  product_id text,
  product_name text,
  size text,
  unit_price numeric(10, 2),
  ingredients text,
  category_id text,
  category_name text,
  subcategory_id text,
  subcategory_name text,
  product_sort_order integer,
  size_sort_order integer,
  is_active boolean,
  product_is_active boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
begin
  perform public.assert_admin();
  return query
  select c.product_id, c.product_name, c.size, c.unit_price,
         c.ingredients, c.category_id, c.category_name,
         c.subcategory_id, c.subcategory_name,
         c.product_sort_order, c.size_sort_order,
         c.is_active, c.product_is_active
  from public.menu_catalog c
  order by c.product_sort_order, c.size_sort_order;
end;
$function$;

create or replace function public.update_catalog_price(
  p_product_id text,
  p_size text,
  p_unit_price numeric
)
returns public.menu_catalog
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  updated_row public.menu_catalog;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null or nullif(trim(p_size), '') is null then
    raise exception 'Product and size are required';
  end if;
  if p_unit_price is null
    or p_unit_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_unit_price <= 0
    or p_unit_price <> round(p_unit_price, 2)
    or p_unit_price > 99999999.99 then
    raise exception 'Price must be positive with at most two decimal places';
  end if;
  update public.menu_catalog
  set unit_price = p_unit_price
  where product_id = trim(p_product_id) and size = trim(p_size)
  returning * into updated_row;
  if not found then raise exception 'Product or size not found'; end if;
  return updated_row;
end;
$function$;

create or replace function public.admin_set_product_active(p_product_id text, p_is_active boolean)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare changed integer;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null
     or not exists (select 1 from public.menu_catalog where product_id = trim(p_product_id)) then
    raise exception 'Product not found';
  end if;
  update public.menu_catalog set product_is_active = p_is_active
  where product_id = trim(p_product_id);
  get diagnostics changed = row_count;
  return changed;
end;
$function$;

create or replace function public.admin_set_size_active(
  p_product_id text,
  p_size text,
  p_is_active boolean
)
returns public.menu_catalog
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare changed public.menu_catalog;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null or nullif(trim(p_size), '') is null then
    raise exception 'Product and size are required';
  end if;
  update public.menu_catalog set is_active = p_is_active
  where product_id = trim(p_product_id) and size = trim(p_size)
  returning * into changed;
  if not found then raise exception 'Product or size not found'; end if;
  return changed;
end;
$function$;

create or replace function public.admin_add_size(
  p_product_id text,
  p_size text,
  p_unit_price numeric
)
returns public.menu_catalog
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare added public.menu_catalog; next_order integer;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null
     or not exists (select 1 from public.menu_catalog where product_id = trim(p_product_id)) then
    raise exception 'Product not found';
  end if;
  if nullif(trim(p_size), '') is null then raise exception 'Size is required'; end if;
  if p_unit_price is null
    or p_unit_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_unit_price <= 0
    or p_unit_price <> round(p_unit_price, 2)
    or p_unit_price > 99999999.99 then
    raise exception 'Price must be positive with at most two decimal places';
  end if;
  if exists (select 1 from public.menu_catalog
             where product_id = trim(p_product_id) and size = trim(p_size)) then
    raise exception 'Duplicate product and size';
  end if;
  select coalesce(max(size_sort_order), 0) + 1 into next_order
  from public.menu_catalog where product_id = trim(p_product_id);
  insert into public.menu_catalog (
    product_id, product_name, size, unit_price, ingredients,
    category_id, category_name, subcategory_id, subcategory_name,
    product_sort_order, size_sort_order, is_active, product_is_active
  )
  select product_id, product_name, trim(p_size), p_unit_price, ingredients,
         category_id, category_name, subcategory_id, subcategory_name,
         product_sort_order, next_order, true, product_is_active
  from public.menu_catalog where product_id = trim(p_product_id) limit 1
  returning * into added;
  return added;
end;
$function$;

create or replace function public.admin_update_product(
  p_product_id text,
  p_product_name text,
  p_category_id text,
  p_category_name text,
  p_ingredients text default null,
  p_subcategory_id text default null,
  p_subcategory_name text default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare changed integer;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null
     or nullif(trim(p_product_name), '') is null
     or nullif(trim(p_category_id), '') is null
     or nullif(trim(p_category_name), '') is null then
    raise exception 'Product name and category are required';
  end if;
  update public.menu_catalog
  set product_name = trim(p_product_name),
      category_id = trim(p_category_id),
      category_name = trim(p_category_name),
      ingredients = nullif(trim(coalesce(p_ingredients, '')), ''),
      subcategory_id = nullif(trim(coalesce(p_subcategory_id, '')), ''),
      subcategory_name = nullif(trim(coalesce(p_subcategory_name, '')), '')
  where product_id = trim(p_product_id);
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'Product not found'; end if;
  return changed;
end;
$function$;

create or replace function public.admin_create_product(
  p_product_id text,
  p_product_name text,
  p_category_id text,
  p_category_name text,
  p_sizes jsonb,
  p_ingredients text default null,
  p_subcategory_id text default null,
  p_subcategory_name text default null
)
returns setof public.menu_catalog
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare item jsonb; item_size text; item_price numeric; item_order integer := 0; product_order integer;
begin
  perform public.assert_admin();
  if nullif(trim(p_product_id), '') is null
     or nullif(trim(p_product_name), '') is null
     or nullif(trim(p_category_id), '') is null
     or nullif(trim(p_category_name), '') is null then
    raise exception 'Product ID, name, and category are required';
  end if;
  if exists (select 1 from public.menu_catalog where product_id = trim(p_product_id)) then
    raise exception 'Product ID already exists';
  end if;
  if p_sizes is null or jsonb_typeof(p_sizes) <> 'array' or jsonb_array_length(p_sizes) = 0 then
    raise exception 'At least one size is required';
  end if;
  if jsonb_typeof(p_sizes) <> 'array' then raise exception 'Malformed sizes JSON'; end if;
  select coalesce(max(product_sort_order), 0) + 1 into product_order from public.menu_catalog;
  for item in select value from jsonb_array_elements(p_sizes) loop
    item_order := item_order + 1;
    if jsonb_typeof(item) <> 'object' or nullif(trim(item->>'size'), '') is null then
      raise exception 'Invalid size';
    end if;
    if item->>'price' is null or item->>'price' !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'Invalid price';
    end if;
    item_size := trim(item->>'size');
    item_price := (item->>'price')::numeric;
    if item_price <= 0 or item_price > 99999999.99 then
      raise exception 'Price must be positive with at most two decimal places';
    end if;
    if (select count(*) from jsonb_array_elements(p_sizes) other
        where trim(other->>'size') = item_size) > 1 then
      raise exception 'Duplicate product and size';
    end if;
    insert into public.menu_catalog (
      product_id, product_name, size, unit_price, ingredients,
      category_id, category_name, subcategory_id, subcategory_name,
      product_sort_order, size_sort_order, is_active, product_is_active
    ) values (
      trim(p_product_id), trim(p_product_name), item_size, item_price,
      nullif(trim(coalesce(p_ingredients, '')), ''), trim(p_category_id),
      trim(p_category_name), nullif(trim(coalesce(p_subcategory_id, '')), ''),
      nullif(trim(coalesce(p_subcategory_name, '')), ''), product_order,
      item_order, true, true
    );
  end loop;
  return query select * from public.menu_catalog
    where product_id = trim(p_product_id) order by size_sort_order;
end;
$function$;

-- Effective Remote table grants.
revoke all on public.menu_catalog, public.orders, public.order_items from public, anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant all on public.menu_catalog, public.orders, public.order_items to service_role;

-- Effective Remote function grants.
revoke all on function public.create_order(jsonb) from public, authenticated;
grant execute on function public.create_order(jsonb) to anon;
revoke all on function public.get_order_by_token(uuid) from public;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;
revoke all on function public.get_menu_catalog() from public;
grant execute on function public.get_menu_catalog() to anon, authenticated;
revoke all on function public.get_menu_catalog_admin() from public, anon;
grant execute on function public.get_menu_catalog_admin() to authenticated;
revoke all on function public.update_catalog_price(text, text, numeric) from public, anon;
grant execute on function public.update_catalog_price(text, text, numeric) to authenticated;
revoke all on function public.admin_create_product(text, text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.admin_create_product(text, text, text, text, jsonb, text, text, text) to authenticated;
revoke all on function public.admin_update_product(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_update_product(text, text, text, text, text, text, text) to authenticated;
revoke all on function public.admin_add_size(text, text, numeric) from public, anon;
grant execute on function public.admin_add_size(text, text, numeric) to authenticated;
revoke all on function public.admin_set_product_active(text, boolean) from public, anon;
grant execute on function public.admin_set_product_active(text, boolean) to authenticated;
revoke all on function public.admin_set_size_active(text, text, boolean) from public, anon;
grant execute on function public.admin_set_size_active(text, text, boolean) to authenticated;
revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;
revoke all on function public.assert_admin() from public, anon, authenticated;

-- Trigger functions are callable by the effective default PUBLIC grant, but only
-- have meaning as trigger functions. This records the observed privilege state.
grant execute on function public.set_updated_at() to public;
grant execute on function public.enforce_status_progression() to public;
grant execute on function public.recalc_order_total() to public;

-- Remote Realtime state observed by SELECT:
-- publication supabase_realtime contains public.orders.
-- No ALTER PUBLICATION is emitted here so this document cannot silently change
-- Realtime configuration if it is later read as SQL.
