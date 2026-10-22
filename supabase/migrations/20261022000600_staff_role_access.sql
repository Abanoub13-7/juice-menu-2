-- Restrict order visibility and status updates to staff identified by trusted
-- Supabase app_metadata. Apply only after authorized users have been assigned
-- the `barista` or `admin` app_metadata role.

create or replace function public.assert_staff()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') not in ('barista', 'admin') then
    raise exception 'Staff role required';
  end if;
end;
$function$;

revoke all on function public.assert_staff() from public, anon, authenticated;

drop policy if exists "authenticated can read orders" on public.orders;
create policy "staff can read orders"
  on public.orders for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('barista', 'admin'));

drop policy if exists "authenticated can read order items" on public.order_items;
create policy "staff can read order items"
  on public.order_items for select to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('barista', 'admin'));

create or replace function public.advance_order_status(p_order_id uuid, p_new_status text)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  changed public.orders;
begin
  perform public.assert_staff();
  update public.orders
  set status = p_new_status, updated_at = now()
  where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  select * into changed from public.orders where id = p_order_id;
  return changed;
end;
$function$;
