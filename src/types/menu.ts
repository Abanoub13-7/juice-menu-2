/**
 * A single size/price pairing for a product.
 * `label` preserves the PDF's own terminology (e.g. "J", "XL", "L",
 * "ص" (small), "ك" (large), "لتر", "لتر ونصف", "2لتر", "4لتر").
 */
export interface SizeOption {
  label: string
  price: number
}

/**
 * A menu item. `ingredients` is only set for combination drinks
 * (cocktails / diet blends) where the PDF lists a "+" separated recipe
 * instead of a description.
 */
export interface Product {
  id: string
  name: string
  ingredients?: string
  sizes: SizeOption[]
  /** Set for products flagged in DATA_REVIEW.md as needing manual price confirmation. */
  needsReview?: boolean
}

export interface Subcategory {
  id: string
  name: string
  products: Product[]
}

export interface Category {
  id: string
  name: string
  imageUrl?: string
  /** Flat categories set `products` directly. */
  products?: Product[]
  /** Grouped categories (e.g. fresh fruit by flavor) set `subcategories` instead. */
  subcategories?: Subcategory[]
}
