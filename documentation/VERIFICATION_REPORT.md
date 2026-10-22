# Verification report

Date: 2026-10-22. This report includes local checks and a later read-only/browser verification of the new Supabase project.

## New-project verification
| Check | Result |
|---|---|
| Remote migration history | CLI confirmed all five local versions, `20261022000100` through `20261022000500`, are recorded remotely. No migrations were reapplied. |
| Project identity | Verified the configured URL/reference is `flldegaonlybpenxdhkb` (`juice-menu-faisel-st`); the original project was not targeted. |
| Production build | `npm.cmd run build` exited 0. Vite reported the existing >500 kB JavaScript chunk warning. |
| TypeScript | `npx.cmd --no-install tsc --noEmit` exited 0. |
| `npm.cmd run lint` | Exited 0, but this script only runs `tsc --noEmit`; no ESLint executable or configuration is present. |
| Live catalog comparison | `npm run validate:catalog` compared the TypeScript source to the public catalog RPC: 180 products, 537 size rows, 0 mismatches in product, size, price, category, subcategory, ingredients, or sort fields. Read-only; no service-role key required. |
| Catalog and database configuration | Read-only query found 537 catalog rows, 11 active categories, RLS enabled on orders, and orders included in `supabase_realtime`. |
| Existing test order | `CD-17EF2` exists, status `new`, total 20.00, one `قصب (J)` item, and the note `اختبار تقني آلي — لا يتم التجهيز` was saved. Tracking by its existing token rendered the matching item, note, total, and status. No additional order was created. |
| Browser customer flows | Menu/catalog load, category selection (the active category changes), cart add/remove, and existing order tracking were exercised locally against the new project. The browser runner did not visibly scroll to the selected category section, so section scrolling is not marked as passed. One order submission had been completed earlier in the same verification and was confirmed directly in the database. |
| Browser console/network | During the browser retest, zero console errors and zero failed/HTTP-error Supabase requests were captured. React Router emitted future-flag warnings. |
| Protected staff routes | `/barista` and `/admin/menu` redirected to `/barista/login`; email/password fields rendered. No credentials were submitted. |
| Auth role state | At the latest check, one Auth account existed and its `app_metadata.role` was unset; there was no admin-role account. The account identity was not disclosed. |
| Staff dashboard/Realtime | Not end-to-end tested: no authorized staff credentials were available. Publication membership was verified, but authenticated live status delivery was not. |
| Test order cleanup | Not run. The order is still `new`; the existing `admin_delete_completed_orders` RPC deletes all completed orders and cannot safely remove this order. |

## Earlier local verification
| Check | Result |
|---|---|
| `npm ci` from `package-lock.json` | OK (145 packages) |
| Migrations 1→5 applied to an empty local PostgreSQL (Supabase-style roles + stub `auth`) | OK; this was a local disposable database, not the remote deployment. |
| Schema equivalence | The five new migrations matched the repository's prior SQL replay, except for the explicit `service_role` grant on `menu_categories`. |
| Optional seed | 537 rows / 180 products / 11 categories loaded into the disposable local database. |
| `supabase/tests/verify_behavior.sql` | All checks passed in a transaction that was rolled back. |
| Destructive-statement scan of migrations | No migration-time destructive statements; delete operations are inside admin-gated functions. |

## Still not verified
* A real staff sign-in, order dashboard load/status transition, and live Realtime delivery; create/confirm an authorized staff account and sign in locally before repeating these checks.
* Production deployment or production-host browser behavior; no frontend changes were deployed.
* The original project's live schema/data, or its historical remote-only migrations; it was not accessed.
* Automated unit tests; none are configured in this repository.
