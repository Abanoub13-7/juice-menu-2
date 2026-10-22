import type { CatalogProduct, MenuCategory } from './catalog'
import { normalizeArabic } from '../utils/search'

/**
 * Pure, in-memory helpers for the admin product list: search + category filter.
 * Everything is derived from the already-loaded admin catalog, so typing never
 * triggers a database request and nothing here can modify product data.
 */

export const ALL = 'all'
export const NO_SUBCATEGORY = '__none__'

export interface SubcategoryOption { id: string; name: string }
export interface CategoryOption {
  id: string
  name: string
  /** false only when the managed-category list says the category is switched off. */
  isActive: boolean
  subcategories: SubcategoryOption[]
  /** True when some products in the category have no subcategory (while others do). */
  hasUnsubcategorized: boolean
}

const ARABIC_INDIC_DIGITS = /[٠-٩]/g

/** Arabic-aware normalization plus Arabic-Indic digits → Latin, and collapsed spaces. */
export function normalizeSearchText(input: string): string {
  return normalizeArabic(input.replace(ARABIC_INDIC_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x0660)))
    .replace(/\s+/g, ' ')
    .trim()
}

export interface IndexedProduct { product: CatalogProduct; text: string }

/** Product names and ids are searchable (ids help admins find a product by its code). */
export function buildSearchIndex(products: CatalogProduct[]): IndexedProduct[] {
  return products.map((product) => ({ product, text: normalizeSearchText(`${product.product_name} ${product.product_id}`) }))
}

/** Every whitespace-separated word of the query must appear somewhere in the product text. */
export function searchProducts(index: IndexedProduct[], query: string): CatalogProduct[] {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return index.map((entry) => entry.product)
  return index.filter((entry) => tokens.every((token) => entry.text.includes(token))).map((entry) => entry.product)
}

/** Categories in the managed order when available, then any others found in the catalog. */
export function buildCategoryOptions(products: CatalogProduct[], managed: MenuCategory[]): CategoryOption[] {
  const options = new Map<string, CategoryOption>()
  const ensure = (id: string, name: string, isActive: boolean) => {
    let option = options.get(id)
    if (!option) {
      option = { id, name, isActive, subcategories: [], hasUnsubcategorized: false }
      options.set(id, option)
    }
    return option
  }

  const orderedManaged = [...managed].sort((a, b) => a.sort_order - b.sort_order)
  for (const category of orderedManaged) ensure(category.id, category.name, category.is_active)

  for (const product of products) {
    const option = ensure(product.category_id, product.category_name, true)
    if (product.subcategory_id) {
      if (!option.subcategories.some((sub) => sub.id === product.subcategory_id)) {
        option.subcategories.push({ id: product.subcategory_id, name: product.subcategory_name ?? product.subcategory_id })
      }
    }
  }
  for (const option of options.values()) {
    option.hasUnsubcategorized = option.subcategories.length > 0 && products.some((product) => product.category_id === option.id && !product.subcategory_id)
  }
  return Array.from(options.values())
}

export function matchesCategory(product: CatalogProduct, categoryId: string, subcategoryId: string): boolean {
  if (categoryId === ALL) return true
  if (product.category_id !== categoryId) return false
  if (subcategoryId === ALL) return true
  if (subcategoryId === NO_SUBCATEGORY) return !product.subcategory_id
  return product.subcategory_id === subcategoryId
}
