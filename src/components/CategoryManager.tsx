import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { CatalogError, deleteMenuCategory, moveMenuCategory, saveMenuCategory, type MenuCategory } from '../lib/catalog'

const blankCategory = (sortOrder: number): MenuCategory => ({ id: '', name: '', image_url: null, sort_order: sortOrder, is_active: true })

type Props = { categories: MenuCategory[]; onRefresh: () => Promise<void>; onNotice: (message: string) => void }

function categoryError(error: unknown, fallback: string) {
  if (!(error instanceof CatalogError)) return fallback
  if (error.message.toLowerCase().includes('has products')) return 'لا يمكن حذف فئة مرتبطة بمنتجات. عطّلها بدلاً من ذلك.'
  if (error.message.toLowerCase().includes('admin role')) return 'هذا الإجراء متاح لحسابات الإدارة فقط'
  return error.userMessage || fallback
}

export default function CategoryManager({ categories, onRefresh, onNotice }: Props) {
  const [draft, setDraft] = useState<MenuCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = Boolean(draft && categories.some((category) => category.id === draft.id))

  async function run(action: () => Promise<void>, success: string, failure: string) {
    setSaving(true)
    try { await action(); await onRefresh(); onNotice(success); setError(null) }
    catch (actionError) { setError(categoryError(actionError, failure)) }
    finally { setSaving(false) }
  }

  async function save() {
    if (!draft?.name.trim()) { setError('اسم الفئة مطلوب'); return }
    if (!draft.id.trim() || !/^[a-z0-9-]+$/.test(draft.id.trim())) { setError('المعرف يستخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة فقط'); return }
    const wasEditing = categories.some((category) => category.id === draft.id)
    await run(() => saveMenuCategory({ ...draft, id: draft.id.trim(), name: draft.name.trim(), image_url: draft.image_url?.trim() || null }), wasEditing ? 'تم تحديث الفئة بنجاح' : 'تمت إضافة الفئة بنجاح', 'تعذر حفظ الفئة')
    setDraft(null)
  }

  return (
    <section className="mb-8 rounded-2xl border border-[#e8e0d2] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-bold">إدارة الفئات</h2><p className="text-xs text-[#7c847b]">الاسم والصورة والترتيب والحالة تظهر فورًا في المنيو الحي.</p></div>
        <button type="button" onClick={() => { setError(null); setDraft(blankCategory(categories.length + 1)) }} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-[#f29a4a] px-3 text-xs font-bold text-[#392313]"><Plus className="h-4 w-4" aria-hidden="true" />إضافة فئة</button>
      </div>
      {error && <p className="mb-3 rounded-xl bg-[#fff0e7] px-3 py-2 text-xs font-bold text-[#c5683e]">{error}</p>}
      {categories.length === 0 ? <p className="rounded-xl bg-[#faf8f3] p-3 text-sm text-[#7c847b]">لا توجد فئات بعد.</p> : <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((category, index) => <div key={category.id} className="flex items-center gap-3 rounded-xl bg-[#faf8f3] p-2">
          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e9efe8]">{category.image_url ? <img src={category.image_url} alt="" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : '—'}</div>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{category.name}</p><p className="text-[11px] text-[#7c847b]">ترتيب {category.sort_order} · {category.is_active ? 'نشطة' : 'متوقفة'}</p></div>
          <div className="flex shrink-0 gap-1">
            <button type="button" title="تحريك لأعلى" aria-label={`تحريك ${category.name} لأعلى`} onClick={() => void run(() => moveMenuCategory(category.id, -1), 'تم تغيير ترتيب الفئة', 'تعذر تغيير ترتيب الفئة')} disabled={saving || index === 0} className="rounded-lg p-1.5 disabled:opacity-35"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" title="تحريك لأسفل" aria-label={`تحريك ${category.name} لأسفل`} onClick={() => void run(() => moveMenuCategory(category.id, 1), 'تم تغيير ترتيب الفئة', 'تعذر تغيير ترتيب الفئة')} disabled={saving || index === categories.length - 1} className="rounded-lg p-1.5 disabled:opacity-35"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" title={category.is_active ? 'تعطيل' : 'تفعيل'} aria-label={`${category.is_active ? 'تعطيل' : 'تفعيل'} ${category.name}`} onClick={() => void run(() => saveMenuCategory({ ...category, is_active: !category.is_active }), category.is_active ? 'تم تعطيل الفئة' : 'تم تفعيل الفئة', 'تعذر تغيير حالة الفئة')} disabled={saving} className={`rounded-lg p-1.5 ${category.is_active ? 'text-[#c5683e]' : 'text-[#2f805e]'}`}><Power className="h-4 w-4" /></button>
            <button type="button" title="تعديل" aria-label={`تعديل ${category.name}`} onClick={() => { setError(null); setDraft({ ...category }) }} disabled={saving} className="rounded-lg p-1.5"><Pencil className="h-4 w-4" /></button>
            <button type="button" title="حذف" aria-label={`حذف ${category.name}`} onClick={() => { if (window.confirm(`هل أنت متأكد من حذف الفئة «${category.name}»؟ لن تُحذف أي منتجات.`)) void run(() => deleteMenuCategory(category.id), 'تم حذف الفئة بنجاح', 'تعذر حذف الفئة') }} disabled={saving} className="rounded-lg p-1.5 text-[#c5683e]"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>)}
      </div>}
      {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={editing ? 'تعديل الفئة' : 'إضافة فئة'}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><h3 className="font-bold">{editing ? 'تعديل الفئة' : 'إضافة فئة'}</h3><div className="mt-3 space-y-3">
          <label className="block text-xs font-bold text-[#687268]">معرف الفئة<input disabled={editing || saving} value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} placeholder="مثال: hot-drinks" dir="ltr" className="mt-1 w-full rounded-xl border border-[#e5ded1] p-2 text-sm disabled:bg-[#faf8f3]" /></label>
          <label className="block text-xs font-bold text-[#687268]">اسم الفئة<input disabled={saving} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full rounded-xl border border-[#e5ded1] p-2 text-sm" /></label>
          <label className="block text-xs font-bold text-[#687268]">رابط الصورة (اختياري)<input disabled={saving} value={draft.image_url ?? ''} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} type="url" dir="ltr" className="mt-1 w-full rounded-xl border border-[#e5ded1] p-2 text-sm" /></label>
          <label className="flex items-center gap-2 text-sm"><input disabled={saving} type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />نشطة وتظهر للزوار</label>
          <div className="flex gap-2"><button type="button" onClick={() => { if (!saving) { setDraft(null); setError(null) } }} disabled={saving} className="rounded-xl border border-[#e5ded1] px-4 py-2 text-sm">إلغاء</button><button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl bg-[#2f805e] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'جارِ الحفظ...' : 'حفظ'}</button></div>
        </div></div>
      </div>}
    </section>
  )
}
