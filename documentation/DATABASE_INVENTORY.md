# Database inventory

Source of truth for the new project: `supabase/migrations/` (5 files). Provenance: **reconstructed from the repository's
SQL** (`supabase/migrations_legacy_reference/`), *not* verified against the live original database (no read access was used).
The reconstructed schema was proven equal to the repository's own SQL replayed in order
(`baseline_remote.sql` → `20260914` → `20260915` → `20260916`) with `pg_dump` on a local PostgreSQL 16 — the only differences
were a deliberate `service_role` grant on `menu_categories` (matches Supabase default privileges) and random dump tokens.

## Migrations
| # | File | Contents |
|---|---|---|
| 1 | `20261022000100_core_schema.sql` | pgcrypto (schema `extensions`), 4 tables, 4 indexes + PKs/uniques, RLS on all tables, 2 SELECT policies, 3 trigger functions + 3 triggers, table grants |
| 2 | `20261022000200_order_functions.sql` | `get_order_by_token`, `create_order` (notes-aware), `advance_order_status` + grants |
| 3 | `20261022000300_catalog_admin_functions.sql` | `assert_admin`, `get_menu_catalog`, `get_menu_catalog_admin`, `update_catalog_price`, `admin_set_product_active`, `admin_set_size_active`, `admin_add_size`, `admin_update_product`, `admin_create_product` + grants |
| 4 | `20261022000400_category_functions.sql` | `get_menu_categories`, `get_menu_categories_admin`, `admin_upsert_menu_category`, `admin_delete_completed_orders`, `admin_delete_menu_category`, `admin_move_menu_category` + grants |
| 5 | `20261022000500_realtime_orders.sql` | adds `public.orders` to `supabase_realtime` (guarded) |

## Tables (public)
* `orders` — id uuid PK, public_token uuid unique, display_code text unique, status check (new/preparing/ready/completed), total_amount ≥ 0, created_at, updated_at.
* `order_items` — FK → orders (ON DELETE CASCADE), qty 1..50, unit_price/subtotal ≥ 0, `subtotal = quantity*unit_price`, notes ≤ 500 chars.
* `menu_catalog` — PK (product_id, size); category/subcategory snapshot columns, sort orders, `is_active`, `product_is_active`.
* `menu_categories` — id (`^[a-z0-9-]+$`) PK, name, image_url, sort_order, is_active.

Indexes: `idx_orders_public_token`, `idx_orders_status_created`, `idx_order_items_order_id`, partial `idx_menu_catalog_active_order`.
Triggers: `trg_orders_updated_at`, `trg_orders_status_progression` (forward-only), `trg_order_items_recalc_total` (server-side totals).

## RLS / grants
RLS enabled on all 4 tables. Only policies: `authenticated can read orders`, `authenticated can read order items` (SELECT).
No INSERT/UPDATE/DELETE policy anywhere; `menu_catalog`/`menu_categories` have no policy (RPC only). `anon`/`public` have no table privileges.
`authenticated`: SELECT on orders/order_items only. `service_role`: all (server-side only).

## Function privileges (all SECURITY DEFINER with fixed `search_path` except trigger fns)
| Function | anon | authenticated | Notes |
|---|---|---|---|
| create_order | ✔ | ✘ | validates items against active catalog; total computed server-side |
| get_order_by_token | ✔ | ✔ | returns only the order matching the secret token |
| get_menu_catalog / get_menu_categories | ✔ | ✔ | active rows only |
| advance_order_status | ✘ | ✔ | requires login only — see SECURITY_NOTES |
| get_menu_catalog_admin, get_menu_categories_admin, update_catalog_price, admin_* | ✘ | ✔ | each calls `assert_admin()` (JWT `app_metadata.role = 'admin'`) |
| assert_admin | ✘ | ✘ | internal |

## Not present / not applicable
Storage buckets & policies, Edge Functions, cron jobs, enums, views, materialized views, custom schemas, sequences: **none exist in the repository.**

## Data
Migrations contain **no data**. `supabase/seed/optional_catalog_seed.sql` (optional) holds only the app-bundled menu (537 rows / 180 products).
No orders, customers, users or auth data were exported from or imported to anywhere.

## Known gaps
The original database's own migration history (12 remote-only versions per the old recovery notes) was never visible, and no
live read-only access was available. Objects that exist only in that database and nowhere in the repo cannot be known; none were invented.
