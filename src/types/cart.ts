/**
 * A single line item in the customer's cart. Snapshots the product name,
 * size label, and unit price at the moment it was added so that later menu
 * edits never change what's already sitting in someone's cart.
 */
export interface CartLine {
  /** Stable key includes the normalized note, so differently customized
   *  versions of the same product always remain separate lines. */
  key: string
  productId: string
  productName: string
  sizeLabel: string
  unitPrice: number
  quantity: number
  notes?: string
}

export interface CartTotals {
  itemCount: number
  subtotal: number
}
