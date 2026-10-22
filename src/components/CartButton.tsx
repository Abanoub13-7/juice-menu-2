import { ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'

interface CartButtonProps {
  onOpen: () => void
}

export default function CartButton({ onOpen }: CartButtonProps) {
  const { itemCount, subtotal } = useCart()

  if (itemCount === 0) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`طلبك: ${itemCount} صنف بإجمالي ${subtotal} جنيه`}
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-2xl items-center justify-between rounded-[20px] bg-[#f29a4a] px-5 py-3.5 shadow-[0_12px_30px_rgba(113,62,19,0.2)] active:scale-[0.98] transition-transform"
    >
      <span className="flex items-center gap-2 font-bold text-[#392313]">
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        طلبك
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#392313] px-1 text-[11px] font-extrabold text-[#fbd27d]">
          {itemCount}
        </span>
      </span>
      <span className="font-extrabold text-[#392313]">{subtotal} ج.م</span>
    </button>
  )
}
