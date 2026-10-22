-- Live catalog price management.
-- Admin authorization is read from Supabase Auth app_metadata, which cannot be
-- changed by a browser client. The frontend is only a convenience gate; these
-- functions are the security boundary.

-- Keep the catalog RPC-only even if project-level default grants have changed.
revoke all on table public.menu_catalog from public, anon, authenticated;

create or replace function public.get_menu_catalog()
returns table (
  product_id text,
  product_name text,
  size text,
  unit_price numeric(10, 2)
)
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  select c.product_id, c.product_name, c.size, c.unit_price
  from public.menu_catalog c
  order by c.product_id, c.size;
$$;

revoke all on function public.get_menu_catalog() from public;
grant execute on function public.get_menu_catalog() to anon, authenticated;

create or replace function public.update_catalog_price(
  p_product_id text,
  p_size text,
  p_unit_price numeric
)
returns public.menu_catalog
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  updated_row public.menu_catalog;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Admin role required';
  end if;

  if nullif(trim(p_product_id), '') is null or nullif(trim(p_size), '') is null then
    raise exception 'Product and size are required';
  end if;

  if p_unit_price is null
    or p_unit_price::text in ('NaN', 'Infinity', '-Infinity')
    or p_unit_price <= 0
    or p_unit_price <> round(p_unit_price, 2)
    or p_unit_price > 99999999.99 then
    raise exception 'Price must be a positive amount with at most two decimal places';
  end if;

  update public.menu_catalog
  set unit_price = p_unit_price
  where product_id = p_product_id
    and size = p_size
  returning * into updated_row;

  if not found then
    raise exception 'Product or size not found';
  end if;

  return updated_row;
end;
$$;

revoke all on function public.update_catalog_price(text, text, numeric) from public;
grant execute on function public.update_catalog_price(text, text, numeric) to authenticated;
