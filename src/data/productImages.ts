import { getAllProducts, type SearchableProduct } from './menu'

export type ImageMatch = 'dedicated' | 'shared' | 'approximate'

export interface ProductImageSource {
  url: string
  credit: string
  match: ImageMatch
}

const image = (id: string, credit: string, match: ImageMatch = 'shared'): ProductImageSource => ({
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=720&q=78`,
  credit: `Unsplash photo: ${credit}`,
  match,
})

const directImage = (url: string, credit: string, match: ImageMatch = 'dedicated'): ProductImageSource => ({
  url,
  credit,
  match,
})

const ASSETS = {
  orange: image('photo-1600271886742-f049cd451bba', 'orange juice glass', 'dedicated'),
  mango: image('photo-1546173159-315724a31696', 'mango and citrus smoothie', 'dedicated'),
  strawberry: image('photo-1579954115545-a95591f28bfc', 'strawberry smoothie glass', 'dedicated'),
  lemonMint: image('photo-1497534446932-c925b458314e', 'fresh fruit and mint cooler', 'dedicated'),
  green: image('photo-1610970881699-44a5587cabec', 'green smoothie', 'shared'),
  mixedFruit: image('photo-1553530666-ba11a7da3888', 'mixed berry smoothie', 'shared'),
  milkshake: image('photo-1577805947697-89e18249d767', 'chocolate milkshake', 'dedicated'),
  chocolate: image('photo-1551024506-0bccd828d307', 'chocolate dessert', 'approximate'),
  avocado: image('photo-1523049673857-eb18f1d7b578', 'fresh avocado', 'approximate'),
  pineapple: image('photo-1550258987-190a2d41a8ba', 'fresh pineapple', 'dedicated'),
  apple: image('photo-1560806887-1e4cd0b6cbd6', 'fresh apple', 'dedicated'),
  banana: image('photo-1571771894821-ce9b6c11b08e', 'banana smoothie', 'dedicated'),
  citrus: image('photo-1548839140-29a749e1cf4d', 'fresh green juice', 'approximate'),
  pomegranate: image('photo-1541344999736-83eca272f6fc', 'pomegranate fruit', 'approximate'),
  dates: image('photo-1490474418585-ba9bad8fd0ea', 'fresh fruit with dates unavailable', 'approximate'),
  nuts: image('photo-1490474418585-ba9bad8fd0ea', 'fresh fruit with nut photo unavailable', 'approximate'),
  freshFruit: image('photo-1490474418585-ba9bad8fd0ea', 'fresh fruit', 'shared'),
  sugarcane: directImage(
    'https://upload.wikimedia.org/wikipedia/commons/6/63/Sugarcanejuice.jpg',
    'Wikimedia Commons: sugarcane juice in cups',
  ),
  sharedDateSobiaHibiscusCarobDoum: directImage(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9tZX0PxDxRL8vWB0Kqr-l2SV7twjvAyG1z2ybhroFYbVVrTcQQc_HNB0&s',
    'Google image proxy for the shared Instagram image',
  ),
  dessert: image('photo-1551024506-0bccd828d307', 'chocolate dessert', 'dedicated'),
} as const

const FALLBACK = ASSETS.freshFruit

/** One existing visual asset per top-level menu category. Product images remain
 * available for legacy uses, but the customer menu now uses this compact
 * category-level mapping instead of repeating an image on every product. */
const CATEGORY_IMAGES: Record<string, ProductImageSource> = {
  qasab: ASSETS.sugarcane,
  'fresh-juice': ASSETS.orange,
  'fresh-fruit': ASSETS.mango,
  roasted: ASSETS.nuts,
  milkshake: ASSETS.milkshake,
  cocktails: ASSETS.mixedFruit,
  'city-crash': ASSETS.lemonMint,
  'diet-zone': ASSETS.green,
  desserts: ASSETS.dessert,
  'fruit-boxes': ASSETS.freshFruit,
  jugs: ASSETS.lemonMint,
}

export function getCategoryImage(categoryId: string): ProductImageSource {
  return CATEGORY_IMAGES[categoryId] ?? FALLBACK
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

function assetForProduct({ product, categoryId, subcategoryId }: SearchableProduct): ProductImageSource {
  const key = `${product.name} ${product.ingredients ?? ''}`
  const visualKey = subcategoryId ?? categoryId

  if (includesAny(key, ['تمر', 'سوبيا', 'عناب', 'خروب', 'دوم'])) {
    return ASSETS.sharedDateSobiaHibiscusCarobDoum
  }

  if (key.includes('قصب')) return ASSETS.sugarcane

  if (visualKey === 'milkshake') {
    if (key.includes('فراولة')) return ASSETS.strawberry
    if (key.includes('مانجا')) return ASSETS.mango
    if (key.includes('موز')) return ASSETS.banana
    return key.includes('شيكولاتة') ? ASSETS.chocolate : ASSETS.milkshake
  }

  if (visualKey === 'roasted') {
    if (includesAny(key, ['تين شوكي', 'توت أحمر'])) return ASSETS.freshFruit
    return ASSETS.nuts
  }

  if (visualKey === 'desserts') {
    return key.includes('فروت') || key.includes('فخفخينا') ? ASSETS.freshFruit : ASSETS.dessert
  }

  if (visualKey === 'fruit-boxes') {
    if (key.includes('مانجو')) return ASSETS.mango
    if (key.includes('كيوي')) return ASSETS.green
    if (key.includes('رمان')) return ASSETS.pomegranate
    if (key.includes('موز')) return ASSETS.banana
    if (key.includes('تفاح')) return ASSETS.apple
    return ASSETS.freshFruit
  }

  if (includesAny(key, ['شيكولاتة', 'أوريو', 'اوريو', 'بوريو', 'هوهوز', 'توينكز', 'نوتيلا'])) {
    return ASSETS.chocolate
  }
  if (includesAny(key, ['ليمون', 'نعناع'])) return ASSETS.lemonMint
  if (includesAny(key, ['برتقال', 'جزر', 'جريب فروت'])) return ASSETS.orange
  if (key.includes('مانجا')) return ASSETS.mango
  if (key.includes('فراولة')) return ASSETS.strawberry
  if (key.includes('جوافة')) return ASSETS.freshFruit
  if (key.includes('تفاح')) return ASSETS.apple
  if (key.includes('موز')) return ASSETS.banana
  if (includesAny(key, ['أفوكادو', 'افوكادو', 'اڤوكادو'])) return ASSETS.avocado
  if (key.includes('رمان')) return ASSETS.pomegranate
  if (key.includes('أناناس')) return ASSETS.pineapple
  if (key.includes('كيوي')) return ASSETS.green
  if (key.includes('بطيخ')) return ASSETS.freshFruit
  if (key.includes('عنب')) return ASSETS.freshFruit
  if (key.includes('كنتالوب')) return ASSETS.mango
  if (key.includes('تمر') || key.includes('بلح')) return ASSETS.dates
  if (key.includes('عناب') || key.includes('خروب') || key.includes('دوم')) return ASSETS.citrus
  if (key.includes('جرجير')) return ASSETS.green

  if (visualKey === 'cocktails' || visualKey === 'city-crash' || visualKey === 'diet-zone') {
    return ASSETS.mixedFruit
  }
  if (visualKey === 'fresh-juice') return ASSETS.orange
  if (visualKey === 'jugs') return ASSETS.freshFruit
  return FALLBACK
}

/** Every catalog product receives a stable product-id key at module load. */
export const productImageMap: Record<string, ProductImageSource> = Object.fromEntries(
  getAllProducts().map((entry) => [entry.product.id, assetForProduct(entry)]),
)

export function getProductImage(product: SearchableProduct['product']): ProductImageSource {
  return productImageMap[product.id] ?? FALLBACK
}

export function getFallbackProductImage(): ProductImageSource {
  return FALLBACK
}

export function getImageMap(products: SearchableProduct[]): Record<string, ProductImageSource> {
  return Object.fromEntries(products.map(({ product }) => [product.id, productImageMap[product.id] ?? FALLBACK]))
}
