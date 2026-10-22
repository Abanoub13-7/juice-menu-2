# Setup — juice-menu-faisel-st

## 0. Verify you are targeting the NEW project (do this first)
The display name is not proof. In the Supabase dashboard open **juice-menu-faisel-st → Project Settings → General**
and note the **Reference ID** (20 chars). The project URL must be `https://<that-reference>.supabase.co`.
Every command below must use that reference. Keep the reference in your own notes; it is not stored in this package.

## 1. Apply the schema (new project only)
The new project should be **empty**. Check `Database → Tables`: nothing in `public`.
The original five migrations are already deployed; do not rerun them. Migration `20261022000600_staff_role_access.sql` is a
new, pending staff-authorization change. It is not deployed and requires explicit owner approval after staff roles are assigned.

**Option A — SQL Editor (no tooling):** run these files in order, each in full:
1. `supabase/migrations/20261022000100_core_schema.sql`
2. `supabase/migrations/20261022000200_order_functions.sql`
3. `supabase/migrations/20261022000300_catalog_admin_functions.sql`
4. `supabase/migrations/20261022000400_category_functions.sql`
5. `supabase/migrations/20261022000500_realtime_orders.sql`

**Option B — Supabase CLI (history inspection only until migration 6 is approved):**
```bash
npx supabase login
npx supabase link --project-ref <NEW-PROJECT-REF>      # confirm the ref printed matches step 0
npx supabase migration list                            # existing five versions should match remote
```
Do not run `db push` while migration 6 is pending approval; `db push` would change deployed order-read/status permissions.
Never run `db reset` against a remote project.

## 2. (Optional) load the bundled menu
`supabase/seed/optional_catalog_seed.sql` loads the 180-product menu that ships in `src/data/menu.ts`
(537 size rows) into `menu_catalog` / `menu_categories`. Without any catalog rows the menu page shows an empty live
menu and no order can be placed. It contains **no orders, customers or users**. See `CLIENT_CUSTOMIZATION.md` —
the bundled menu is the previous client's; replace it with the new client's menu before go-live.
Regenerate after editing `src/data/menu.ts`: `node scripts/generate-catalog-seed.mjs`.

## 3. Authentication settings (dashboard) — required
* **Authentication → Providers → Email:** enabled. **Disable "Allow new users to sign up"** (public sign-ups OFF).
  This is security-critical, see `SECURITY_NOTES.md`.
* **Authentication → URL Configuration:** Site URL = your production origin; add the origin(s) to Redirect URLs.
  (The app only uses email+password sign-in; no magic links/OAuth.)
* Keep public sign-ups disabled. Create each barista under **Authentication → Users → Add user** (email + strong password, auto-confirm). After confirming the account is the intended staff member, assign `app_metadata.role = 'barista'` using the dashboard's trusted app metadata editor or an administrator SQL editor:
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'barista')
where email = '<verified-barista-email>';
```
* Create the owner/admin the same way, then (SQL editor, admin connection) grant the admin role:
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where email = '<owner-email>';
```
  Use the exact verified account email and verify the affected row count is one. The user must sign out/in to refresh the JWT. Never create users with hardcoded passwords in source or SQL. Roles must be stored in `app_metadata`, which users cannot edit themselves; `user_metadata.role` is not trusted.

The pending `20261022000600_staff_role_access.sql` migration also restricts order reads and status changes to `app_metadata.role` values `barista` or `admin`. It is not applied remotely. Apply it only after assigning and verifying the staff roles, and only with explicit approval because it changes production authorization.

## 4. Realtime
Migration 5 adds `public.orders` to `supabase_realtime`. Confirm under **Database → Publications**.

## 5. Frontend environment variables
Copy `.env.example` → `.env` locally (git-ignored), and set the same variables in your host (Vercel/Netlify/…):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy name `VITE_SUPABASE_ANON_KEY` also accepted),
optional `VITE_PUBLIC_APP_URL`. Only the **publishable/anon** key. Never a secret/service_role key.
```bash
npm ci
npm run lint && npm run build
```
Rollup note: if `npm run build` reports a missing `@rollup/rollup-<platform>` module (lockfile created on Windows),
run `npm i --no-save @rollup/rollup-linux-x64-gnu@$(node -p "require('rollup/package.json').version")` on Linux CI.

## 6. Verify the database
Run `supabase/tests/verify_behavior.sql` in the SQL editor (requires migrations + seed). It runs in a transaction that is
rolled back and ends with `ALL CHECKS PASSED`. Then smoke-test the app: place an order at `/`, open `/order/:token`,
sign in at `/barista/login`, advance the order, sign in as admin and open `/admin/menu`, check the daily report + print.

## 7. Not used by this app
Storage buckets, Edge Functions, cron/scheduled jobs and third-party secrets: none exist in this repository.
