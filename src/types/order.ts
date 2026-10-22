export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed'

export const ORDER_STATUS_LABELS_AR: Record<OrderStatus, string> = {
  new: 'جديد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  completed: 'مكتمل',
}

/** Order of statuses in the barista pipeline, used for the dashboard columns
 *  and for validating that a status only ever moves forward. */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = ['new', 'preparing', 'ready', 'completed']

export interface OrderItemRecord {
  id: string
  order_id: string
  product_id: string
  product_name_snapshot: string
  size: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
}

export interface OrderRecord {
  id: string
  public_token: string
  display_code: string
  status: OrderStatus
  total_amount: number
  created_at: string
  updated_at: string
}

export interface OrderWithItems extends OrderRecord {
  items: OrderItemRecord[]
}

/** Shape sent from the client when creating an order — the server/DB layer
 *  re-derives unit_price and subtotal from trusted data rather than trusting
 *  these values outright (see lib/orders.ts). */
export interface NewOrderItemInput {
  productId: string
  productName: string
  size: string
  quantity: number
  unitPrice: number
  notes?: string
}
