import { useDeferredValue, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronDown, Plus, RefreshCw, SearchX, Trash2 } from 'lucide-react'
import StaffNav from '../components/StaffNav'
import AdminCatalogToolbar from '../components/AdminCatalogToolbar'
import { menu } from '../data/menu'
import {
  addCatalogSize,
  CatalogError,
  createCatalogProduct,
  getAdminCatalog,
  getAdminMenuCategories,
  groupCatalogProducts,
  setProductActive,
  setSizeActive,
  updateCatalogPrice,
  updateCatalogProduct,
  type CatalogProduct,
  type CatalogRow,
  type MenuCategory,
} from '../lib/catalog'
import { ALL, buildCategoryOptions, buildSearchIndex, matchesCategory, NO_SUBCATEGORY, searchProducts } from '../lib/catalogFilter'
import { isSupabaseConfigured } from '../lib/supabase'

type SizeDraft = { id: number; size: string; price: string }
type CategoryChoice = { id: string; name: string; subcategories: { id: string; name: string }[] }

const categories: CategoryChoice[] = menu.map((category) => ({ id: category.id, name: category.name, subcategories: category.subcategories ?? [] }))

function friendlyCatalogError(error: unknown, fallback: string) {
  if (!(error instanceof CatalogError)) return fallback
  const message = error.message.toLowerCase()
  if (message.includes('already exists') || message.includes('duplicate')) return 'معرف المنتج أو المقاس موجود بالفعل'
  if (message.includes('not found')) return 'المنتج أو المقاس غير موجود في الكتالوج'
  if (message.includes('admin role')) return 'هذا الإجراء متاح لحسابات الإدارة فقط'
  if (message.includes('price')) return 'أدخل سعرًا موجبًا وبحد أقصى منزلتين عشريتين'
  return error.userMessage || fallback
}

