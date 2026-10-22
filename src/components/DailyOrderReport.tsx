import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { OrderError } from '../lib/orders'
import { isValidDateString, listOrdersForDay, todayInBusinessZone } from '../lib/dailyReport'
import type { OrderStatus, OrderWithItems } from '../types/order'
import { ORDER_STATUS_LABELS_AR, ORDER_STATUS_SEQUENCE } from '../types/order'
import StatusBadge from './StatusBadge'
import { formatMoney, formatOrderTime, formatPlainNumber } from '../utils/format'

/** Read-only daily order report. Never creates, updates, deletes or advances an order. */

const toCents = (value: number) => Math.round(Number(value) * 100)

function formatLongDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

export default function DailyOrderReport({ onClose }: { onClose: () => void }) {
  const today = todayInBusinessZone()
  const [date, setDate] = useState(today)
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const requestId = useRef(0)

  const load = useCallback(async (target: string) => {
    if (!isValidDateString(target)) return
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await listOrdersForDay(target)
      if (current !== requestId.current) return
      setOrders(result)
      setExpanded(new Set())
    } catch (err) {
      if (current !== requestId.current) return
      setOrders([])
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تحميل التقرير')
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  const summary = useMemo(() => {
    const byStatus = new Map<OrderStatus, { count: number; cents: number }>()
    let cents = 0
    for (const order of orders) {
      const orderCents = toCents(order.total_amount)
      cents += orderCents
      const entry = byStatus.get(order.status) ?? { count: 0, cents: 0 }
      entry.count += 1
      entry.cents += orderCents
      byStatus.set(order.status, entry)
    }
    return { count: orders.length, total: cents / 100, byStatus }
  }, [orders])

  const relation = date === today ? 'today' : date < today ? 'past' : 'future'
  const allExpanded = orders.length > 0 && expanded.size === orders.length

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section dir="rtl" className="rounded-2xl bg-[#fbfaf6] p-4 text-[#20352a] sm:p-5" aria-label="تقرير الطلبات اليومي">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">تقرير الطلبات اليومي</h2>
          <p className="mt-1 text-xs text-[#7c847b]">للمراجعة فقط — لا يغيّر أي طلب. اليوم يبدأ وينتهي بتوقيت القاهرة.</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-10 rounded-full border border-[#e5ded1] bg-white px-4 text-sm font-bold text-[#526157]">
          العودة للطلبات
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#e8e0d2] bg-white p-3">
        <label className="text-xs font-bold text-[#687268]">
          تاريخ التقرير
          <input
            type="date"
            value={date}
            max={today}
            onChange={(event) => { if (isValidDateString(event.target.value)) setDate(event.target.value) }}
            className="mt-1 block min-h-10 rounded-xl border border-[#e5ded1] px-3 text-sm font-bold text-[#20352a]"
          />
        </label>
        {date !== today && (
          <button type="button" onClick={() => setDate(today)} className="min-h-10 rounded-full bg-[#2f805e] px-4 text-xs font-bold text-white">
            اليوم الحالي
          </button>
        )}
        <button type="button" onClick={() => void load(date)} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e5ded1] px-4 text-xs font-bold text-[#526157] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> تحديث
        </button>
        <div className="min-w-[12rem] flex-1 text-sm">
          <p className="font-bold">{formatLongDate(date)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${relation === 'today' ? 'bg-[#e3f2e8] text-[#2f805e]' : 'bg-[#fff3dd] text-[#a86028]'}`}>
              {relation === 'today' ? 'اليوم الحالي' : relation === 'past' ? 'تاريخ سابق' : 'تاريخ مستقبلي'}
            </span>
            {relation !== 'today' && <span className="text-[#7c847b]">اليوم الحالي: {formatLongDate(today)}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#fff0e7] px-4 py-3 text-sm font-bold text-[#c5683e]" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load(date)} className="shrink-0 underline">إعادة المحاولة</button>
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl border border-dashed border-[#ded5c7] bg-white px-4 py-12 text-center text-sm text-[#7c847b]" role="status">جارِ تحميل طلبات اليوم...</p>
      ) : (
        !error && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e8e0d2] bg-white p-3">
                <p className="text-xs font-bold text-[#7c847b]">عدد الطلبات</p>
                <p className="mt-1 font-display text-2xl font-bold">{formatPlainNumber(summary.count)}</p>
              </div>
              <div className="rounded-xl border border-[#e8e0d2] bg-white p-3">
                <p className="text-xs font-bold text-[#7c847b]">مجموع إجماليات الطلبات المعروضة</p>
                <p className="mt-1 font-display text-2xl font-bold">{formatMoney(summary.total)}</p>
                <p className="mt-1 text-[11px] text-[#7c847b]">هذا مجموع إجمالي الطلبات بكل حالاتها، وليس نقدًا محصّلًا أو مبيعات مكتملة.</p>
              </div>
            </div>

            {summary.count > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                {ORDER_STATUS_SEQUENCE.filter((status) => summary.byStatus.has(status)).map((status) => {
                  const entry = summary.byStatus.get(status)!
                  return (
                    <span key={status} className="inline-flex items-center gap-2 rounded-full border border-[#e8e0d2] bg-white px-3 py-1.5">
                      <StatusBadge status={status} />
                      <span className="font-bold">{formatPlainNumber(entry.count)} طلب</span>
                      <span className="text-[#7c847b]">{formatMoney(entry.cents / 100)}</span>
                    </span>
                  )
                })}
                {Array.from(summary.byStatus.entries())
                  .filter(([status]) => !ORDER_STATUS_SEQUENCE.includes(status))
                  .map(([status, entry]) => (
                    <span key={String(status)} className="inline-flex items-center gap-2 rounded-full border border-[#e8e0d2] bg-white px-3 py-1.5">
                      <span className="font-bold">{ORDER_STATUS_LABELS_AR[status] ?? String(status)}</span>
                      <span className="font-bold">{formatPlainNumber(entry.count)} طلب</span>
                      <span className="text-[#7c847b]">{formatMoney(entry.cents / 100)}</span>
                    </span>
                  ))}
              </div>
            )}

            {orders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#ded5c7] bg-white px-4 py-12 text-center text-sm text-[#7c847b]">لا توجد طلبات في هذا اليوم</p>
            ) : (
              <>
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setExpanded(allExpanded ? new Set() : new Set(orders.map((order) => order.id)))}
                    className="text-xs font-bold text-[#2f805e]"
                  >
                    {allExpanded ? 'طيّ كل التفاصيل' : 'عرض تفاصيل كل الطلبات'}
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-[#e8e0d2] bg-white">
                  <table className="w-full min-w-[34rem] text-right text-sm">
                    <thead className="bg-[#faf8f3] text-xs text-[#687268]">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">الطلب</th>
                        <th className="px-3 py-2.5 font-bold">الوقت</th>
                        <th className="px-3 py-2.5 font-bold">الأصناف</th>
                        <th className="px-3 py-2.5 font-bold">الإجمالي</th>
                        <th className="px-3 py-2.5 font-bold">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const open = expanded.has(order.id)
                        const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
                        return (
                          <Fragment key={order.id}>
                            <tr className="border-t border-[#eee8dd] align-top">
                              <td className="px-3 py-2.5">
                                <button type="button" onClick={() => toggle(order.id)} aria-expanded={open} aria-label={`تفاصيل الطلب ${order.display_code}`} className="inline-flex items-center gap-1.5 font-mono text-xs font-bold">
                                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                                  <span dir="ltr">{order.display_code}</span>
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">{formatOrderTime(order.created_at)}</td>
                              <td className="px-3 py-2.5 text-xs">
                                <p className="font-bold">{formatPlainNumber(order.items.length)} صنف · {formatPlainNumber(quantity)} قطعة</p>
                                <p className="mt-0.5 line-clamp-2 text-[#7c847b]">{order.items.map((item) => `${item.quantity}× ${item.product_name_snapshot} (${item.size})`).join('، ')}</p>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 font-bold">{formatMoney(Number(order.total_amount))}</td>
                              <td className="px-3 py-2.5"><StatusBadge status={order.status} /></td>
                            </tr>
                            {open && (
                              <tr className="bg-[#fffdfa]">
                                <td colSpan={5} className="px-3 pb-3 pt-1">
                                  {order.items.length === 0 ? (
                                    <p className="text-xs text-[#7c847b]">لا توجد عناصر متاحة لهذا الطلب</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full min-w-[26rem] text-right text-xs">
                                        <thead className="text-[#7c847b]">
                                          <tr>
                                            <th className="py-1 font-bold">المنتج</th>
                                            <th className="py-1 font-bold">المقاس</th>
                                            <th className="py-1 font-bold">الكمية</th>
                                            <th className="py-1 font-bold">سعر الوحدة</th>
                                            <th className="py-1 font-bold">الإجمالي الفرعي</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {order.items.map((item) => (
                                            <Fragment key={item.id}>
                                              <tr className="border-t border-[#f0eadf]">
                                                <td className="py-1.5 font-bold [overflow-wrap:anywhere]">{item.product_name_snapshot}</td>
                                                <td className="py-1.5">{item.size}</td>
                                                <td className="py-1.5">{formatPlainNumber(item.quantity)}</td>
                                                <td className="whitespace-nowrap py-1.5">{formatMoney(Number(item.unit_price))}</td>
                                                <td className="whitespace-nowrap py-1.5 font-bold">{formatMoney(Number(item.subtotal))}</td>
                                              </tr>
                                              {item.notes && (
                                                <tr>
                                                  <td colSpan={5} className="pb-1.5 text-[11px] text-[#a86028] [overflow-wrap:anywhere]">ملاحظات: {item.notes}</td>
                                                </tr>
                                              )}
                                            </Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-[#e8e0d2] bg-[#faf8f3] text-sm font-bold">
                      <tr>
                        <td className="px-3 py-3" colSpan={3}>مجموع إجماليات الطلبات المعروضة ({formatPlainNumber(summary.count)} طلب)</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatMoney(summary.total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </>
        )
      )}
    </section>
  )
}
