import { getAllProducts } from '../data/menu'

export interface MenuLookupResult {
  productId: string
  productName: string
  sizeLabel: string
  unitPrice: number
}

/**
 * Looks up a product + size against `menu.ts`, the single source of truth
 * for names/prices. Returns null if the product or size no longer exists
 * (e.g. menu changed after the cart was populated), so callers can drop the
 * line instead of trusting a stale/tampered price.
 */
export function lookupProductSize(productId: string, sizeLabel: string): MenuLookupResult | null {
  const found = getAllProducts().find(({ product }) => product.id === productId)
  if (!found) return null

  const size = found.product.sizes.find((s) => s.label === sizeLabel)
  if (!size) return null

  return {
    productId: found.product.id,
    productName: found.product.name,
    sizeLabel: size.label,
    unitPrice: size.price,
  }
}