export default function AdminMenuPage() {
  const [rows, setRows] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [managedCategories, setManagedCategories] = useState<MenuCategory[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState(ALL)
  const [subcategoryId, setSubcategoryId] = useState(ALL)
  async function refreshCatalog() {
    setRefreshing(true)
    try {
      // Category metadata (order, names, active flag) is optional, read-only, and
      // must never block the product list if that RPC is unavailable.
      const [catalogRows, categoryRows] = await Promise.all([getAdminCatalog(), getAdminMenuCategories().catch(() => null)])
      setRows(catalogRows)
      if (categoryRows) setManagedCategories(categoryRows)
      setError(null)
    } catch (loadError) {
      setError(friendlyCatalogError(loadError, 'تعذر تحميل الكتالوج'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refreshCatalog()
  }, [])

  const allProducts = useMemo(() => groupCatalogProducts(rows), [rows])
  const searchIndex = useMemo(() => buildSearchIndex(allProducts), [allProducts])
  const categoryOptions = useMemo(() => buildCategoryOptions(allProducts, managedCategories), [allProducts, managedCategories])
  // Filtering is done in memory on the already-loaded catalog: no request per keystroke.
  const deferredQuery = useDeferredValue(query)
  const searched = useMemo(() => searchProducts(searchIndex, deferredQuery), [searchIndex, deferredQuery])
  // A category/subcategory that no longer exists (e.g. after a refresh) falls back to "all".
  const activeCategory = categoryOptions.some((option) => option.id === categoryId) ? categoryId : ALL
  const activeSubcategory = (() => {
    const option = categoryOptions.find((item) => item.id === activeCategory)
    if (!option || subcategoryId === ALL) return ALL
    if (subcategoryId === NO_SUBCATEGORY) return option.hasUnsubcategorized ? NO_SUBCATEGORY : ALL
    return option.subcategories.some((sub) => sub.id === subcategoryId) ? subcategoryId : ALL
  })()
  const visibleProducts = useMemo(() => searched.filter((product) => matchesCategory(product, activeCategory, activeSubcategory)), [searched, activeCategory, activeSubcategory])
  const searchCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const product of searched) counts[product.category_id] = (counts[product.category_id] ?? 0) + 1
    return counts
  }, [searched])
  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const product of searched) {
      if (product.category_id !== activeCategory) continue
      const key = product.subcategory_id ?? NO_SUBCATEGORY
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [searched, activeCategory])

  if (!isSupabaseConfigured) return <Message>إدارة المنيو غير متاحة، لم يتم ربط قاعدة البيانات</Message>
  if (loading) return <Message>جارِ تحميل إدارة المنتجات...</Message>

  const products = allProducts
  return (
    <div dir="rtl" className="min-h-screen bg-[#fbfaf6] text-[#20352a]">
      <StaffNav admin />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold text-[#a86028]">لوحة الإدارة</p><h1 className="font-display text-2xl font-bold">إدارة المنتجات</h1><p className="mt-1 text-sm text-[#7c847b]">{products.length} منتج من الكتالوج المباشر</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => void refreshCatalog()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e5ded1] bg-white px-4 text-sm font-bold text-[#526157] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> تحديث</button><NewProductForm categories={categories} onCreated={async () => { await refreshCatalog(); setNotice('تمت إضافة المنتج بنجاح') }} /></div>
        </div>
        {notice && <Notice onDismiss={() => setNotice(null)}>{notice}</Notice>}
        {error && <Alert>{error}</Alert>}
        {products.length > 0 && <AdminCatalogToolbar query={query} onQueryChange={setQuery} categories={categoryOptions} categoryId={activeCategory} subcategoryId={activeSubcategory} onCategoryChange={(id) => { setCategoryId(id); setSubcategoryId(ALL) }} onSubcategoryChange={setSubcategoryId} searchCounts={searchCounts} searchTotal={searched.length} subcategoryCounts={subcategoryCounts} shown={visibleProducts.length} total={products.length} />}
        {products.length === 0 && <p className="rounded-2xl border border-dashed border-[#ded5c7] bg-white px-4 py-12 text-center text-sm text-[#7c847b]">لا توجد منتجات في الكتالوج</p>}
        {products.length > 0 && visibleProducts.length === 0 && <div className="rounded-2xl border border-dashed border-[#ded5c7] bg-white px-4 py-12 text-center text-sm text-[#7c847b]"><SearchX className="mx-auto mb-3 h-8 w-8 text-[#a86028]" aria-hidden="true" /><p className="font-bold text-[#526157]">لا توجد منتجات مطابقة</p><p className="mt-1">جرّب كلمة أخرى{activeCategory !== ALL ? ' أو اعرض كل المنتجات' : ''}.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{query.trim() && <button type="button" onClick={() => setQuery('')} className="rounded-full border border-[#e5ded1] px-4 py-2 text-xs font-bold text-[#526157]">مسح البحث</button>}{activeCategory !== ALL && <button type="button" onClick={() => { setCategoryId(ALL); setSubcategoryId(ALL) }} className="rounded-full bg-[#2f805e] px-4 py-2 text-xs font-bold text-white">عرض كل المنتجات</button>}</div></div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((product) => <ProductManager key={product.product_id} product={product} onRefresh={refreshCatalog} onNotice={setNotice} />)}</div>
      </main>
    </div>
  )
}

