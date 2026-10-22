import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { SearchableProduct } from '../data/menu'
import type { Category } from '../types/menu'
import { textMatches } from '../utils/search'
import ProductCard from './ProductCard'

interface SearchOverlayProps {
  categories: Category[]
  onClose: () => void
}

function flattenCategories(categories: Category[]): SearchableProduct[] {
  const products: SearchableProduct[] = []
  for (const category of categories) {
    for (const product of category.products ?? []) {
      products.push({ product, categoryId: category.id, categoryName: category.name })
    }
    for (const subcategory of category.subcategories ?? []) {
      for (const product of subcategory.products) {
        products.push({
          product,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: subcategory.id,
          subcategoryName: subcategory.name,
        })
      }
    }
  }
  return products
}

export default function SearchOverlay({ categories, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const allProducts = flattenCategories(categories)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const results = query.trim()
    ? allProducts.filter(
        ({ product, categoryName, subcategoryName }) =>
          textMatches(product.name, query) ||
          (product.ingredients && textMatches(product.ingredients, query)) ||
          textMatches(categoryName, query) ||
          (subcategoryName && textMatches(subcategoryName, query)),
      )
    : []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="بحث في المنيو"
      className="fixed inset-0 z-40 flex flex-col bg-[#fbfaf6]"
    >
      <div className="flex items-center gap-2 border-b border-[#e8e0d2] px-4 py-4">
        <Search className="h-5 w-5 shrink-0 text-[#2f805e]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج، مثل مانجا أو لبن..."
          className="min-w-0 flex-1 bg-transparent text-[#20352a] placeholder:text-[#a0a69e] outline-none text-[15px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="مسح البحث"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667367] hover:bg-[#f0ece4] active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق البحث"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#667367] hover:bg-[#f0ece4] active:scale-95"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!query.trim() && (
          <p className="text-center text-sm text-[#8a9187] mt-10">اكتب اسم منتج أو مكوّن للبحث في المنيو كله</p>
        )}

        {query.trim() && results.length === 0 && (
          <p className="text-center text-sm text-[#8a9187] mt-10">لم نجد منتجات مطابقة لبحثك</p>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2 pb-6">
            {results.map(({ product, categoryName, subcategoryName }) => (
              <div key={product.id}>
                <p className="text-[11px] text-[#a86028] font-semibold mb-1">
                  {categoryName}
                  {subcategoryName ? ` · ${subcategoryName}` : ''}
                </p>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
