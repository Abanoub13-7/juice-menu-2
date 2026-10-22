# Client-specific content still to review

This clone preserves the application **as it was**, including content written for the previous client. Nothing about the new
client's business was invented. Review/replace before go-live:

| Location | Contains |
|---|---|
| `src/config/store.ts` | previous shop name (AR/EN), description, address, phone, branches heading, map links |
| `src/data/menu.ts` | the full bundled menu with the previous client's products and prices (also the source of the optional seed) |
| `index.html` | `<title>`, meta description/keywords/og tags, canonical URL (`citydrink-alharam.example`) |
| `Header`, `Footer`, `StoreInfo`, `StoreContact`, `StoreLocation`, `StoreBranches`, `StaffNav`, `OrderInvoicePrint` (components), `OrderPage`, `main.tsx` | read the store config above (no separate brand strings found in `src/` by grep) |
| `public/favicon.svg`, theme colours (`tailwind.config.js`, `index.html` theme-color) | visual identity |
| `README.md` (Arabic body text) | still names the previous shop |
| `DATA_REVIEW.md` | notes about price ambiguities in the *previous* client's PDF menu |

After editing `src/data/menu.ts`, regenerate the seed (`node scripts/generate-catalog-seed.mjs`) or manage products live at `/admin/menu`.
