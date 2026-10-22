import { useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import type { Product } from '../types/menu'
import { useCart } from '../context/CartContext'
import SizeSelector from './SizeSelector'
import { MAX_QUANTITY } from '../context/CartContext'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addLine } = useCart()
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]?.label ?? '')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const activeSize = product.sizes.find((s) => s.label === selectedSize) ?? product.sizes[0]

  function handleAdd() {
    if (!activeSize) return
    addLine({
      productId: product.id,
      productName: product.name,
      sizeLabel: activeSize.label,
      unitPrice: activeSize.price,
      quantity,
      notes,
    })
    setQuantity(1)
    setNotes('')
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1400)
  }

  return (
    <article className="min-w-0 rounded-[16px] border border-[#e8e0d2] bg-white shadow-[0_5px_16px_rgba(56,44,24,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_20px_rgba(56,44,24,0.09)]">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 p-3.5 text-right">
        <span className="min-w-0"><span className="block truncate font-bold text-[15px] leading-snug text-[#20352a]">{product.name}</span>
          {product.ingredients && <span className="mt-0.5 block truncate text-[11px] text-[#7c847b]">{product.ingredients}</span>}
        </span>
        <span className="shrink-0 rounded-full bg-[#f4efe5] px-2.5 py-1 text-xs font-extrabold text-[#2f805e]">{activeSize?.price} ج.م</span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><div className="flex flex-col gap-3 border-t border-[#eee8dd] px-3.5 pb-3.5 pt-3">
        <div className="min-w-0">
            {product.ingredients && (
              <p className="sr-only">{product.ingredients}</p>
            )}
            {product.needsReview && (
              <p className="mt-1 inline-flex items-center gap-1 rounded bg-[#fff0e7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#c5683e]">
                السعر قيد المراجعة اليدوية
              </p>
            )}
        </div>
      <div className="flex flex-col gap-3">
        <SizeSelector sizes={product.sizes} selectedLabel={activeSize?.label ?? ''} onSelect={setSelectedSize} />

        <label className="block">
          <span className="sr-only">ملاحظات على الطلب (اختياري)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="ملاحظات على الطلب (اختياري)"
            className="block w-full resize-none rounded-xl border border-[#e8e0d2] bg-[#faf8f3] px-3 py-2 text-[12px] leading-5 text-[#20352a] outline-none placeholder:text-[#9aa198] focus:border-[#2f805e] focus:ring-2 focus:ring-[#2f805e]/10"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center rounded-full border border-[#e6dfd3] bg-[#faf8f3]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="إنقاص الكمية"
              className="flex h-9 w-9 items-center justify-center text-[#5f6c61] active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="w-5 text-center text-sm font-bold text-[#20352a]" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              aria-label="زيادة الكمية"
              className="flex h-9 w-9 items-center justify-center text-[#5f6c61] active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!activeSize}
            aria-label={`أضف ${product.name} للطلب`}
            className={
              'flex h-10 min-w-[106px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors active:scale-95 disabled:opacity-40 ' +
              (justAdded ? 'bg-[#2f805e] text-white' : 'bg-[#f29a4a] text-[#392313] hover:bg-[#f5aa63]')
            }
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {justAdded ? 'أُضيف' : 'أضف'}
          </button>
        </div>
      </div></div></div></div>
    </article>
  )
}
