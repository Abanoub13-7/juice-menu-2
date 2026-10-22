import type { Category, Product } from '../types/menu'
import { supabase } from './supabase'

export interface CatalogRow {
  product_id: string
  product_name: string
  size: string
  unit_price: number
  ingredients: string | null
  category_id: string
  category_name: string
  subcategory_id: string | null
  subcategory_name: string | null
  product_sort_order: number
  size_sort_order: number
  is_active: boolean
  product_is_active: boolean
}
export interface MenuCategory { id: string; name: string; image_url: string | null; sort_order: number; is_active: boolean }

/**
 * Raw row shape returned by the category RPCs.
 * `get_menu_categories` (public) lists active rows only, so it has no
 * `is_active` column, while `get_menu_categories_admin` always returns it.
 */
interface MenuCategoryRow {
  id: string
  name: string
  image_url: string | null
  sort_order: number
  is_active?: boolean | null
}

export interface CatalogProduct {
  product_id: string
  product_name: string
  category_id: string
  category_name: string
  subcategory_id: string | null
  subcategory_name: string | null
  sizes: CatalogRow[]
  is_active: boolean
  product_is_active: boolean
}

export class CatalogError extends Error {
  userMessage: string

  constructor(userMessage: string, technicalMessage?: string) {
    super(technicalMessage ?? userMessage)
    this.userMessage = userMessage
  }
}

function requireClient() {
  if (!supabase) {
    throw new CatalogError('المنيو غير متاحة حاليًا، برجاء المحاولة لاحقًا', 'Supabase is not configured')
  }
  return supabase
}

export async function getCatalog(): Promise<CatalogRow[]> {
  const { data, error } = await requireClient().rpc('get_menu_catalog')
  return parseCatalogResponse(data, error)
}
/**
 * Maps a raw RPC row to `MenuCategory`.
 * A missing `is_active` means the row came from the public RPC, which lists
 * active rows only, so it is reported as active.
 */
function mapMenuCategory(row: MenuCategoryRow): MenuCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    image_url: row.image_url ? String(row.image_url) : null,
    sort_order: Number(row.sort_order),
    is_active: row.is_active === undefined || row.is_active === null ? true : Boolean(row.is_active),
  }
}

export async function getMenuCategories(): Promise<MenuCategory[]> {
  const { data, error } = await requireClient().rpc('get_menu_categories')
  if (error || !Array.isArray(data)) throw new CatalogError('تعذر تحميل الفئات', error?.message)
  return (data as MenuCategoryRow[]).map((row) => mapMenuCategory(row))
}
export async function getAdminMenuCategories(): Promise<MenuCategory[]> {
  const { data, error } = await requireClient().rpc('get_menu_categories_admin')
  if (error || !Array.isArray(data)) throw new CatalogError('تعذر تحميل الفئات', error?.message)
  return (data as MenuCategoryRow[]).map((row) => mapMenuCategory(row))
}
export async function saveMenuCategory(input: MenuCategory): Promise<void> {
  const id = input.id.trim(); const name = input.name.trim()
  if (!/^[a-z0-9-]+$/.test(id) || !name) throw new CatalogError('بيانات الفئة غير صالحة')
  const { error } = await requireClient().rpc('admin_upsert_menu_category', { p_id: id, p_name: name, p_image_url: input.image_url?.trim() || null, p_sort_order: input.sort_order, p_is_active: input.is_active })
  if (error) throw new CatalogError('تعذر حفظ الفئة', error.message)
}
export async function moveMenuCategory(id:string,direction:number): Promise<void> { const {error}=await requireClient().rpc('admin_move_menu_category',{p_id:id,p_direction:direction}); if(error) throw new CatalogError('تعذر ترتيب الفئة',error.message) }
export async function deleteMenuCategory(id:string): Promise<void> { const {error}=await requireClient().rpc('admin_delete_menu_category',{p_id:id}); if(error) throw new CatalogError('تعذر حذف الفئة',error.message) }

export async function getAdminCatalog(): Promise<CatalogRow[]> {
  const { data, error } = await requireClient().rpc('get_menu_catalog_admin')
  return parseCatalogResponse(data, error)
}

