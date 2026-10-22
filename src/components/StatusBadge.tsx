import type { OrderStatus } from '../types/order'
import { ORDER_STATUS_LABELS_AR } from '../types/order'

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: 'bg-[#e8f2f7] text-[#32718a] border-[#c7e0ea]',
  preparing: 'bg-[#fff3dd] text-[#a86028] border-[#f7d4a0]',
  ready: 'bg-[#e4f3e9] text-[#2f805e] border-[#bfe2ca]',
  completed: 'bg-[#f0eee9] text-[#687268] border-[#dedbd3]',
}

export default function StatusBadge({ status, large }: { status: OrderStatus; large?: boolean }) {
  return (
    <span
      className={
        `inline-flex items-center rounded-full border font-bold ${STATUS_STYLES[status]} ` +
        (large ? 'px-4 py-1.5 text-base' : 'px-2.5 py-1 text-xs')
      }
    >
      {ORDER_STATUS_LABELS_AR[status]}
    </span>
  )
}
