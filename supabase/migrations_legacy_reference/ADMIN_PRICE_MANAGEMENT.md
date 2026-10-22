# Admin Price Management

Apply `migrations/20260913_admin_price_management.sql` in the Supabase SQL editor or through the normal migration workflow.

## Designating an admin

Create or identify the account in Supabase Auth, then run this statement in the Supabase SQL editor using an administrator connection:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where email = 'admin@example.com';
```

The user must sign out and sign back in so the refreshed JWT contains the new app metadata. Do not set this value from the browser and do not put a service-role key in Vercel or the frontend.

To remove admin access:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where email = 'admin@example.com';
```

The database checks `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'` inside `update_catalog_price`. The `/admin` route check is only a user experience guard; it is not the security boundary.

## Usage

Sign in through `/barista/login`, then open `/admin`. Search by Arabic product name, optionally filter by category, edit one size price, and press `حفظ`. Prices are validated in both the UI and the database. New orders read the updated `menu_catalog` row through `create_order`; existing order item snapshots are never recalculated.
