-- juice-menu-faisel-st — 2/5 customer & barista RPCs.
-- create_order / get_order_by_token are the notes-aware versions (20260914).
-- advance_order_status preserves the deployed behaviour: any AUTHENTICATED user
-- may advance an order (the status-progression trigger still enforces forward-only
-- order). See documentation/SECURITY_NOTES.md before enabling Auth sign-ups.

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
    if item_product_id is null or item_size is null
      or jsonb_typeof(item->'quantity') is distinct from 'number' then
      raise exception 'Invalid order item';
    end if;
    if item ? 'notes' and jsonb_typeof(item->'notes') not in ('string', 'null') then
      raise exception 'Invalid order item notes';
    end if;
    item_notes := nullif(btrim(item->>'notes'), '');
    if item_notes is not null and char_length(item_notes) > 500 then
      raise exception 'Order item notes are too long';
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
    item_notes := nullif(btrim(item->>'notes'), '');
    select product_id, product_name, size, unit_price into catalog_row
    from public.menu_catalog
    where product_id = item_product_id
      and size = item_size
      and is_active
      and product_is_active;
    insert into public.order_items (
      order_id, product_id, product_name_snapshot, size, quantity, unit_price, subtotal, notes
    ) values (
      new_order.id, catalog_row.product_id, catalog_row.product_name, catalog_row.size,
      item_quantity, catalog_row.unit_price, catalog_row.unit_price * item_quantity, item_notes
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
$$;


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


revoke all on function public.get_order_by_token(uuid) from public;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;
revoke all on function public.create_order(jsonb) from public, authenticated;
grant execute on function public.create_order(jsonb) to anon;
revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;
