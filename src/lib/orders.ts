import { supabase } from './supabase'
import type { CartLine } from '../types/cart'
import type { OrderStatus, OrderWithItems } from '../types/order'
import { ORDER_STATUS_SEQUENCE } from '../types/order'

export class OrderError extends Error {
  /** Arabic message safe to show directly to a customer. */
  userMessage: string
  constructor(userMessage: string, technicalMessage?: string) {
    super(technicalMessage ?? userMessage)
    this.userMessage = userMessage
  }
}

function requireClient() {
  if (!supabase) {
    throw new OrderError(
      'الطلبات غير مفعّلة على هذا الجهاز حاليًا، برجاء المحاولة لاحقًا',
      'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)',
    )
  }
  return supabase
}

/** Generates a short, non-sequential, human-readable public order code, e.g. "CD-8F42K".
 *  This is display-only — the actual access token is a separate random UUID
 *  (see `createOrder`) so guessing this code doesn't expose anyone else's order. */
export interface CreatedOrder {
  id: string
  public_token: string
  display_code: string
  total_amount: number
  created_at: string
}

/** The database catalog, not the browser cart, is authoritative for names and prices. */
export async function createOrder(cartLines: CartLine[]): Promise<CreatedOrder> {
  const client = requireClient()

  if (cartLines.length === 0) {
    throw new OrderError('السلة فارغة، أضف منتجًا قبل إرسال الطلب')
  }

  const items = cartLines.map((line) => ({
    product_id: line.productId,
    size: line.sizeLabel,
    quantity: line.quantity,
    notes: line.notes,
  }))
  const { data, error } = await client.rpc('create_order', { p_items: items })
  if (error || !data) {
    throw new OrderError('تعذر إرسال الطلب، برجاء المحاولة مرة أخرى', error?.message)
  }
  return data as CreatedOrder
}

/**
 * Customers (anon key) never get a direct SELECT policy on `orders` /
 * `order_items` — only the barista's authenticated session does (see
 * supabase/migrations/). Instead, a customer fetches their order through the
 * `get_order_by_token` SQL function: a SECURITY DEFINER RPC that only ever
 * returns the one order matching the token supplied. Knowledge of the
 * (random, unguessable) token is the access control here, same model as a
 * checkout/share link.
 */
export async function getOrderByToken(token: string): Promise<OrderWithItems | null> {
  const client = requireClient()

  const { data, error } = await client.rpc('get_order_by_token', { p_token: token })
  if (error) throw new OrderError('تعذر تحميل بيانات الطلب', error.message)
  if (!data) return null

  return data as OrderWithItems
}

/**
 * Polls for order updates rather than subscribing to Realtime: the anon
 * role has no table-level SELECT on `orders`, so a `postgres_changes`
 * subscription has nothing to authorize against. Polling every few seconds
 * is the "robust fallback" the customer order page uses instead of faking
 * realtime it can't actually have under this RLS model.
 */
export function subscribeToOrder(token: string, onChange: (order: OrderWithItems) => void) {
  let cancelled = false
  const interval = window.setInterval(async () => {
    try {
      const fresh = await getOrderByToken(token)
      if (fresh && !cancelled) onChange(fresh)
    } catch {
      // Transient network hiccups shouldn't stop future polls.
    }
  }, 4000)

  return () => {
    cancelled = true
    window.clearInterval(interval)
  }
}

/** Fetches the most recent orders (all statuses), newest first — the barista dashboard's main feed.
 *  Requires a signed-in (authenticated) session: the anon role has no SELECT
 *  policy on this table (see supabase/migrations/), so this call fails for a
 *  logged-out visitor rather than silently exposing every order. */
export async function listOrders(limit = 100): Promise<OrderWithItems[]> {
  const client = requireClient()
  const { data: orders, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new OrderError('تعذر تحميل الطلبات', error.message)
  if (!orders || orders.length === 0) return []

  const { data: items, error: itemsError } = await client
    .from('order_items')
    .select('*')
    .in(
      'order_id',
      orders.map((o) => o.id),
    )

  if (itemsError) throw new OrderError('تعذر تحميل عناصر الطلبات', itemsError.message)

  return orders.map((o) => ({ ...o, items: (items ?? []).filter((i) => i.order_id === o.id) }))
}

/** Subscribes to any insert/update on orders — refreshes the barista dashboard live. */
export function subscribeToOrderFeed(onChange: () => void) {
  const client = requireClient()
  const poll = window.setInterval(onChange, 10000)
  const channel = client
    .channel('orders-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => onChange())
    .subscribe()

  return () => {
    window.clearInterval(poll)
    client.removeChannel(channel)
  }
}

/** Moves an order forward one step in the pipeline. Refuses to move backward or skip. */
export async function advanceOrderStatus(orderId: string, currentStatus: OrderStatus) {
  const client = requireClient()
  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(currentStatus)
  const next = ORDER_STATUS_SEQUENCE[currentIndex + 1]
  if (!next) return

  const { error } = await client.rpc('advance_order_status', {
    p_order_id: orderId,
    p_new_status: next,
  })

  if (error) throw new OrderError('تعذر تحديث حالة الطلب', error.message)
}

export async function deleteCompletedOrders(): Promise<number> {
  const { data, error } = await requireClient().rpc('admin_delete_completed_orders')
  if (error) throw new OrderError('تعذر حذف الطلبات المكتملة', error.message)
  return Number(data ?? 0)
}
