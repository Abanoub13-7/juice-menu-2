-- juice-menu-faisel-st — 3/5 catalog read + admin RPCs.
-- Admin = Supabase Auth user whose app_metadata.role = 'admin' (set only via
-- the dashboard / SQL editor, never from the browser). assert_admin() is the
-- security boundary for every admin_* function.

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

revoke all on function public.assert_admin() from public, anon, authenticated;
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
