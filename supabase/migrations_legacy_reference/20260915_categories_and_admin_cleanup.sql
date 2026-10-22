-- Independently managed categories; catalog rows retain their historical names.
create table if not exists public.menu_categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) > 0),
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from public, anon, authenticated;

insert into public.menu_categories (id, name, sort_order)
select category_id, max(category_name), min(product_sort_order)
from public.menu_catalog
group by category_id
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

create or replace function public.get_menu_categories()
returns table (id text, name text, image_url text, sort_order integer)
language sql security definer set search_path = pg_catalog, public
as $$ select id, name, image_url, sort_order from public.menu_categories where is_active order by sort_order, name; $$;
revoke all on function public.get_menu_categories() from public;
grant execute on function public.get_menu_categories() to anon, authenticated;

create or replace function public.get_menu_categories_admin()
returns table (id text, name text, image_url text, sort_order integer, is_active boolean)
language plpgsql security definer set search_path = pg_catalog, public
as $$ begin perform public.assert_admin(); return query select c.id,c.name,c.image_url,c.sort_order,c.is_active from public.menu_categories c order by c.sort_order,c.name; end; $$;

create or replace function public.admin_upsert_menu_category(p_id text, p_name text, p_image_url text default null, p_sort_order integer default null, p_is_active boolean default true)
returns public.menu_categories
language plpgsql security definer set search_path = pg_catalog, public
as $$ declare result public.menu_categories; begin
  perform public.assert_admin();
  if nullif(trim(p_id),'') is null or trim(p_id) !~ '^[a-z0-9-]+$' or nullif(trim(p_name),'') is null then raise exception 'Invalid category'; end if;
  insert into public.menu_categories (id,name,image_url,sort_order,is_active) values (trim(p_id),trim(p_name),nullif(trim(coalesce(p_image_url,'')),''),coalesce(p_sort_order,(select coalesce(max(sort_order),0)+1 from public.menu_categories)),p_is_active)
  on conflict (id) do update set name=excluded.name,image_url=excluded.image_url,sort_order=excluded.sort_order,is_active=excluded.is_active returning * into result;
  return result;
end; $$;

create or replace function public.admin_delete_completed_orders()
returns integer
language plpgsql security definer set search_path = pg_catalog, public
as $$ declare removed integer; begin perform public.assert_admin(); delete from public.orders where status='completed'; get diagnostics removed=row_count; return removed; end; $$;

revoke all on function public.get_menu_categories_admin() from public, anon;
grant execute on function public.get_menu_categories_admin() to authenticated;
revoke all on function public.admin_upsert_menu_category(text,text,text,integer,boolean) from public, anon;
grant execute on function public.admin_upsert_menu_category(text,text,text,integer,boolean) to authenticated;
revoke all on function public.admin_delete_completed_orders() from public, anon;
grant execute on function public.admin_delete_completed_orders() to authenticated;
