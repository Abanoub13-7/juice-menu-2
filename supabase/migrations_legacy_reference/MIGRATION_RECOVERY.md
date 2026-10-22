> **HISTORICAL DOCUMENT — previous deployment only.** Kept for context. It describes a *different* Supabase
> project that this application is NOT connected to. Nothing in it is active configuration.

# Migration Recovery Notes

Date: 2026-09-13
Project: `juice-menu`
Project ref: `<ORIGINAL-PROJECT-REF-REDACTED>`

## Purpose

`baseline_remote.sql` records the observed Remote schema state as a local
schema baseline. It is not a migration-history reconstruction, not a data
backup, and not a replacement for the existing SQL files.

The baseline contains schema/state definitions only. It contains no data rows
from `menu_catalog`, `orders`, or `order_items`.

## Remote migration history

Observed with `npx.cmd supabase migration list`:

- `20260912203741`
- `20260912204309`
- `20260912204408`
- `20260912204423`
- `20260912204428`
- `20260912204436`
- `20260912204458`
- `20260912204508`
- `20260912204517`
- `20260912230208`
- `20260912230640`
- `20260913170102`

## Local migration history

The local directory contains:

- `20260913_admin_price_management.sql`
- `20260913_live_catalog_management.sql`

`schema.sql` and `catalog.sql` are local SQL documents, not entries in the
Supabase migration history.

## What is proven

- Remote has `menu_catalog`, `orders`, and `order_items`.
- Remote `menu_catalog` has 537 rows and 180 products.
- Remote has the live catalog columns and all requested admin RPCs.
- Remote has RLS enabled on all three core tables.
- Remote has SELECT policies for authenticated users on orders and order items.
- Remote has no direct table SELECT for anon.
- Remote has admin RPCs protected by `assert_admin()` and
  `auth.jwt() -> app_metadata ->> 'role' = 'admin'`.
- Remote `advance_order_status` checks authentication but does not check a
  barista/admin role.
- Remote Realtime includes `public.orders`.

## What is not proven

- The SQL content of the twelve Remote-only migration versions.
- Whether the missing local files were deleted, were created in another
  session/branch, or were never committed to this repository.
- Whether either local `20260913_*.sql` file was ever applied by that exact
  migration version. Their exact version does not appear in Remote history.
- The historical source of the effective `revoke_anon_update_catalog_price`
  result. The effective Remote privilege is verified as anon EXECUTE = NO,
  but no local migration with that name exists.

## Why Remote is the temporary source of truth

The Remote schema is the deployed state used by the application. Its observed
objects match the live catalog behavior: active flags, sorting columns, admin
catalog RPCs, and active-item validation in `create_order`. Local migrations
are incomplete relative to Remote history, so they cannot safely be treated as
a complete rebuild sequence.

## Baseline meaning

`baseline_remote.sql` represents the observed schema/state, including tables,
constraints, indexes, RLS state, policies, functions, function security,
search_path settings, grants, triggers, and the observed Realtime membership.

It does not attempt to make Local migration history equal Remote history. It
also does not include current table data or catalog INSERT statements.
`catalog.sql` remains the separate local seed document.

Realtime membership is documented as an observed comment rather than emitted
as `ALTER PUBLICATION`, because this phase must not provide an accidental path
to change Remote configuration.

## Verification notes

Remote vs baseline object coverage:

| Object | Remote | Baseline | Match |
|---|---|---|---|
| `menu_catalog` | Present, 13 columns | Represented | YES |
| `orders` | Present, 7 columns | Represented | YES |
| `order_items` | Present, 8 columns | Represented | YES |
| Primary/unique/foreign/check constraints | Present | Represented | YES |
| Core indexes | Present | Represented | YES |
| RLS enabled state | Enabled on all three | Represented | YES |
| RLS policies | Orders/items SELECT policies | Represented | YES |
| Table grants | Verified effective grants | Represented | YES |
| Requested RPCs | Present | Represented | YES |
| Function security/search_path | Verified | Represented | YES |
| Triggers | Three observed | Represented | YES |
| Realtime membership | `supabase_realtime.public.orders` | Commented as observed | NOT REPRESENTED AS DDL |
| Current data rows | Present remotely | Intentionally absent | NOT REPRESENTED |
| Remote migration SQL history | Versions only available | Not reconstructed | NOT REPRESENTED |

## Deferred issue

`advance_order_status` is intentionally represented as currently deployed,
including its current authentication-only authorization behavior. It was not
fixed in this phase and must be handled, if approved, by a separate future
migration.

## Safety record

The following operations were not executed:

- `supabase db push`: NOT RUN
- `supabase migration up`: NOT RUN
- `supabase db reset`: NOT RUN
- `supabase migration repair`: NOT RUN
- `supabase migration repair --status applied`: NOT RUN
- `supabase migration repair --status reverted`: NOT RUN
- Remote `INSERT`: NOT RUN
- Remote `UPDATE`: NOT RUN
- Remote `DELETE`: NOT RUN
- Remote `ALTER`: NOT RUN
- Remote `CREATE`: NOT RUN
- Remote `DROP`: NOT RUN
- Remote `TRUNCATE`: NOT RUN
- RLS, policy, grant, function, auth, catalog, order, and order-item changes:
  NOT RUN

`supabase db dump` was not used as a source because it requires Docker or
Podman in this environment. Remote inspection used `migration list`,
`gen types --linked`, and SELECT-only `db query --linked` calls.
