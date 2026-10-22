# Feature checklist (from the actual repository)

Stack: Vite 5 + React 18 + TypeScript + Tailwind, react-router 6, supabase-js 2, qrcode.react, lucide-react. npm + package-lock.json. SPA rewrites for Vercel (`vercel.json`) / Netlify (`public/_redirects`).

| Area | Route / file | Backing DB objects | Status |
|---|---|---|---|
| Public menu, category nav, search overlay, size selector, cart drawer (localStorage cart) | `/` | `get_menu_catalog`, `get_menu_categories` | preserved (code untouched) |
| Order creation with per-item notes | CartDrawer → `create_order` | `create_order` | preserved |
| Customer order page, QR code, status polling (4 s) | `/order/:token` | `get_order_by_token` | preserved |
| Barista login/logout, session | `/barista/login` | Supabase Auth (email+password) | preserved |
| Barista board, realtime, advance status | `/barista` | `orders`, `order_items` SELECT, `advance_order_status`, Realtime on `orders` | preserved |
| Invoice print / receipt | `OrderInvoicePrint` (print CSS) | — | preserved |
| Daily order report & sales summary | `DailyOrderReport` (inside `/barista`), `lib/dailyReport.ts` | `orders`, `order_items` | preserved |
| Admin catalog: prices, add/edit product, add size, activate/deactivate | `/admin/menu` (`/admin`, `/admin/prices` redirect) | `get_menu_catalog_admin`, `update_catalog_price`, `admin_*` | preserved |
| Admin category management (create/edit/reorder/delete) | `/admin/menu` | `menu_categories`, `admin_*_menu_category` | preserved |
| Delete completed orders (admin role enforced in DB) | `/barista` dashboard | `admin_delete_completed_orders` | preserved |

Changed in application code: only `src/lib/supabase.ts` (accepts `VITE_SUPABASE_PUBLISHABLE_KEY`, falls back to the legacy name), `src/vite-env.d.ts`, and comment paths in `src/lib/orders.ts`.
