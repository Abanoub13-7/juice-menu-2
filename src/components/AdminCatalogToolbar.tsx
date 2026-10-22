import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { ALL, NO_SUBCATEGORY, type CategoryOption } from '../lib/catalogFilter'

type Props = {
  query: string
  onQueryChange: (value: string) => void
  categories: CategoryOption[]
  categoryId: string
  subcategoryId: string
  onCategoryChange: (id: string) => void
  onSubcategoryChange: (id: string) => void
  /** Number of products matching the current search, per category id (search applied, category not). */
  searchCounts: Record<string, number>
  searchTotal: number
  /** Matching products per subcategory id inside the selected category. */
  subcategoryCounts: Record<string, number>
  shown: number
  total: number
}

function Chip({ active, dimmed, onClick, children }: { active: boolean; dimmed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-bold ${
        active ? 'border-[#2f805e] bg-[#2f805e] text-white' : `border-[#e5ded1] bg-white text-[#526157] ${dimmed ? 'opacity-50' : ''}`
      }`}
    >
      {children}
    </button>
  )
}

export default function AdminCatalogToolbar(props: Props) {
  const { query, onQueryChange, categories, categoryId, subcategoryId, onCategoryChange, onSubcategoryChange, searchCounts, searchTotal, subcategoryCounts, shown, total } = props
  const selected = categories.find((category) => category.id === categoryId)
  const hasQuery = query.trim().length > 0

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-[#e8e0d2] bg-white p-3 sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c847b]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ابحث عن منتج بالاسم..."
          aria-label="بحث في المنتجات"
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-[#e5ded1] bg-[#fffdfa] pe-10 ps-10 text-sm font-bold outline-none focus:border-[#2f805e] [&::-webkit-search-cancel-button]:hidden"
        />
        {hasQuery && (
          <button type="button" onClick={() => onQueryChange('')} aria-label="مسح البحث" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#687268]">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="تصفية حسب الفئة">
        <Chip active={categoryId === ALL} onClick={() => onCategoryChange(ALL)}>كل المنتجات ({searchTotal})</Chip>
        {categories.map((category) => {
          const count = searchCounts[category.id] ?? 0
          return (
            <Chip key={category.id} active={categoryId === category.id} dimmed={hasQuery && count === 0} onClick={() => onCategoryChange(category.id)}>
              {category.name}{category.isActive ? '' : ' (متوقفة)'} ({count})
            </Chip>
          )
        })}
      </div>

      {selected && (selected.subcategories.length > 0) && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="تصفية حسب التصنيف الفرعي">
          <Chip active={subcategoryId === ALL} onClick={() => onSubcategoryChange(ALL)}>كل التصنيفات الفرعية</Chip>
          {selected.subcategories.map((sub) => (
            <Chip key={sub.id} active={subcategoryId === sub.id} dimmed={hasQuery && (subcategoryCounts[sub.id] ?? 0) === 0} onClick={() => onSubcategoryChange(sub.id)}>
              {sub.name} ({subcategoryCounts[sub.id] ?? 0})
            </Chip>
          ))}
          {selected.hasUnsubcategorized && (
            <Chip active={subcategoryId === NO_SUBCATEGORY} onClick={() => onSubcategoryChange(NO_SUBCATEGORY)}>بدون تصنيف فرعي ({subcategoryCounts[NO_SUBCATEGORY] ?? 0})</Chip>
          )}
        </div>
      )}

      <p className="text-xs text-[#7c847b]" aria-live="polite">عرض {shown} من {total} منتج</p>
    </div>
  )
}
