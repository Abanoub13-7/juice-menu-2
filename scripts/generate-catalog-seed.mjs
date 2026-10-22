import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'src', 'data', 'menu.ts')
const outputPath = path.join(root, 'supabase', 'seed', 'optional_catalog_seed.sql')
let source = fs.readFileSync(sourcePath, 'utf8')

source = source
  .replace(/^import[^\n]+\n/gm, '')
  .replace(/export interface SearchableProduct \{[\s\S]*?\n\}/, '')
  .replace(/export /g, '')
  .replace(/: number/g, '')
  .replace(/: string/g, '')
  .replace(/: SizeOption\[\]/g, '')
  .replace(/: Product\[\]/g, '')
  .replace(/: Category\[\]/g, '')
  .replace(/: Product/g, '')
  .replace(/: SearchableProduct\[\]/g, '')
  .replace(/opts\?\s*:\s*\{ ingredients\?; needsReview\?\s*:\s*boolean \}/g, 'opts')

const products = new Function(`${source}\nreturn getAllProducts();`)()
const rows = products.flatMap(({ product, categoryId, categoryName, subcategoryId, subcategoryName }, productIndex) => product.sizes.map((size, sizeIndex) => ({
  productId: product.id,
  productName: product.name,
  size: size.label,
  price: size.price,
  ingredients: product.ingredients ?? null,
  categoryId,
  categoryName,
  subcategoryId: subcategoryId ?? null,
  subcategoryName: subcategoryName ?? null,
  productSortOrder: productIndex + 1,
  sizeSortOrder: sizeIndex + 1,
})))


const quote = (value) => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const values = rows.map((row) => `  (${quote(row.productId)}, ${quote(row.productName)}, ${quote(row.size)}, ${row.price}, ${quote(row.ingredients)}, ${quote(row.categoryId)}, ${quote(row.categoryName)}, ${quote(row.subcategoryId)}, ${quote(row.subcategoryName)}, ${row.productSortOrder}, ${row.sizeSortOrder})`).join(',\n')

const sql = `-- OPTIONAL SEED — generated from src/data/menu.ts by scripts/generate-catalog-seed.mjs.
-- Run manually (SQL editor / psql) ONLY after the migrations have been applied.
-- It loads the menu that ships with this app (src/data/menu.ts) into menu_catalog and
-- menu_categories so customers can place orders. It is the app's own bundled menu,
-- NOT order history, customers or users. Replace names/prices (via /admin/menu) or
-- regenerate after editing src/data/menu.ts for the new client's real menu.
-- Idempotent: ON CONFLICT DO NOTHING, never overwrites prices you have edited.

begin;

insert into public.menu_catalog (
  product_id, product_name, size, unit_price, ingredients,
  category_id, category_name, subcategory_id, subcategory_name,
  product_sort_order, size_sort_order
) values
${values}
on conflict (product_id, size) do nothing;

insert into public.menu_categories (id, name, sort_order)
select category_id, max(category_name), min(product_sort_order)
from public.menu_catalog
group by category_id
on conflict (id) do nothing;

commit;
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, sql)
console.log(`Wrote ${rows.length} rows (${products.length} products) to ${path.relative(root, outputPath)}`)