function parseCatalogResponse(data: unknown, error: { message?: string } | null): CatalogRow[] {
  if (error || !Array.isArray(data)) {
    throw new CatalogError('تعذر تحميل الأسعار الحالية', error?.message)
  }

  return data.map((row) => ({
    product_id: String(row.product_id),
    product_name: String(row.product_name),
    size: String(row.size),
    unit_price: Number(row.unit_price),
    ingredients: row.ingredients ? String(row.ingredients) : null,
    category_id: String(row.category_id),
    category_name: String(row.category_name),
    subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
    subcategory_name: row.subcategory_name ? String(row.subcategory_name) : null,
    product_sort_order: Number(row.product_sort_order),
    size_sort_order: Number(row.size_sort_order),
    is_active: Boolean(row.is_active),
    product_is_active: Boolean(row.product_is_active),
  }))
}

export async function updateCatalogPrice(productId: string, size: string, unitPrice: number): Promise<CatalogRow> {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || Math.round(unitPrice * 100) !== unitPrice * 100) {
    throw new CatalogError('أدخل سعرًا موجبًا وبحد أقصى منزلتين عشريتين')
  }

  const { data, error } = await requireClient().rpc('update_catalog_price', {
    p_product_id: productId,
    p_size: size,
    p_unit_price: unitPrice,
  })
  if (error || !data || Array.isArray(data)) {
    throw new CatalogError('تعذر تحديث السعر', error?.message)
  }

  return {
    product_id: String(data.product_id),
    product_name: String(data.product_name),
    size: String(data.size),
    unit_price: Number(data.unit_price),
    ingredients: data.ingredients ? String(data.ingredients) : null,
    category_id: String(data.category_id),
    category_name: String(data.category_name),
    subcategory_id: data.subcategory_id ? String(data.subcategory_id) : null,
    subcategory_name: data.subcategory_name ? String(data.subcategory_name) : null,
    product_sort_order: Number(data.product_sort_order),
    size_sort_order: Number(data.size_sort_order),
    is_active: Boolean(data.is_active),
    product_is_active: Boolean(data.product_is_active),
  }
}

async function catalogMutation(name: string, args: Record<string, unknown>): Promise<CatalogRow | CatalogRow[]> {
  const { data, error } = await requireClient().rpc(name, args)
  if (error || !data) throw new CatalogError('تعذر تحديث الكتالوج', error?.message)
  if (Array.isArray(data)) return parseCatalogResponse(data, null)
  return parseCatalogResponse([data], null)[0]
}

export async function setProductActive(productId: string, isActive: boolean): Promise<void> {
  const { error } = await requireClient().rpc('admin_set_product_active', { p_product_id: productId, p_is_active: isActive })
  if (error) throw new CatalogError('تعذر تحديث حالة المنتج', error.message)
}

export async function setSizeActive(productId: string, size: string, isActive: boolean): Promise<CatalogRow> {
  return await catalogMutation('admin_set_size_active', { p_product_id: productId, p_size: size, p_is_active: isActive }) as CatalogRow
}

export async function addCatalogSize(productId: string, size: string, unitPrice: number): Promise<CatalogRow> {
  return await catalogMutation('admin_add_size', { p_product_id: productId, p_size: size, p_unit_price: unitPrice }) as CatalogRow
}

export async function updateCatalogProduct(input: { productId: string; productName: string; categoryId: string; categoryName: string; ingredients?: string; subcategoryId?: string; subcategoryName?: string }): Promise<void> {
  await catalogMutation('admin_update_product', {
    p_product_id: input.productId,
    p_product_name: input.productName,
    p_category_id: input.categoryId,
    p_category_name: input.categoryName,
    p_ingredients: input.ingredients ?? null,
    p_subcategory_id: input.subcategoryId ?? null,
    p_subcategory_name: input.subcategoryName ?? null,
  })
}