function ProductManager({ product, onRefresh, onNotice }: { product: CatalogProduct; onRefresh: () => Promise<void>; onNotice: (message: string) => void }) {
  const [name, setName] = useState(product.product_name)
  const [ingredients, setIngredients] = useState(product.sizes[0]?.ingredients ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => { setName(product.product_name); setIngredients(product.sizes[0]?.ingredients ?? '') }, [product.product_name, product.sizes])

  async function saveProduct() {
    if (!name.trim()) { setError('اكتب اسم المنتج'); return }
    setSaving(true)
    try {
      await updateCatalogProduct({ productId: product.product_id, productName: name.trim(), categoryId: product.category_id, categoryName: product.category_name, ingredients: ingredients.trim(), subcategoryId: product.subcategory_id ?? undefined, subcategoryName: product.subcategory_name ?? undefined })
      await onRefresh(); onNotice('تم تحديث بيانات المنتج'); setError(null)
    } catch (updateError) { setError(friendlyCatalogError(updateError, 'تعذر تحديث المنتج')) }
    finally { setSaving(false) }
  }

  async function toggleProduct() {
    const next = !product.product_is_active
    if (!next && !window.confirm(`هل تريد تعطيل المنتج «${product.product_name}»؟`)) return
    setSaving(true)
    try { await setProductActive(product.product_id, next); await onRefresh(); onNotice(next ? 'تم تفعيل المنتج' : 'تم تعطيل المنتج'); setError(null) }
    catch (toggleError) { setError(friendlyCatalogError(toggleError, 'تعذر تغيير حالة المنتج')) }
    finally { setSaving(false) }
  }

  return <article className="overflow-hidden rounded-2xl border border-[#e8e0d2] bg-white shadow-[0_8px_24px_rgba(56,44,24,0.05)]"><div className="border-b border-[#eee8dd] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#a86028]">{product.category_name}{product.subcategory_name ? ` · ${product.subcategory_name}` : ''}</p><h2 className="mt-1 truncate font-bold">{product.product_name}</h2><p className="mt-1 truncate text-[11px] text-[#7c847b]" dir="ltr">{product.product_id}</p></div><button type="button" onClick={() => void toggleProduct()} disabled={saving} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-50 ${product.product_is_active ? 'bg-[#e3f2e8] text-[#2f805e]' : 'bg-[#fff0e7] text-[#c5683e]'}`}>{product.product_is_active ? 'نشط' : 'متوقف'}</button></div><button type="button" onClick={() => setOpen((value) => !value)} className="mt-4 flex w-full items-center justify-between text-xs font-bold text-[#526157]"><span>بيانات المنتج والمقاسات</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></button></div>{open && <div className="space-y-3 border-b border-[#eee8dd] bg-[#fffdfa] p-4"><label className="block text-xs font-bold text-[#687268]">اسم المنتج<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ded1] px-3 py-2 text-sm font-bold outline-none focus:border-[#2f805e]" /></label><label className="block text-xs font-bold text-[#687268]">المكونات<input value={ingredients} onChange={(event) => setIngredients(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ded1] px-3 py-2 text-sm outline-none focus:border-[#2f805e]" /></label><button type="button" onClick={() => void saveProduct()} disabled={saving} className="min-h-10 rounded-xl bg-[#2f805e] px-4 text-xs font-bold text-white disabled:opacity-50">{saving ? 'جارِ الحفظ...' : 'حفظ بيانات المنتج'}</button></div>}<div className="space-y-2 p-4">{product.sizes.map((row) => <SizeRow key={row.size} row={row} disabled={saving} onRefresh={onRefresh} onNotice={onNotice} onError={setError} />)}<AddSizeForm product={product} disabled={saving} onRefresh={onRefresh} onNotice={onNotice} onError={setError} />{error && <p className="rounded-xl bg-[#fff0e7] px-3 py-2 text-xs font-bold text-[#c5683e]">{error}</p>}</div></article>
}

function SizeRow({ row, disabled, onRefresh, onNotice, onError }: { row: CatalogRow; disabled: boolean; onRefresh: () => Promise<void>; onNotice: (message: string) => void; onError: (message: string | null) => void }) {
  const [price, setPrice] = useState(String(row.unit_price))
  const [saving, setSaving] = useState(false)
  useEffect(() => setPrice(String(row.unit_price)), [row.unit_price])
  async function savePrice() {
    const value = Number(price)
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) { onError('أدخل سعرًا موجبًا وبحد أقصى منزلتين عشريتين'); return }
    setSaving(true)
    try { await updateCatalogPrice(row.product_id, row.size, value); await onRefresh(); onNotice('تم تحديث السعر'); onError(null) }
    catch (priceError) { onError(friendlyCatalogError(priceError, 'تعذر تحديث السعر')) }
    finally { setSaving(false) }
  }
  async function toggleSize() {
    const next = !row.is_active
    if (!next && !window.confirm(`هل تريد تعطيل المقاس «${row.size}»؟`)) return
    setSaving(true)
    try { await setSizeActive(row.product_id, row.size, next); await onRefresh(); onNotice(next ? 'تم تفعيل المقاس' : 'تم تعطيل المقاس'); onError(null) }
    catch (toggleError) { onError(friendlyCatalogError(toggleError, 'تعذر تغيير حالة المقاس')) }
    finally { setSaving(false) }
  }
  return <div className="rounded-xl bg-[#faf8f3] p-2"><div className="flex items-center gap-2"><span className="w-20 shrink-0 text-sm font-bold">{row.size}</span><input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#e5ded1] bg-white px-2 py-2 text-center text-sm font-bold" aria-label={`سعر ${row.product_name} حجم ${row.size}`} /><button type="button" onClick={() => void savePrice()} disabled={disabled || saving} className="flex min-h-9 items-center justify-center rounded-lg bg-[#2f805e] px-3 text-xs font-bold text-white disabled:opacity-50">{saving ? '...' : 'حفظ'}</button></div><button type="button" onClick={() => void toggleSize()} disabled={disabled || saving} className={`mt-2 text-[11px] font-bold disabled:opacity-50 ${row.is_active ? 'text-[#c5683e]' : 'text-[#2f805e]'}`}>{row.is_active ? 'تعطيل المقاس' : 'تفعيل المقاس'}</button></div>
}

function AddSizeForm({ product, disabled, onRefresh, onNotice, onError }: { product: CatalogProduct; disabled: boolean; onRefresh: () => Promise<void>; onNotice: (message: string) => void; onError: (message: string | null) => void }) {
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = Number(price)
    if (!size.trim()) { onError('اكتب اسم المقاس'); return }
    if (product.sizes.some((row) => row.size === size.trim())) { onError('هذا المقاس موجود بالفعل'); return }
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) { onError('أدخل سعرًا موجبًا وبحد أقصى منزلتين عشريتين'); return }
    setSaving(true)
    try { await addCatalogSize(product.product_id, size.trim(), value); setSize(''); setPrice(''); await onRefresh(); onNotice('تمت إضافة المقاس'); onError(null) }
    catch (addError) { onError(friendlyCatalogError(addError, 'تعذر إضافة المقاس')) }
    finally { setSaving(false) }
  }
  return <form onSubmit={(event) => void submit(event)} className="border-t border-dashed border-[#ded5c7] pt-3"><p className="mb-2 text-xs font-bold text-[#687268]">إضافة مقاس</p><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"><input value={size} onChange={(event) => setSize(event.target.value)} placeholder="المقاس" className="min-w-0 rounded-lg border border-[#e5ded1] px-2 py-2 text-sm" /><input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="السعر" inputMode="decimal" className="min-w-0 rounded-lg border border-[#e5ded1] px-2 py-2 text-sm" /><button type="submit" disabled={disabled || saving} className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-[#f29a4a] px-3 text-xs font-bold text-[#392313] disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" /> إضافة</button></div></form>
}

function NewProductForm({ categories, onCreated }: { categories: CategoryChoice[]; onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [sizes, setSizes] = useState<SizeDraft[]>([{ id: 1, size: '', price: '' }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const category = categories.find((item) => item.id === categoryId)
  const subcategories = category?.subcategories ?? []
  const canSubmit = Boolean(id.trim() && name.trim() && category && sizes.every((item) => item.size.trim() && Number(item.price) > 0))
  function close() { if (saving) return; setOpen(false); setError(null) }
  function addSize() { setSizes((current) => [...current, { id: Date.now(), size: '', price: '' }]) }
  function updateSize(idToUpdate: number, field: 'size' | 'price', value: string) { setSizes((current) => current.map((item) => item.id === idToUpdate ? { ...item, [field]: value } : item)) }
  function removeSize(idToRemove: number) { setSizes((current) => current.length === 1 ? current : current.filter((item) => item.id !== idToRemove)) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedSizes = sizes.map((item) => ({ size: item.size.trim(), price: Number(item.price) }))
    if (!id.trim() || !name.trim() || !category) { setError('أكمل بيانات المنتج والفئة'); return }
    if (normalizedSizes.some((item) => !item.size || !Number.isFinite(item.price) || item.price <= 0 || Math.round(item.price * 100) !== item.price * 100)) { setError('تحقق من المقاسات والأسعار، ويجب أن يكون السعر موجبًا'); return }
    if (new Set(normalizedSizes.map((item) => item.size)).size !== normalizedSizes.length) { setError('لا يمكن تكرار المقاس داخل المنتج'); return }
    setSaving(true)
    try { await createCatalogProduct({ productId: id.trim(), productName: name.trim(), categoryId: category.id, categoryName: category.name, ingredients: ingredients.trim(), subcategoryId: subcategoryId || undefined, subcategoryName: subcategories.find((item) => item.id === subcategoryId)?.name, sizes: normalizedSizes }); setId(''); setName(''); setIngredients(''); setSizes([{ id: 1, size: '', price: '' }]); setOpen(false); setError(null); await onCreated() }
    catch (createError) { setError(friendlyCatalogError(createError, 'تعذر إضافة المنتج')) }
    finally { setSaving(false) }
  }
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f29a4a] px-4 text-sm font-bold text-[#392313]"><Plus className="h-4 w-4" aria-hidden="true" /> منتج جديد</button>
  return (
    <div className="w-full basis-full rounded-2xl border border-[#e5ded1] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="font-bold">إضافة منتج جديد</h2><p className="mt-1 text-xs text-[#7c847b]">سيُحفظ المنتج عبر RPC الكتالوج، دون كتابة مباشرة للجدول.</p></div>
        <button type="button" onClick={close} disabled={saving} className="text-sm font-bold text-[#687268]">إلغاء</button>
      </div>
      <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#687268]">معرف المنتج<input required value={id} onChange={(event) => setId(event.target.value)} placeholder="مثال: p181-new" dir="ltr" className="mt-1 w-full rounded-xl border border-[#e5ded1] px-3 py-2 text-sm" /></label>
        <label className="text-xs font-bold text-[#687268]">اسم المنتج<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ded1] px-3 py-2 text-sm" /></label>
        <label className="text-xs font-bold text-[#687268]">الفئة<select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSubcategoryId('') }} className="mt-1 w-full rounded-xl border border-[#e5ded1] bg-white px-3 py-2 text-sm">{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {subcategories.length > 0 && <label className="text-xs font-bold text-[#687268]">التصنيف الفرعي<select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ded1] bg-white px-3 py-2 text-sm"><option value="">بدون تصنيف فرعي</option>{subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="text-xs font-bold text-[#687268] sm:col-span-2">المكونات<input value={ingredients} onChange={(event) => setIngredients(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5ded1] px-3 py-2 text-sm" /></label>
        <div className="sm:col-span-2"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-[#687268]">المقاسات والأسعار</p><button type="button" onClick={addSize} className="text-xs font-bold text-[#2f805e]">+ إضافة مقاس</button></div><div className="space-y-2">{sizes.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"><input required value={item.size} onChange={(event) => updateSize(item.id, 'size', event.target.value)} placeholder="المقاس" className="min-w-0 rounded-xl border border-[#e5ded1] px-3 py-2 text-sm" /><input required type="number" min="0.01" step="0.01" value={item.price} onChange={(event) => updateSize(item.id, 'price', event.target.value)} placeholder="السعر" className="min-w-0 rounded-xl border border-[#e5ded1] px-3 py-2 text-sm" />{sizes.length > 1 ? <button type="button" onClick={() => removeSize(item.id)} aria-label="حذف المقاس" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f2d4c5] text-[#c5683e]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button> : <span />}</div>)}</div></div>
        {error && <p className="rounded-xl bg-[#fff0e7] px-3 py-2 text-xs font-bold text-[#c5683e] sm:col-span-2">{error}</p>}
        <button type="submit" disabled={!canSubmit || saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2f805e] px-5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'جارِ الإضافة...' : <><Check className="h-4 w-4" aria-hidden="true" /> حفظ المنتج</>}</button>
      </form>
    </div>
  )
}

function Alert({ children }: { children: ReactNode }) { return <div className="mb-4 rounded-xl bg-[#fff0e7] px-4 py-3 text-sm font-bold text-[#c5683e]">{children}</div> }
function Notice({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) { return <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#e3f2e8] px-4 py-3 text-sm font-bold text-[#2f805e]"><span>{children}</span><button type="button" onClick={onDismiss} aria-label="إغلاق الرسالة">×</button></div> }
function Message({ children }: { children: ReactNode }) { return <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf6] px-6 text-center text-[#687268]">{children}</div> }
