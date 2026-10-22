import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Search, ShieldAlert } from 'lucide-react'
import { menu } from '../data/menu'
import { getAdminCatalog, groupCatalogProducts, updateCatalogPrice, type CatalogRow, type CatalogProduct, CatalogError } from '../lib/catalog'
import { isSupabaseConfigured } from '../lib/supabase'
import StaffNav from '../components/StaffNav'
import { useStaffAuth } from '../context/StaffAuthContext'

export default function AdminPricePage() {
  const [rows, setRows] = useState<CatalogRow[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { role } = useStaffAuth()
  const isAdmin = role === 'admin'

  async function loadCatalog() {
    try {
      setError(null)
      setRows(await getAdminCatalog())
    } catch (err) {
      setError(err instanceof CatalogError ? err.userMessage : 'تعذر تحميل الأسعار')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) void loadCatalog()
    else setLoading(false)
  }, [isAdmin])

  if (!isSupabaseConfigured) return <Message>إدارة الأسعار غير متاحة — لم يتم ربط قاعدة البيانات بعد</Message>
  if (loading) return <Message>جارِ تحميل إدارة الأسعار...</Message>
  if (!isAdmin) {
    return (
      <Message>
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-[#c5683e]" aria-hidden="true" />
        <p>هذا القسم مخصص لحسابات الإدارة فقط</p>
      </Message>
    )
  }

  const products = groupCatalogProducts(rows)
  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === 'all' || product.category_name === category
    const normalizedQuery = query.trim()
    const matchesQuery = !normalizedQuery || product.product_name.includes(normalizedQuery)
    return matchesCategory && matchesQuery
  })

  return (
    <div dir="rtl" className="min-h-screen bg-[#fbfaf6] text-[#20352a]">
      <StaffNav admin />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#e5ded1] bg-white px-4 shadow-sm">
            <Search className="h-4 w-4 text-[#2f805e]" aria-hidden="true" />
            <span className="sr-only">البحث عن منتج</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم المنتج" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a0a69e]" />
          </label>
          <label className="flex min-h-12 items-center rounded-2xl border border-[#e5ded1] bg-white px-4 shadow-sm">
            <span className="sr-only">تصفية حسب الفئة</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent text-sm font-bold outline-none">
              <option value="all">كل الفئات</option>
              {menu.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="mb-4 rounded-2xl bg-[#fff0e7] px-4 py-3 text-sm font-bold text-[#c5683e]">{error}</div>}
        {filteredProducts.length === 0 && <p className="py-12 text-center text-sm text-[#7c847b]">لا توجد منتجات مطابقة</p>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((entry) => (
            <PriceCard key={entry.product_id} entry={entry} onUpdated={(updated) => setRows((current) => current.map((row) => row.product_id === updated.product_id && row.size === updated.size ? updated : row))} />
          ))}
        </div>
      </main>
    </div>
  )
}

function PriceCard({ entry, onUpdated }: { entry: CatalogProduct; onUpdated: (row: CatalogRow) => void }) {
  return (
    <article className="rounded-[22px] border border-[#e8e0d2] bg-white p-4 shadow-[0_8px_24px_rgba(56,44,24,0.05)]">
      <p className="mb-1 text-[11px] font-bold text-[#a86028]">{entry.category_name}{entry.subcategory_name ? ` · ${entry.subcategory_name}` : ''}</p>
      <h2 className="mb-4 text-base font-bold">{entry.product_name}</h2>
      <div className="space-y-2">
        {entry.sizes.map((row) => <PriceRow key={row.size} row={row} onUpdated={onUpdated} />)}
      </div>
    </article>
  )
}

function PriceRow({ row, onUpdated }: { row: CatalogRow; onUpdated: (row: CatalogRow) => void }) {
  const [draft, setDraft] = useState(String(row.unit_price))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveLock = useRef(false)

  async function save() {
    if (saveLock.current) return
    const value = Number(draft)
    if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) {
      setSaved(false)
      return
    }
    saveLock.current = true
    setSaving(true)
    try {
      setError(null)
      const updated = await updateCatalogPrice(row.product_id, row.size, value)
      onUpdated(updated)
      setDraft(String(updated.unit_price))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setError(err instanceof CatalogError ? err.userMessage : 'تعذر تحديث السعر')
    } finally {
      setSaving(false)
      saveLock.current = false
    }
  }

  return (
    <div>
    <div className="flex items-center gap-2 rounded-2xl bg-[#faf8f3] p-2">
      <span className="w-16 shrink-0 text-sm font-bold text-[#687268]">{row.size}</span>
      <input type="number" min="0.01" step="0.01" inputMode="decimal" value={draft} onChange={(event) => { setDraft(event.target.value); setSaved(false) }} aria-label={`سعر ${row.product_name} حجم ${row.size}`} className="min-w-0 flex-1 rounded-xl border border-[#e6dfd3] bg-white px-3 py-2 text-center font-bold outline-none focus:border-[#2f805e]" />
      <span className="shrink-0 text-xs text-[#7c847b]">ج.م</span>
      <button type="button" onClick={() => void save()} disabled={saving} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#2f805e] text-white disabled:opacity-50" aria-label={`حفظ سعر ${row.product_name} حجم ${row.size}`}>
        {saved ? <Check className="h-4 w-4" aria-hidden="true" /> : saving ? <span className="text-xs">...</span> : <span className="text-xs font-bold">حفظ</span>}
      </button>
    </div>
      {error && <p className="mt-1 px-2 text-[11px] font-bold text-[#c5683e]">{error}</p>}
    </div>
  )
}

function Message({ children }: { children: ReactNode }) {
  return <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[#fbfaf6] px-6 text-center text-[#687268]">{children}</div>
}