export async function createCatalogProduct(input: { productId: string; productName: string; categoryId: string; categoryName: string; sizes: Array<{ size: string; price: number }>; ingredients?: string; subcategoryId?: string; subcategoryName?: string }): Promise<CatalogRow[]> {
  return await catalogMutation('admin_create_product', {
    p_product_id: input.productId,
    p_product_name: input.productName,
    p_category_id: input.categoryId,
    p_category_name: input.categoryName,
    p_ingredients: input.ingredients ?? null,
    p_sizes: input.sizes,
    p_subcategory_id: input.subcategoryId ?? null,
    p_subcategory_name: input.subcategoryName ?? null,
  }) as CatalogRow[]
}

export function mergeCatalogPrices(categories: Category[], rows: CatalogRow[]): Category[] {
  const prices = new Map(rows.map((row) => [`${row.product_id}__${row.size}`, row.unit_price]))
  const updateProduct = (product: Product): Product => ({
    ...product,
    sizes: product.sizes.map((size) => ({
      ...size,
      price: prices.get(`${product.id}__${size.label}`) ?? size.price,
    })),
  })

  return categories.map((category) => ({
    ...category,
    products: category.products?.map(updateProduct),
    subcategories: category.subcategories?.map((subcategory) => ({
      ...subcategory,
      products: subcategory.products.map(updateProduct),
    })),
  }))
}

export function buildLiveCategories(rows: CatalogRow[], fallback: Category[], managedCategories: MenuCategory[] = []): Category[] {
  const fallbackProducts = new Map(getAllProducts(fallback).map(({ product }) => [product.id, product]))
  const categories = new Map<string, Category>()
  const liveProducts = new Map<string, Product>()

  for (const row of rows) {
    let category = categories.get(row.category_id)
    if (!category) {
      const managed = managedCategories.find((item) => item.id === row.category_id)
      category = { id: row.category_id, name: managed?.name ?? row.category_name, imageUrl: managed?.image_url ?? undefined, products: [] }
      categories.set(row.category_id, category)
    }
    const source = fallbackProducts.get(row.product_id)
    const target = liveProducts.get(row.product_id) ?? (source
      ? { ...source, sizes: [] }
      : { id: row.product_id, name: row.product_name, sizes: [] })
    liveProducts.set(row.product_id, target)
    target.name = row.product_name
    target.ingredients = row.ingredients ?? undefined
    const size = { label: row.size, price: row.unit_price }
    const existing = target.sizes.find((item) => item.label === row.size)
    if (existing) existing.price = row.unit_price
    else target.sizes.push(size)
    if (row.subcategory_id) {
      category.subcategories ??= []
      category.products = undefined
      let subcategory = category.subcategories.find((item) => item.id === row.subcategory_id)
      if (!subcategory) {
        subcategory = { id: row.subcategory_id, name: row.subcategory_name ?? row.subcategory_id, products: [] }
        category.subcategories.push(subcategory)
      }
      if (!subcategory.products.some((item) => item.id === target.id)) subcategory.products.push(target)
    } else if (!category.products?.some((item) => item.id === target.id)) {
      category.products?.push(target)
    }
  }

  for (const managed of managedCategories) if (!categories.has(managed.id)) categories.set(managed.id, { id: managed.id, name: managed.name, imageUrl: managed.image_url ?? undefined, products: [] })
  return Array.from(categories.values()).sort((a, b) => managedCategories.findIndex((item) => item.id === a.id) - managedCategories.findIndex((item) => item.id === b.id))
}

export function groupCatalogProducts(rows: CatalogRow[]): CatalogProduct[] {
  const products = new Map<string, CatalogProduct>()
  for (const row of rows) {
    const product = products.get(row.product_id) ?? {
      product_id: row.product_id,
      product_name: row.product_name,
      category_id: row.category_id,
      category_name: row.category_name,
      subcategory_id: row.subcategory_id,
      subcategory_name: row.subcategory_name,
      sizes: [],
      is_active: false,
      product_is_active: row.product_is_active,
    }
    product.sizes.push(row)
    product.is_active ||= row.is_active && row.product_is_active
    products.set(row.product_id, product)
  }
  return Array.from(products.values())
}

function getAllProducts(categories: Category[]) {
  return categories.flatMap((category) => category.products?.map((product) => ({ product })) ?? category.subcategories?.flatMap((subcategory) => subcategory.products.map((product) => ({ product }))) ?? [])
}
