# Documentation — Juice Menu / juice-menu-faisel-st

| File | Purpose |
|---|---|
| [SETUP.md](SETUP.md) | Step-by-step: verify the project, apply migrations, seed, create staff/admin users, configure hosting |
| [DATABASE_INVENTORY.md](DATABASE_INVENTORY.md) | Every table, function, trigger, policy, grant and migration, with the provenance of each |
| [SECURITY_NOTES.md](SECURITY_NOTES.md) | Security model, required dashboard settings, known deployed-behaviour caveats |
| [CLIENT_CUSTOMIZATION.md](CLIENT_CUSTOMIZATION.md) | Files that still contain the previous client's branding/menu and must be reviewed |
| [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) | What was actually tested, what was not, and what remains |
| [FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md) | Feature audit of the repository |

This package is **independent of any other Supabase project**: it ships no `.env`, no CLI link, and no MCP
connection. All remote operations must be performed by you against the *new* project only.
