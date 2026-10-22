import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src', 'data', 'menu.ts'), 'utf8')
const compiledSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const menuModule = await import(`data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`)
const products = menuModule.getAllProducts()
const expected = products.flatMap(({ product, categoryId, categoryName, subcategoryId, subcategoryName }, productIndex) => product.sizes.map((size, sizeIndex) => ({
  product_id: product.id,
  product_name: product.name,
  size: size.label,
  unit_price: size.price,
  ingredients: product.ingredients ?? null,
  category_id: categoryId,
  category_name: categoryName,
  subcategory_id: subcategoryId ?? null,
  subcategory_name: subcategoryName ?? null,
  product_sort_order: productIndex + 1,
  size_sort_order: sizeIndex + 1,
})))

function readLocalEnvironment() {
  const values = {}
  for (const filename of ['.env', '.env.local']) {
    const envPath = path.join(root, filename)
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (!match || match[1] in values) continue
      values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2')
    }
  }
  return { ...values, ...process.env }
}

const env = readLocalEnvironment()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) for the read-only public catalog comparison.')
  process.exitCode = 2
} else {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: actual, error } = await supabase.rpc('get_menu_catalog')
  if (error) {
    console.error(`Could not read the public catalog RPC: ${error.message}`)
    process.exitCode = 1
  } else {
    const rows = actual ?? []
    const mismatches = []
    const mismatchCounts = { sizes: 0, prices: 0, categories: 0, subcategories: 0 }
    if (rows.length !== expected.length) mismatches.push(`row count: expected ${expected.length}, got ${rows.length}`)
    if (new Set(rows.map((row) => row.product_id)).size !== products.length) mismatches.push(`product count: expected ${products.length}, got ${new Set(rows.map((row) => row.product_id)).size}`)
    const actualByKey = new Map(rows.map((row) => [`${row.product_id}__${row.size}`, row]))
    for (const row of expected) {
      const found = actualByKey.get(`${row.product_id}__${row.size}`)
      if (!found) {
        mismatches.push(`missing row: ${row.product_id} / ${row.size}`)
        mismatchCounts.sizes += 1
        continue
      }
      for (const field of ['product_id', 'product_name', 'size', 'ingredients', 'product_sort_order', 'size_sort_order']) {
        if (String(found[field] ?? '') !== String(row[field] ?? '')) {
          mismatches.push(`${field} mismatch for ${row.product_id} / ${row.size}: expected ${JSON.stringify(row[field])}, got ${JSON.stringify(found[field])}`)
          if (field === 'size') mismatchCounts.sizes += 1
        }
      }
      if (String(found.unit_price ?? '') !== String(row.unit_price ?? '')) {
        mismatches.push(`unit_price mismatch for ${row.product_id} / ${row.size}: expected ${JSON.stringify(row.unit_price)}, got ${JSON.stringify(found.unit_price)}`)
        mismatchCounts.prices += 1
      }
      for (const field of ['category_id', 'category_name']) {
        if (String(found[field] ?? '') !== String(row[field] ?? '')) {
          mismatches.push(`${field} mismatch for ${row.product_id} / ${row.size}: expected ${JSON.stringify(row[field])}, got ${JSON.stringify(found[field])}`)
          mismatchCounts.categories += 1
        }
      }
      for (const field of ['subcategory_id', 'subcategory_name']) {
        if (String(found[field] ?? '') !== String(row[field] ?? '')) {
          mismatches.push(`${field} mismatch for ${row.product_id} / ${row.size}: expected ${JSON.stringify(row[field])}, got ${JSON.stringify(found[field])}`)
          mismatchCounts.subcategories += 1
        }
      }
    }
    const expectedKeys = new Set(expected.map((row) => `${row.product_id}__${row.size}`))
    for (const row of rows) {
      if (!expectedKeys.has(`${row.product_id}__${row.size}`)) mismatchCounts.sizes += 1
    }
    console.log(JSON.stringify({
      expectedProducts: products.length,
      expectedRows: expected.length,
      actualProducts: new Set(rows.map((row) => row.product_id)).size,
      actualRows: rows.length,
      productsWithIngredients: products.filter(({ product }) => product.ingredients).length,
      mismatchCounts,
      mismatchCount: mismatches.length,
      mismatches: mismatches.slice(0, 100),
    }, null, 2))
    if (mismatches.length) process.exitCode = 1
  }
}
