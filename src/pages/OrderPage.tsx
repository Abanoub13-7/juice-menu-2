import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Copy, Printer } from 'lucide-react'
import { getOrderByToken, subscribeToOrder, OrderError } from '../lib/orders'
import type { OrderWithItems } from '../types/order'
import StatusBadge from '../components/StatusBadge'
import OrderQrCode from '../components/OrderQrCode'
import { storeConfig } from '../config/store'
import { isSupabaseConfigured } from '../lib/supabase'
import { ORDER_STATUS_LABELS_AR, ORDER_STATUS_SEQUENCE } from '../types/order'

export default function OrderPage() {
  const { token } = useParams<{ token: string }>()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('رابط الطلب غير صالح')
      return
    }
    const orderToken = token
    let unsubscribe: (() => void) | undefined

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const found = await getOrderByToken(orderToken)
        if (!found) {
          setError('لم يتم العثور على هذا الطلب')
        } else {
          setOrder(found)
          unsubscribe = subscribeToOrder(orderToken, setOrder)
        }
      } catch (err) {
        setError(err instanceof OrderError ? err.userMessage : 'تعذر تحميل الطلب')
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => unsubscribe?.()
  }, [retryKey, token])

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  if (!isSupabaseConfigured) {
    return (
      <CenteredMessage>
        الطلبات غير متاحة الآن — لم يتم ربط قاعدة البيانات بعد. راجع ملف README لإعداد Supabase.
      </CenteredMessage>
    )
  }

  if (loading) return <CenteredMessage>جارِ تحميل الطلب...</CenteredMessage>
  if (error || !order) {
    return (
      <CenteredMessage>
        <p>{error ?? 'لم يتم العثور على هذا الطلب'}</p>
        {error && (
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-3 rounded-full bg-gold-400 px-4 py-2 text-sm font-bold text-teal-950"
          >
            المحاولة مرة أخرى
          </button>
        )}
      </CenteredMessage>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#fbfaf6] px-4 py-8 text-[#20352a] print:py-2">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 print:mb-3">
          <p className="font-display text-2xl font-bold text-[#2f805e]">{storeConfig.nameAr}</p>
          <p className="text-[11px] text-[#8a9187] print:text-black">{storeConfig.nameEn}</p>
        </div>

        <div className="rounded-[24px] bg-white border border-[#e8e0d2] p-5 mb-4 shadow-sm print:border-black print:bg-white print:text-black">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-[#8a9187] print:text-black">رقم الطلب</p>
              <p dir="ltr" className="font-mono font-bold text-lg text-[#20352a] print:text-black">
                {order.display_code}
              </p>
            </div>
            <StatusBadge status={order.status} large />
          </div>

          <div className="mb-4 grid grid-cols-4 gap-1" aria-label="مراحل الطلب">
            {ORDER_STATUS_SEQUENCE.map((status, index) => {
              const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status)
              const complete = index <= currentIndex
              return (
                <div key={status} className="relative text-center">
                  {index > 0 && <span className={`absolute left-1/2 right-1/2 top-2 h-0.5 -translate-x-1/2 ${complete ? 'bg-[#2f805e]' : 'bg-[#e8e0d2]'}`} aria-hidden="true" />}
                  <span className={`relative z-10 mx-auto block h-4 w-4 rounded-full border-2 ${complete ? 'border-[#2f805e] bg-[#2f805e]' : 'border-[#d7d2c8] bg-white'}`} aria-hidden="true" />
                  <span className={`mt-1 block text-[10px] leading-tight ${complete ? 'font-bold text-[#2f805e]' : 'text-[#8a9187]'}`}>{ORDER_STATUS_LABELS_AR[status]}</span>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-[#e8e0d2] pt-3 print:border-black">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1 break-words text-[#20352a] print:text-black">
                  {item.product_name_snapshot} <span className="text-[#8a9187] print:text-black">({item.size})</span>
                  {item.notes && <p className="mt-1 text-xs leading-5 text-[#687268] print:text-black"><span className="font-bold">ملاحظات: </span>{item.notes}</p>}
                </div>
                <span className="shrink-0 text-end text-[#687268] print:text-black">
                  {item.quantity} × {item.unit_price} = {item.subtotal} ج.م
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#e8e0d2] mt-3 pt-3 print:border-black">
            <span className="font-bold text-[#20352a] print:text-black">الإجمالي</span>
            <span className="font-display text-xl text-[#2f805e] print:text-black">{order.total_amount} ج.م</span>
          </div>

          <p className="mt-2 text-[11px] text-[#8a9187] print:text-black">
            {new Date(order.created_at).toLocaleString('ar-EG')}
          </p>
        </div>

        <div className="print:hidden">
          <OrderQrCode token={order.public_token} />

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-white border border-[#e8e0d2] py-2.5 text-sm font-bold text-[#20352a] active:scale-95"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-white border border-[#e8e0d2] py-2.5 text-sm font-bold text-[#20352a] active:scale-95"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center text-cream/70 text-sm">
      {children}
    </div>
  )
}
