-- juice-menu-faisel-st — 4/5 category management + order cleanup RPCs
-- (20260915 + 20260916). The menu_categories table itself is in migration 1;
-- the one-time data backfill from menu_catalog in 20260915 is intentionally
-- omitted (it lives in supabase/seed/optional_catalog_seed.sql).

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

create or replace function public.admin_delete_menu_category(p_id text) returns void language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
begin perform public.assert_admin(); if exists(select 1 from public.menu_catalog where category_id=trim(p_id)) then raise exception 'Category has products'; end if; delete from public.menu_categories where id=trim(p_id); if not found then raise exception 'Category not found'; end if; end; $$;
create or replace function public.admin_move_menu_category(p_id text,p_direction integer) returns void language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare a public.menu_categories; b public.menu_categories; begin perform public.assert_admin(); select * into a from public.menu_categories where id=trim(p_id); if not found then raise exception 'Category not found'; end if; if p_direction<0 then select * into b from public.menu_categories where sort_order<a.sort_order order by sort_order desc,id desc limit 1; else select * into b from public.menu_categories where sort_order>a.sort_order order by sort_order,id limit 1; end if; if found then update public.menu_categories set sort_order=-1 where id=a.id; update public.menu_categories set sort_order=a.sort_order where id=b.id; update public.menu_categories set sort_order=b.sort_order where id=a.id; end if; end; $$;
revoke all on function public.admin_delete_menu_category(text) from public,anon; grant execute on function public.admin_delete_menu_category(text) to authenticated;
revoke all on function public.admin_move_menu_category(text,integer) from public,anon; grant execute on function public.admin_move_menu_category(text,integer) to authenticated;
