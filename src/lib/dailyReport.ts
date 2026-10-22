import { supabase } from './supabase'
import { OrderError } from './orders'
import type { OrderItemRecord, OrderRecord, OrderWithItems } from '../types/order'
import { BUSINESS_TIME_ZONE } from '../utils/format'

/**
 * Read-only data access for the daily order report.
 * It only SELECTs from the existing `orders` / `order_items` tables through the
 * signed-in (authenticated) session, so the existing RLS policies decide what is
 * visible. Nothing here writes, and no new database objects are required.
 */

const PAGE_SIZE = 1000
const ID_CHUNK = 100

function requireClient() {
  if (!supabase) {
    throw new OrderError('التقرير غير متاح — لم يتم ربط قاعدة البيانات', 'Supabase is not configured')
  }
  return supabase
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const asUtc = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'))
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** The UTC instant at which calendar day `dateStr` (YYYY-MM-DD) begins in `timeZone`. */
export function startOfZonedDay(dateStr: string, timeZone: string = BUSINESS_TIME_ZONE): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const guess = Date.UTC(year, month - 1, day)
  const first = guess - zoneOffsetMs(guess, timeZone)
  return new Date(guess - zoneOffsetMs(first, timeZone))
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Today's calendar date (YYYY-MM-DD) in the business time zone. */
export function todayInBusinessZone(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

/**
 * Fetches EVERY order created on `dateStr` (business-local day) with its items.
 * Pages through results until the server returns an empty page, so it stays
 * correct even if the project's max-rows setting is lower than PAGE_SIZE.
 * No status filter is applied: all statuses are included.
 */
export async function listOrdersForDay(dateStr: string): Promise<OrderWithItems[]> {
  if (!isValidDateString(dateStr)) throw new OrderError('تاريخ غير صالح')
  const client = requireClient()
  const startIso = startOfZonedDay(dateStr).toISOString()
  const endIso = startOfZonedDay(addDaysToDateString(dateStr, 1)).toISOString()

  const orders = new Map<string, OrderRecord>()
  for (let from = 0; ; ) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new OrderError('تعذر تحميل طلبات اليوم', error.message)
    const rows = (data ?? []) as OrderRecord[]
    if (rows.length === 0) break
    for (const row of rows) orders.set(row.id, row)
    from += rows.length
  }

  const orderList = Array.from(orders.values())
  const itemsByOrder = new Map<string, OrderItemRecord[]>()
  for (let index = 0; index < orderList.length; index += ID_CHUNK) {
    const ids = orderList.slice(index, index + ID_CHUNK).map((order) => order.id)
    const seen = new Set<string>()
    for (let from = 0; ; ) {
      const { data, error } = await client
        .from('order_items')
        .select('*')
        .in('order_id', ids)
        .order('order_id', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw new OrderError('تعذر تحميل عناصر الطلبات', error.message)
      const rows = (data ?? []) as OrderItemRecord[]
      if (rows.length === 0) break
      for (const row of rows) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        const list = itemsByOrder.get(row.order_id) ?? []
        list.push(row)
        itemsByOrder.set(row.order_id, list)
      }
      from += rows.length
    }
  }

  return orderList.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }))
}
