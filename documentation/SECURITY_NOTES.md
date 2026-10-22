# Security notes

## Model
* Browser holds only the publishable/anon key. All access is enforced by RLS + `SECURITY DEFINER` RPCs with pinned `search_path`.
* Customers: create an order (`create_order`) and read it by secret UUID token (`get_order_by_token`). No table access.
* Staff use trusted `app_metadata.role` values `barista` or `admin`; admin (`app_metadata.role='admin'`) alone manages catalog/categories and deletes completed orders. `user_metadata.role` is never an authorization source.
* Status can only move forward one step (trigger); totals are recomputed server-side; client-sent prices are ignored (tested).

## Staff role migration — NOT applied
The currently deployed `authenticated can read orders`, `authenticated can read order items`, and `advance_order_status` rules permit any authenticated account to read/advance orders. The new migration `20261022000600_staff_role_access.sql` replaces this with the explicit `app_metadata.role in ('barista','admin')` allow-list. It must not be applied until intended staff accounts have been manually assigned roles and the owner approves the production permission change.

Keep **Authentication → "Allow new users to sign up" OFF**. The local `supabase/config.toml` sets `enable_signup = false` for local development, but hosted dashboard settings are separate. Role claims must be set only by a trusted administrator, never from the browser or `user_metadata`.

## Secrets
No secrets are in this package. `.env*` and `.vscode/mcp.json` are git-ignored. `scripts/validate-catalog.mjs` compares the
source catalog through the public `get_menu_catalog` RPC using `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key).
It does not require or use a service-role key.

## Tokens / IDs
Order lookup relies on an unguessable UUID `public_token`; sequential `display_code`s are not sufficient to read an order.
Admin delete-completed is irreversible; consider a backup policy on the new project.
