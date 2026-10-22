-- Behaviour + security verification for the Juice Menu database.
-- Prereqs: all migrations applied AND supabase/seed/optional_catalog_seed.sql loaded.
-- Safe to run: everything happens in one transaction that is ROLLED BACK at the end,
-- so no orders/products persist. Run in the SQL editor of the NEW project (or psql).
-- Any failed check raises an exception and aborts with a clear message.
begin;

create or replace function pg_temp.expect_error(stmt text, needle text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then
    if position(lower(needle) in lower(sqlerrm)) > 0 then return; end if;
    raise exception 'FAIL: "%" raised unexpected error: %', stmt, sqlerrm;
  end;
  raise exception 'FAIL: "%" should have been rejected (%)', stmt, needle;
end $$;

grant execute on function pg_temp.expect_error(text, text) to public;

-- 0. structure ---------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['orders','order_items','menu_catalog','menu_categories'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.'||t)::regclass) then
      raise exception 'FAIL: RLS disabled on %', t; end if;
  end loop;
  raise notice 'PASS 0: RLS enabled on all 4 tables';
end $$;

-- 1. anon -------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

select pg_temp.expect_error('select * from public.orders', 'permission denied');
select pg_temp.expect_error('select * from public.order_items', 'permission denied');
select pg_temp.expect_error('select * from public.menu_catalog', 'permission denied');
select pg_temp.expect_error('select * from public.menu_categories', 'permission denied');
select pg_temp.expect_error($q$insert into public.orders (display_code,total_amount) values ('X',1)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.advance_order_status(gen_random_uuid(),'preparing')$q$, 'permission denied');
select pg_temp.expect_error($q$select public.update_catalog_price('a','b',1)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.get_menu_catalog_admin()$q$, 'permission denied');
select pg_temp.expect_error($q$select public.admin_delete_completed_orders()$q$, 'permission denied');
select pg_temp.expect_error($q$select public.assert_admin()$q$, 'permission denied');

create temp table t_ctx (k text primary key, v text);
grant all on t_ctx to public;

do $$ declare r record; res jsonb; got jsonb; n int; pid text; psize text; pprice numeric; begin
  select count(*) into n from public.get_menu_catalog();
  if n = 0 then raise exception 'FAIL: get_menu_catalog() empty - load the seed first'; end if;
  select product_id, size, unit_price into pid, psize, pprice from public.get_menu_catalog() limit 1;
  res := public.create_order(jsonb_build_array(
    jsonb_build_object('product_id', pid, 'size', psize, 'quantity', 2, 'notes', '  no sugar  ', 'unit_price', 0.01)));
  if (res->>'total_amount')::numeric <> pprice * 2 then raise exception 'FAIL: total not server-computed (got %)', res->>'total_amount'; end if;
  got := public.get_order_by_token((res->>'public_token')::uuid);
  if got->'items'->0->>'notes' <> 'no sugar' then raise exception 'FAIL: notes not stored/trimmed'; end if;
  if (got->'items'->0->>'unit_price')::numeric <> pprice then raise exception 'FAIL: client price was trusted'; end if;
  if got->>'status' <> 'new' then raise exception 'FAIL: status should be new'; end if;
  if public.get_order_by_token(gen_random_uuid()) is not null then raise exception 'FAIL: unknown token returned data'; end if;
  insert into t_ctx values ('order_id', res->>'id'), ('pid', pid), ('psize', psize);
  raise notice 'PASS 1: anon blocked from tables/admin RPCs; create_order + get_order_by_token work; totals server-side';
end $$;

select pg_temp.expect_error($q$select public.create_order('[]'::jsonb)$q$, 'at least one item');
select pg_temp.expect_error($q$select public.create_order('[{"product_id":"nope","size":"L","quantity":1}]'::jsonb)$q$, 'Invalid or inactive');
select pg_temp.expect_error(format($q$select public.create_order(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('product_id',(select v from t_ctx where k='pid'),'size',(select v from t_ctx where k='psize'),'quantity',51))::text), 'Invalid quantity');
select pg_temp.expect_error(format($q$select public.create_order(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('product_id',(select v from t_ctx where k='pid'),'size',(select v from t_ctx where k='psize'),'quantity',1.5))::text), 'integer');

-- 2. authenticated, non-admin (barista) ----------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{}}', true);

do $$ declare n int; begin
  select count(*) into n from public.orders;
  if n <> 0 then raise exception 'FAIL: unassigned account can read orders'; end if;
  select count(*) into n from public.order_items;
  if n <> 0 then raise exception 'FAIL: unassigned account can read order items'; end if;
  raise notice 'PASS 2a: unassigned authenticated account cannot read staff orders';
end $$;
select pg_temp.expect_error(format($q$select public.advance_order_status(%L,'preparing')$q$, (select v from t_ctx where k='order_id')), 'Staff role required');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"role":"barista"}}', true);

