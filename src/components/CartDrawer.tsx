import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { createOrder, OrderError } from '../lib/orders'
import { isSupabaseConfigured } from '../lib/supabase'

interface CartDrawerProps {
  onClose: () => void
}

export default function CartDrawer({ onClose }: CartDrawerProps) {
  const { lines, subtotal, incrementLine, decrementLine, removeLine, clearCart } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitLock = useRef(false)
  const navigate = useNavigate()

  async function handleConfirm() {
    if (submitLock.current) return
    submitLock.current = true
    setError(null)
    setSubmitting(true)
    try {
      const order = await createOrder(lines)
      clearCart()
      onClose()
      navigate(`/order/${order.public_token}`)
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'حدث خطأ غير متوقع، برجاء المحاولة مرة أخرى')
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="مراجعة الطلب" className="fixed inset-0 z-40 flex flex-col bg-[#fbfaf6]">
      <div className="flex items-center justify-between border-b border-[#e8e0d2] px-4 py-4">
        <h2 className="font-display text-2xl font-bold text-[#20352a]">طلبك</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#667367] hover:bg-[#f0ece4] active:scale-95"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xs text-center"><p className="text-sm text-[#7c847b]">السلة فارغة، اختر منتجًا من المنيو</p></div>
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-[18px] border border-[#e8e0d2] bg-white px-3 py-3.5 shadow-sm sm:gap-3 sm:px-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-[14px] leading-snug text-[#20352a]">{line.productName}</p>
                  <p className="text-[12px] text-[#a86028]">
                    {line.sizeLabel} · {line.unitPrice} ج.م
                  </p>
                  {line.notes && (
                    <p className="mt-1.5 rounded-lg bg-[#f7f3eb] px-2 py-1 text-[11px] leading-5 text-[#687268]">
                      <span className="font-bold text-[#526157]">ملاحظات: </span>{line.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center rounded-full bg-[#faf8f3] border border-[#e6dfd3] shrink-0">
                  <button
                    type="button"
                    onClick={() => decrementLine(line.key)}
                    aria-label="إنقاص الكمية"
                    className="flex h-8 w-8 items-center justify-center text-[#5f6c61] active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-[#20352a]">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => incrementLine(line.key)}
                    aria-label="زيادة الكمية"
                    className="flex h-8 w-8 items-center justify-center text-[#5f6c61] active:scale-90"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <p className="w-14 shrink-0 text-end text-sm font-extrabold text-[#20352a]">
                  {line.unitPrice * line.quantity}
                </p>

                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  aria-label={`إزالة ${line.productName}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#c5683e] hover:bg-[#fff0e7] active:scale-90"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-[#e8e0d2] bg-white px-4 py-4">
          {!isSupabaseConfigured && (
            <p className="mb-2 rounded-lg bg-clay-500/15 px-3 py-2 text-[12.5px] text-clay-500/90 text-center">
              الطلبات غير متاحة الآن — لم يتم ربط قاعدة البيانات بعد
            </p>
          )}
          {error && (
            <p className="mb-2 rounded-lg bg-clay-500/15 px-3 py-2 text-[12.5px] text-clay-500/90 text-center">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#7c847b]">الإجمالي</span>
            <span className="font-display text-xl text-[#2f805e]">{subtotal} ج.م</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !isSupabaseConfigured}
            className="w-full rounded-[16px] bg-[#2f805e] py-3.5 text-center font-bold text-white transition-colors hover:bg-[#276d4f] active:scale-[0.98] disabled:opacity-40"
          >
            {submitting ? 'جارِ إرسال الطلب...' : 'تأكيد الطلب'}
          </button>
        </div>
      )}
    </div>
  )
}
