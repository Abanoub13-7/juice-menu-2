import {
  Apple,
  Banana,
  Box,
  Candy,
  Citrus,
  CupSoda,
  Droplet,
  Droplets,
  Grape,
  Leaf,
  Milk,
  Package,
  Soup,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryVisual {
  icon: LucideIcon
  /** Tailwind gradient classes — purely decorative, never used to convey information. */
  gradient: string
}

const DEFAULT_VISUAL: CategoryVisual = { icon: Droplet, gradient: 'from-teal-700 to-teal-900' }

/**
 * Keyed by subcategory id first, category id second (see data/menu.ts).
 * These are decorative tiles/icons only — they never determine a product's
 * name, price, or availability, and are not sourced from any external image.
 */
const VISUALS: Record<string, CategoryVisual> = {
  qasab: { icon: Leaf, gradient: 'from-lime-700 to-teal-900' },
  'fresh-juice': { icon: Droplets, gradient: 'from-teal-600 to-teal-900' },
  mango: { icon: Sparkles, gradient: 'from-amber-500 to-orange-700' },
  strawberry: { icon: Droplet, gradient: 'from-rose-600 to-red-800' },
  guava: { icon: Apple, gradient: 'from-pink-500 to-rose-800' },
  apple: { icon: Apple, gradient: 'from-red-500 to-red-800' },
  banana: { icon: Banana, gradient: 'from-yellow-500 to-amber-700' },
  avocado: { icon: Leaf, gradient: 'from-green-600 to-emerald-900' },
  dates: { icon: Package, gradient: 'from-amber-700 to-stone-900' },
  pomegranate: { icon: Grape, gradient: 'from-rose-700 to-red-900' },
  'pineapple-kiwi': { icon: Citrus, gradient: 'from-lime-600 to-yellow-700' },
  peach: { icon: Apple, gradient: 'from-orange-400 to-orange-700' },
  roasted: { icon: Box, gradient: 'from-amber-800 to-stone-900' },
  milkshake: { icon: Milk, gradient: 'from-gold-300 to-amber-600' },
  cocktails: { icon: CupSoda, gradient: 'from-fuchsia-600 to-purple-900' },
  'city-crash': { icon: Sparkles, gradient: 'from-cyan-600 to-teal-900' },
  'diet-zone': { icon: Leaf, gradient: 'from-emerald-600 to-teal-900' },
  desserts: { icon: Candy, gradient: 'from-pink-500 to-purple-800' },
  'fruit-boxes': { icon: Box, gradient: 'from-orange-500 to-amber-800' },
  jugs: { icon: Soup, gradient: 'from-teal-700 to-emerald-950' },
}

export function getCategoryVisual(key: string | undefined): CategoryVisual {
  if (!key) return DEFAULT_VISUAL
  return VISUALS[key] ?? DEFAULT_VISUAL
}