do $$ declare oid_ uuid := (select v from t_ctx where k='order_id')::uuid; n int; st text; begin
  select count(*) into n from public.orders; if n < 1 then raise exception 'FAIL: barista cannot read orders'; end if;
  select count(*) into n from public.order_items; if n < 1 then raise exception 'FAIL: barista cannot read order items'; end if;
  select status into st from public.advance_order_status(oid_, 'preparing'); if st <> 'preparing' then raise exception 'FAIL: advance'; end if;
  raise notice 'PASS 2a: barista reads orders and advances new->preparing';
end $$;
select pg_temp.expect_error(format($q$select public.advance_order_status(%L,'completed')$q$, (select v from t_ctx where k='order_id')), 'Invalid status transition');
select pg_temp.expect_error(format($q$select public.advance_order_status(%L,'new')$q$, (select v from t_ctx where k='order_id')), 'Invalid status transition');
select pg_temp.expect_error($q$update public.orders set status='ready'$q$, 'permission denied');
select pg_temp.expect_error($q$delete from public.orders$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.orders (display_code,total_amount) values ('X',1)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.create_order('[]'::jsonb)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.update_catalog_price('a','b',1)$q$, 'Admin role required');
select pg_temp.expect_error($q$select public.get_menu_catalog_admin()$q$, 'Admin role required');
select pg_temp.expect_error($q$select public.admin_delete_completed_orders()$q$, 'Admin role required');
select pg_temp.expect_error($q$select public.admin_upsert_menu_category('x','X')$q$, 'Admin role required');
select pg_temp.expect_error($q$select * from public.menu_catalog$q$, 'permission denied');
select pg_temp.expect_error($q$select public.assert_admin()$q$, 'permission denied');
-- a user cannot self-promote via user_metadata
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{},"user_metadata":{"role":"admin"}}', true);
select pg_temp.expect_error($q$select public.update_catalog_price('a','b',1)$q$, 'Admin role required');
select pg_temp.expect_error(format($q$select public.advance_order_status(%L,'ready')$q$, (select v from t_ctx where k='order_id')), 'Staff role required');

-- 3. admin ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"admin"}}', true);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$ declare pid text := (select v from t_ctx where k='pid'); psize text := (select v from t_ctx where k='psize'); r public.menu_catalog; n int; begin
  r := public.update_catalog_price(pid, psize, 12.50); if r.unit_price <> 12.50 then raise exception 'FAIL: price update'; end if;
  perform pg_temp.expect_error(format($q$select public.update_catalog_price(%L,%L,0)$q$, pid, psize), 'Price must be positive');
  perform pg_temp.expect_error(format($q$select public.update_catalog_price(%L,%L,1.234)$q$, pid, psize), 'Price must be positive');
  perform public.admin_create_product('zz-test', 'Test Product', 'test-cat', 'Test Cat', '[{"size":"S","price":"5"},{"size":"M","price":"7.5"}]'::jsonb);
  perform public.admin_upsert_menu_category('test-cat', 'Test Cat');
  perform pg_temp.expect_error($q$select public.admin_delete_menu_category('test-cat')$q$, 'Category has products');
  perform public.admin_set_product_active('zz-test', false);
  select count(*) into n from public.get_menu_catalog() where product_id='zz-test'; if n <> 0 then raise exception 'FAIL: inactive product visible'; end if;
  select count(*) into n from public.get_menu_catalog_admin() where product_id='zz-test'; if n <> 2 then raise exception 'FAIL: admin list'; end if;
  perform public.admin_add_size('zz-test', 'XL', 9);
  perform public.admin_set_size_active('zz-test', 'XL', false);
  perform public.admin_update_product('zz-test', 'Test Product 2', 'test-cat', 'Test Cat');
  perform public.admin_move_menu_category('test-cat', -1);
  -- completed-order cleanup
  perform public.advance_order_status((select v from t_ctx where k='order_id')::uuid, 'ready');
  perform public.advance_order_status((select v from t_ctx where k='order_id')::uuid, 'completed');
  n := public.admin_delete_completed_orders(); if n <> 1 then raise exception 'FAIL: expected 1 completed order removed, got %', n; end if;
  select count(*) into n from public.order_items; if n <> 0 then raise exception 'FAIL: cascade delete of items'; end if;
  raise notice 'PASS 3: admin RPCs, validation, active flags, categories, completed-order cleanup (cascade)';
end $$;

-- 4. inactive products are rejected for customers (create_order is anon-only) --
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.create_order('[{"product_id":"zz-test","size":"S","quantity":1}]'::jsonb)$q$, 'Invalid or inactive');
do $$ begin raise notice 'PASS 4: inactive product rejected by create_order'; end $$;

reset role;
rollback;
select 'ALL CHECKS PASSED (transaction rolled back, no data persisted)' as result;
