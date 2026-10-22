import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ClipboardList, Printer } from 'lucide-react'
import { advanceOrderStatus, deleteCompletedOrders, listOrders, subscribeToOrderFeed, OrderError } from '../lib/orders'
import type { OrderStatus, OrderWithItems } from '../types/order'
import { ORDER_STATUS_LABELS_AR, ORDER_STATUS_SEQUENCE } from '../types/order'
import StatusBadge from '../components/StatusBadge'
import { isSupabaseConfigured } from '../lib/supabase'
import StaffNav from '../components/StaffNav'
import DailyOrderReport from '../components/DailyOrderReport'
import OrderInvoicePrint from '../components/OrderInvoicePrint'
import { useStaffAuth } from '../context/StaffAuthContext'

const ADVANCE_LABEL: Record<OrderStatus, string | null> = {
  new: 'ابدأ التحضير',
  preparing: 'جاهز',
  ready: 'تم التسليم',
  completed: null,
}

export default function BaristaDashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [printJob, setPrintJob] = useState<{ order: OrderWithItems; nonce: number } | null>(null)
  const { role } = useStaffAuth()
  const location = useLocation()
  const admin = role === 'admin'

  const refresh = useCallback(async () => {
    try {
      const fresh = await listOrders()
      setOrders(fresh)
      setError(null)
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تحميل الطلبات')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const unsubscribeFeed = subscribeToOrderFeed(() => void refresh())
    return () => {
      unsubscribeFeed?.()
    }
  }, [refresh])

  async function handleAdvance(order: OrderWithItems) {
    try {
      await advanceOrderStatus(order.id, order.status)
      refresh()
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تحديث حالة الطلب')
    }
  }

  async function handleDeleteCompleted() {
    if (!window.confirm('هل أنت متأكد من حذف جميع الطلبات المكتملة؟ لا يمكن التراجع عن هذا الإجراء.')) return
    try {
      const removed = await deleteCompletedOrders()
      await refresh()
      window.alert(`تم حذف ${removed} طلب مكتمل`)
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر حذف الطلبات المكتملة')
    }
  }

  if (!isSupabaseConfigured) {
    return <Centered>لوحة الباريستا غير متاحة — لم يتم ربط قاعدة البيانات بعد (راجع README)</Centered>
  }

  const columns: OrderStatus[] = ['new', 'preparing', 'ready', 'completed']

  return (
    <div className="min-h-screen bg-teal-950 text-cream p-4">
      <StaffNav admin={admin} />
      {typeof (location.state as { accessDenied?: unknown } | null)?.accessDenied === 'string' && (
        <p role="alert" className="mx-auto mb-4 max-w-6xl rounded-lg bg-clay-500/15 px-3 py-2 text-sm text-clay-500">
          {(location.state as { accessDenied: string }).accessDenied}
        </p>
      )}

      {printJob && <OrderInvoicePrint key={printJob.nonce} order={printJob.order} onDone={() => setPrintJob(null)} />}

      {showReport ? (
        <div className="mx-auto mt-4 max-w-6xl"><DailyOrderReport onClose={() => setShowReport(false)} /></div>
      ) : (
      <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setShowReport(true)} className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-2 text-xs font-bold text-teal-950 active:scale-95"><ClipboardList className="h-4 w-4" aria-hidden="true" />تقرير الطلبات اليومي</button>
        {admin && <button type="button" onClick={() => void handleDeleteCompleted()} className="rounded-full border border-clay-500/50 px-4 py-2 text-xs font-bold text-clay-500 hover:bg-clay-500/10">حذف كل الطلبات المكتملة</button>}
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-clay-500/15 px-3 py-2 text-sm text-clay-500">
          <p>{error}</p>
          <button type="button" onClick={refresh} className="shrink-0 font-bold underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((status) => {
          const inColumn = orders.filter((o) => o.status === status)
          return (
            <div key={status} className="rounded-xl bg-teal-900/60 border border-white/5 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-sm">{ORDER_STATUS_LABELS_AR[status]}</h2>
                <span className="text-[11px] text-cream/40">{inColumn.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {inColumn.map((order) => (
                  <OrderCard key={order.id} order={order} onAdvance={() => handleAdvance(order)} onPrint={() => setPrintJob({ order, nonce: Date.now() })} />
                ))}
                {inColumn.length === 0 && (
                  <p className="text-[12px] text-cream/30 text-center py-6">لا توجد طلبات</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}

function OrderCard({ order, onAdvance, onPrint }: { order: OrderWithItems; onAdvance: () => void; onPrint: () => void }) {
  const advanceLabel = ADVANCE_LABEL[order.status]
  const nextIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status) + 1
  const canAdvance = nextIndex < ORDER_STATUS_SEQUENCE.length

  return (
    <div className="rounded-lg bg-teal-800/60 border border-white/5 p-3 print:text-black print:bg-white">
      <div className="flex items-center justify-between mb-1.5">
        <span dir="ltr" className="font-mono text-xs font-bold text-gold-300">
          {order.display_code}
        </span>
        <span className="text-[10.5px] text-cream/40">
          {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 mb-2">
        {order.items.map((item) => (
          <div key={item.id} className="text-[13px] text-cream/90">
            <p>{item.product_name_snapshot} <span className="text-cream/50">({item.size})</span> × {item.quantity}</p>
            {item.notes && <p className="mt-1 rounded-md bg-gold-300/10 px-2 py-1 text-[11px] leading-5 text-gold-200"><span className="font-bold">ملاحظات: </span>{item.notes}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={order.status} />
        <span className="font-bold text-sm text-gold-200">{order.total_amount} ج.م</span>
      </div>

      <div className="flex gap-1.5">
        {canAdvance && advanceLabel && (
          <button
            type="button"
            onClick={onAdvance}
            className="flex-1 rounded-full bg-gold-400 py-1.5 text-xs font-bold text-teal-950 active:scale-95"
          >
            {advanceLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          aria-label="طباعة الطلب"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-950/60 border border-white/10 text-cream/70 active:scale-95"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-6 text-center text-cream/70 text-sm">{children}</div>
}
