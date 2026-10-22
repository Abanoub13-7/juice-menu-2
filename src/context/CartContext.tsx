import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartLine } from '../types/cart'
import { lookupProductSize } from '../lib/menuLookup'
import { getCatalog } from '../lib/catalog'
import { isSupabaseConfigured } from '../lib/supabase'

export const MAX_QUANTITY = 50

const STORAGE_KEY = 'city-drink-cart-v1'

interface CartContextValue {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  addLine: (input: { productId: string; productName: string; sizeLabel: string; unitPrice: number; quantity: number; notes?: string }) => void
  incrementLine: (key: string) => void
  decrementLine: (key: string) => void
  removeLine: (key: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadInitialLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((line): line is CartLine => {
      if (!line || typeof line !== 'object') return false
      const candidate = line as Partial<CartLine>
      const trusted = !isSupabaseConfigured && typeof candidate.productId === 'string' && typeof candidate.sizeLabel === 'string'
        ? lookupProductSize(candidate.productId, candidate.sizeLabel)
        : true
      return Boolean(
        trusted &&
        Number.isInteger(candidate.quantity) &&
        (candidate.quantity as number) >= 1 &&
        (candidate.quantity as number) <= MAX_QUANTITY &&
        (candidate.notes === undefined || typeof candidate.notes === 'string'),
      )
    })
  } catch {
    // Corrupt/unavailable storage shouldn't crash the app — just start empty.
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadInitialLines)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Ignore write failures (private browsing / storage full) — cart still
      // works for the current session, it just won't survive a refresh.
    }
  }, [lines])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let mounted = true
    void getCatalog().then((rows) => {
      if (!mounted) return
      const live = new Map(rows.map((row) => [`${row.product_id}__${row.size}`, row]))
      setLines((current) => current.flatMap((line) => {
        const row = live.get(`${line.productId}__${line.sizeLabel}`)
        if (!row) return []
        return [{ ...line, productName: row.product_name, sizeLabel: row.size, unitPrice: row.unit_price }]
      }))
    }).catch(() => {
      if (mounted) setLines([])
    })
    return () => { mounted = false }
  }, [])

  const addLine = useCallback<CartContextValue['addLine']>((input) => {
    const notes = input.notes?.trim().slice(0, 500) || undefined
    const key = `${input.productId}__${input.sizeLabel}__${encodeURIComponent(notes ?? '')}`
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + input.quantity) } : l,
        )
      }
      return [...prev, { key, ...input, notes, quantity: Math.min(MAX_QUANTITY, Math.max(1, input.quantity)) }]
    })
  }, [])

  const incrementLine = useCallback((key: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + 1) } : l)))
  }, [])

  const decrementLine = useCallback((key: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    )
  }, [])

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }, [])

  const clearCart = useCallback(() => setLines([]), [])

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    }),
    [lines],
  )

  const value = useMemo(
    () => ({ lines, itemCount, subtotal, addLine, incrementLine, decrementLine, removeLine, clearCart }),
    [lines, itemCount, subtotal, addLine, incrementLine, decrementLine, removeLine, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
