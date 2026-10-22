# Legacy SQL — reference only, NOT executed

These files come from the previous deployment's repository and are kept only to document where
`supabase/migrations/` was reconstructed from. The Supabase CLI never reads this folder; do **not**
run them. `schema.sql` is the pre-RPC design document, `baseline_remote.sql` the observed deployed
schema (before notes/categories), and the three small migrations are the later increments.
`catalog.sql` and `20260913_live_catalog_management.sql` (bulk menu data / one-time backfill) were
intentionally dropped: the bundled menu is available as `supabase/seed/optional_catalog_seed.sql`.
