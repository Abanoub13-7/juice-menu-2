import type { Category, Product, SizeOption } from '../types/menu'

/** Builds the standard three-size ladder (J / XL / L) used across most fresh juices. */
function jxl(j: number, xl: number, l: number): SizeOption[] {
  return [
    { label: 'J', price: j },
    { label: 'XL', price: xl },
    { label: 'L', price: l },
  ]
}

/** Builds the two-size ladder (small / large) used for boxed fruit & some desserts. */
function sk(small: number, large: number): SizeOption[] {
  return [
    { label: 'ص', price: small },
    { label: 'ك', price: large },
  ]
}

/** Builds the jug/container ladder: لتر, لتر ونصف, 2 لتر, 4 لتر. */
function jug(liter: number, literHalf: number, twoLiter: number, fourLiter: number): SizeOption[] {
  return [
    { label: 'لتر', price: liter },
    { label: 'لتر ونصف', price: literHalf },
    { label: '2 لتر', price: twoLiter },
    { label: '4 لتر', price: fourLiter },
  ]
}

let autoId = 0
function p(name: string, sizes: SizeOption[], opts?: { ingredients?: string; needsReview?: boolean }): Product {
  autoId += 1
  return {
    id: `p${autoId}-${name.replace(/\s+/g, '-')}`,
    name,
    sizes,
    ingredients: opts?.ingredients,
    needsReview: opts?.needsReview,
  }
}

// ---------------------------------------------------------------------------
// قصب (Sugarcane)
// ---------------------------------------------------------------------------
const qasabProducts: Product[] = [
  p('قصب', jxl(20, 15, 10)),
  p('قصب باللبن', jxl(25, 20, 15)),
  p('قصب بالقشطة', jxl(35, 30, 20)),
  p('قصب بالايس', jxl(30, 25, 20)),
  p('قصب بالنعناع', jxl(25, 20, 15)),
  p('قصب بالجرجير', jxl(25, 20, 15)),
  p('قصب بالحلاوة الطحينية', jxl(30, 25, 20), { needsReview: true }),
  p('قصب بالعسل', jxl(30, 25, 20)),
  p('قصب بالجزر', jxl(30, 25, 15), { needsReview: true }),
  p('قصب بالبرتقال', jxl(35, 30, 20), { needsReview: true }),
  p('قصب بالليمون', jxl(30, 25, 15)),
  p('تمر', jxl(30, 20, 10)),
  p('سوبيا', jxl(25, 20, 15)),
  p('عناب', jxl(25, 20, 15)),
  p('خروب', jxl(25, 20, 15)),
]

// ---------------------------------------------------------------------------
// عصائر فريش (Fresh juices)
// ---------------------------------------------------------------------------
const freshJuiceProducts: Product[] = [
  p('جرجير باللبن والعسل', jxl(45, 35, 25)),
  p('دوم طبيعي', jxl(25, 20, 15)),
  p('دوم باللبن', jxl(35, 25, 15)),
  p('ليمون', jxl(30, 25, 15)),
  p('ليمون بالنعناع', jxl(30, 25, 15)),
  p('عنب', jxl(40, 30, 20)),
  p('كنتالوب', jxl(30, 20, 15)),
  p('كنتالوب باللبن', jxl(35, 25, 20)),
  p('برتقال', jxl(35, 30, 20)),
  p('برتقال بالجزر', jxl(35, 30, 20)),
  p('جزر', jxl(30, 25, 15)),
  p('جريب فروت', jxl(30, 25, 15)),
  p('بطيخ', jxl(35, 25, 20)),
  p('كوكتيل خلاط', jxl(40, 30, 20)),
  p('بوريو باللبن', jxl(70, 60, 40)),
  p('اوريو باللبن', jxl(70, 60, 40)),
]

// ---------------------------------------------------------------------------
// الفاكهة الطازجة (Fresh fruit blends), grouped by fruit
// ---------------------------------------------------------------------------
const mangoProducts: Product[] = [
  p('مانجا', jxl(40, 35, 25)),
  p('مانجا باللبن', jxl(45, 40, 30)),
  p('مانجا بالموز', jxl(45, 40, 30)),
  p('مانجا بالتفاح', jxl(50, 45, 35)),
  p('مانجا بالاناناس', jxl(60, 50, 35)),
  p('مانجا بالفراولة', jxl(45, 35, 25)),
  p('مانجا بالبلح', jxl(60, 40, 35)),
  p('مانجا بالافوكادو', jxl(60, 50, 35)),
  p('مانجا بالكيوي', jxl(60, 50, 35)),
]

const strawberryProducts: Product[] = [
  p('فراولة', jxl(40, 35, 25)),
  p('فراولة باللبن', jxl(45, 40, 30)),
  p('فراولة بالمانجا', jxl(45, 40, 30)),
  p('فراولة بالجوافة', jxl(40, 35, 25)),
  p('فراولة بالموز', jxl(40, 35, 25)),
]

const guavaProducts: Product[] = [
  p('جوافة', jxl(35, 30, 20)),
  p('جوافة باللبن', jxl(40, 35, 25)),
  p('جوافة بالموز', jxl(40, 35, 25)),
  p('جوافة بالفراولة', jxl(40, 35, 25)),
  p('جوافة بالرمان', jxl(40, 35, 25)),
]

const appleProducts: Product[] = [
  p('تفاح سادة', jxl(50, 40, 25)),
  p('تفاح باللبن', jxl(55, 45, 30)),
  p('تفاح بالجوافة', jxl(60, 50, 30)),
  p('تفاح بالموز', jxl(55, 45, 30)),
]

const bananaProducts: Product[] = [
  p('موز باللبن', jxl(40, 30, 20)),
  p('موز مع فراولة ومانجا', jxl(60, 45, 30)),
  p('موز مع اڤوكادو وكيوي', jxl(80, 70, 50)),
]

const avocadoProducts: Product[] = [
  p('اڤوكادو', jxl(70, 60, 40)),
  p('اڤوكادو بالقصب', jxl(70, 60, 40)),
  p('اڤوكادو بالجرجير', jxl(75, 65, 45)),
  p('اڤوكادو بالكيوي', jxl(80, 70, 50)),
  p('اڤوكادو بالأيس', jxl(80, 70, 50)),
  p('اڤوكادو بالمكسرات', jxl(90, 80, 60)),
  p('اڤوكادو بالسوداني', jxl(90, 75, 50)),
  p('اڤوكادو بالكاچو', jxl(120, 100, 70)),
]

const datesProducts: Product[] = [
  p('بلح باللبن', jxl(50, 45, 30)),
  p('بلح كيوي جرجير', jxl(85, 70, 50)),
  p('بلح عسل جرجير', jxl(80, 65, 45)),
  p('بلح اڤوكادو', jxl(85, 70, 50)),
  p('بلح بالأيس', jxl(60, 50, 40)),
]

const pomegranateProducts: Product[] = [
  p('رمان', jxl(35, 30, 20)),
  p('رمان مانجا', jxl(60, 50, 35)),
  p('رمان جوافة', jxl(60, 50, 35)),
  p('رمان جزر', jxl(60, 50, 35)),
]

const pineappleKiwiProducts: Product[] = [
  p('اناناس', jxl(70, 60, 40)),
  p('اناناس باللبن', jxl(75, 65, 45)),
  p('كيوي سادة', jxl(70, 60, 40)),
  p('كيوي باللبن', jxl(75, 65, 45)),
  p('كيوي مانجا', jxl(70, 60, 40)),
  p('كيوي اڤوكادو', jxl(80, 70, 50)),
]

const peachProducts: Product[] = [
  p('خوخ', jxl(45, 35, 25)),
  p('خوخ باللبن', jxl(50, 40, 30)),
  p('مشمش', jxl(45, 35, 25)),
  p('مشمش باللبن', jxl(45, 35, 25)),
  p('خوخ مع مشمش', jxl(55, 45, 30)),
]

// ---------------------------------------------------------------------------
// المحمصات (Roasted nuts & seeds)
// ---------------------------------------------------------------------------
const roastedProducts: Product[] = [
  p('كاجو (فانيليا أو شيكولاتة)', jxl(120, 100, 80)),
  p('بندق (فانيليا أو شيكولاتة)', jxl(120, 100, 80)),
  p('فستق (فانيليا أو شيكولاتة)', jxl(120, 100, 80)),
  p('سوداني (فانيليا أو شيكولاتة)', jxl(85, 70, 50)),
  p('تين شوكي', jxl(65, 50, 30)),
  p('توينكز', jxl(70, 60, 40)),
  p('هوهوز', jxl(70, 60, 40)),
  p('جوز هند', jxl(75, 60, 40)),
  p('توت أحمر', jxl(45, 35, 25)),
  p('لب', jxl(85, 70, 50)),
]

// ---------------------------------------------------------------------------
// ميلك شيك (Milkshake)
// ---------------------------------------------------------------------------
const milkshakeProducts: Product[] = [
  p('فراولة', jxl(65, 50, 35)),
  p('مانجا', jxl(65, 50, 35)),
  p('شيكولاتة', jxl(65, 50, 35)),
  p('ڤانيليا', jxl(65, 50, 35)),
  p('موز', jxl(65, 50, 35)),
]

// ---------------------------------------------------------------------------
// كوكتيلات الخلاط (Blender cocktails) - three menu pages, combined
// ---------------------------------------------------------------------------
const cocktailProducts: Product[] = [
  p('صاروخ', jxl(70, 60, 40), { ingredients: 'أناناس + موز + مانجا + أيس كريم' }),
  p('فيفا', jxl(70, 60, 40), { ingredients: 'بلح + موز + لبن + أيس' }),
  p('شامبيونز ليج', jxl(70, 60, 40), { ingredients: 'أناناس + تفاح + خوخ' }),
  p('بطوط', jxl(70, 60, 40), { ingredients: 'فراولة + موز + أيس كريم' }),
  p('فياجرا', jxl(70, 60, 40), { ingredients: 'جرجير + بلح + كيوي + لبن' }),
  p('بيناكولادا', jxl(70, 60, 40), { ingredients: 'أناناس + برتقال + جوز' }),
  p('شبح', jxl(70, 60, 40), { ingredients: 'تفاح + بلح + كيوي + لبن' }),
  p('أبو تريكة', jxl(70, 60, 40), { ingredients: 'فراولة + أناناس + أيس كريم' }),
  p('هامر', jxl(85, 70, 50), { ingredients: 'أفوكادو + كيوي + تفاح' }),
  p('الاصفهاني', jxl(70, 60, 40), { ingredients: 'أناناس + موز + مانجا + أيس كريم' }),
  p('موز إسبشيال', jxl(65, 50, 35), { ingredients: 'بلح + موز + لبن + أيس' }),
  p('كثافة', jxl(70, 60, 40), { ingredients: 'أناناس + تفاح + خوخ' }),
  p('جوجل', jxl(70, 60, 45), { ingredients: 'فراولة + موز + أيس كريم' }),
  p('فيتامين سي', jxl(65, 50, 35), { ingredients: 'جرجير + بلح + كيوي + لبن' }),
  p('فول باور', jxl(120, 100, 80), { ingredients: 'أناناس + برتقال + جوز' }),
  p('ماكسيميوم باور', jxl(120, 100, 80), { ingredients: 'تفاح + بلح + كيوي + لبن' }),
  p('تريو ميكس', jxl(85, 70, 50), { ingredients: 'فراولة + أناناس + أيس كريم' }),
  p('الكبير أووي', jxl(120, 100, 80), { ingredients: 'أفوكادو + كيوي + تفاح' }),
  p('صهللة', jxl(120, 100, 80), { ingredients: 'أناناس + موز + مانجا + أيس كريم' }),
  p('نعنشة', jxl(75, 60, 40), { ingredients: 'بلح + موز + لبن + أيس' }),
  p('فرفشة', jxl(65, 50, 35), { ingredients: 'أناناس + تفاح + خوخ' }),
  p('سكلانس', jxl(70, 60, 40), { ingredients: 'فراولة + موز + أيس كريم' }),
  p('هاواي', jxl(60, 50, 35), { ingredients: 'جرجير + بلح + كيوي + لبن' }),
  p('أوكي', jxl(100, 70, 50), { ingredients: 'أناناس + برتقال + جوز' }),
  p('عفروتو', jxl(70, 60, 40), { ingredients: 'تفاح + بلح + كيوي + لبن' }),
  p('شقاوة ضحكة', jxl(120, 100, 80), { ingredients: 'فراولة + أناناس + أيس كريم' }),
  p('ضحكة', jxl(70, 60, 40), { ingredients: 'أفوكادو + كيوي + تفاح' }),
]

// ---------------------------------------------------------------------------
// سيتي كراش (City Crash)
// ---------------------------------------------------------------------------
const cityCrashProducts: Product[] = [
  p('باشون', jxl(70, 60, 40), { ingredients: 'أناناس + موز + مانجا + أيس كريم' }),
  p('شوكوننا', jxl(60, 50, 35), { ingredients: 'بلح + موز + لبن + أيس' }),
  p('توربيني', jxl(75, 65, 45), { ingredients: 'أناناس + تفاح + خوخ' }),
  p('هلك', jxl(85, 70, 50), { ingredients: 'فراولة + موز + أيس كريم' }),
  p('أكشن', jxl(85, 70, 50), { ingredients: 'جرجير + بلح + كيوي + لبن' }),
  p('چامايكا', jxl(85, 70, 50), { ingredients: 'أناناس + برتقال + جوز' }),
  p('هاڤانا', jxl(85, 70, 50), { ingredients: 'تفاح + بلح + كيوي + لبن' }),
]

// ---------------------------------------------------------------------------
// دايت زوون (Diet Zone)
// ---------------------------------------------------------------------------
const dietZoneProducts: Product[] = [
  p('كيوي أناناس ليمون', jxl(85, 70, 50), { ingredients: 'كيوي + أناناس + ليمون' }),
  p('أناناس برتقال', jxl(85, 70, 50), { ingredients: 'أناناس + برتقال' }),
  p('تفاح جزر برتقال', jxl(75, 60, 40), { ingredients: 'تفاح + جزر + برتقال' }),
  p('راني', jxl(75, 60, 40), { ingredients: 'تفاح + بطيخ + موز' }),
  p('اللمبي', jxl(85, 70, 50), { ingredients: 'كيوي + تفاح + موز' }),
  p('فقد الوزن', jxl(85, 70, 50), { ingredients: 'كيوي + أناناس + جريب فروت' }),
  p('دواء للسمنة', jxl(85, 70, 50), {
    ingredients: 'موز + كيوي + أناناس، جريب فروت + ليمون + تفاح',
    needsReview: true,
  }),
  p('ملك الرچيم', jxl(85, 70, 50), { ingredients: 'فراولة + أناناس + أيس كريم' }),
]

// ---------------------------------------------------------------------------
// أطباق وحلويات (Dishes & desserts) - mixed pricing models per PDF page 15
// ---------------------------------------------------------------------------
const dessertProducts: Product[] = [
  p('ديناميت', [{ label: 'السعر', price: 40 }]),
  p('فروت سلطان', [{ label: 'السعر', price: 25 }]),
  p('فخفخينا', [{ label: 'السعر', price: 20 }]),
  p('قنبلة حص ل', [{ label: 'السعر', price: 60 }], { needsReview: true }),
  p('قنبلة حص ص', [{ label: 'السعر', price: 40 }], { needsReview: true }),
  p('سوبر هوهوز-توينكز', sk(50, 75)),
  p('طاجن نوتيلا', sk(35, 50)),
  p('سوبر أوريو-بوريو', sk(50, 75)),
]

// ---------------------------------------------------------------------------
// علب الفاكهة (Fruit boxes) - two sizes (small ص / large ك); two items are
// single-priced only, per the PDF (كنتالوب وبطيخ ك فقط).
// ---------------------------------------------------------------------------
const fruitBoxProducts: Product[] = [
  p('علبة كنتالوب', [{ label: 'ك', price: 30 }]),
  p('علبة كيوي', sk(80, 120)),
  p('علبة مانجو', sk(40, 60)),
  p('علبة رمان', sk(30, 45)),
  p('علبة مشمش', sk(50, 75)),
  p('علبة خوخ', sk(50, 75)),
  p('علبة موز', sk(45, 65)),
  p('علبة بطيخ', [{ label: 'ك', price: 35 }]),
  p('علبة تفاح', sk(50, 75)),
]

// ---------------------------------------------------------------------------
// الجراكن والأحجام الكبيرة (Jugs / large-format sizes)
// ---------------------------------------------------------------------------
const jugProducts: Product[] = [
  p('چركن مانجو', jug(40, 60, 80, 150)),
  p('چركن فراولة', jug(40, 60, 80, 150)),
  p('چركن جوافة', jug(35, 50, 70, 130)),
  p('چركن برتقال', jug(40, 60, 80, 150)),
  p('چركن بطيخ', jug(40, 60, 80, 150)),
  p('چركن رمان', jug(40, 60, 80, 150)),
  p('چركن قصب', jug(30, 45, 60, 120)),
  p('چركن تمر', jug(25, 35, 50, 100)),
  p('چركن تمر طبيعي', jug(35, 45, 60, 120)),
  p('چركن سوبيا', jug(30, 45, 60, 120)),
  p('چركن خروب', jug(30, 45, 60, 120)),
  p('چركن عناب', jug(30, 45, 60, 120)),
  p('چركن دوم سادة', jug(30, 45, 60, 120)),
  p('چركن دوم باللبن', jug(40, 60, 80, 150)),
  p('چركن اڤوكادو', jug(100, 150, 200, 390)),
  p('چركن أناناس', jug(100, 150, 200, 390)),
  p('چركن كيوي', jug(100, 150, 200, 390)),
  p('چركن موز باللبن', jug(40, 60, 80, 150)),
  p('چركن بلح باللبن', jug(50, 75, 100, 190)),
  p('چركن ليمون', jug(40, 60, 80, 150)),
  p('چركن ليمون نعناع', jug(40, 60, 80, 150)),
]

// ---------------------------------------------------------------------------
// Category tree
// ---------------------------------------------------------------------------
export const menu: Category[] = [
  { id: 'qasab', name: 'قصب', products: qasabProducts },
  { id: 'fresh-juice', name: 'عصائر فريش', products: freshJuiceProducts },
  {
    id: 'fresh-fruit',
    name: 'الفاكهة الطازجة',
    subcategories: [
      { id: 'mango', name: 'المانجو', products: mangoProducts },
      { id: 'strawberry', name: 'الفراولة', products: strawberryProducts },
      { id: 'guava', name: 'الجوافة', products: guavaProducts },
      { id: 'apple', name: 'التفاح', products: appleProducts },
      { id: 'banana', name: 'الموز', products: bananaProducts },
      { id: 'avocado', name: 'الأڤوكادو', products: avocadoProducts },
      { id: 'dates', name: 'البلح', products: datesProducts },
      { id: 'pomegranate', name: 'الرمان', products: pomegranateProducts },
      { id: 'pineapple-kiwi', name: 'الاناناس والكيوي', products: pineappleKiwiProducts },
      { id: 'peach', name: 'الخوخ والمشمش', products: peachProducts },
    ],
  },
  { id: 'roasted', name: 'المحمصات', products: roastedProducts },
  { id: 'milkshake', name: 'ميلك شيك', products: milkshakeProducts },
  { id: 'cocktails', name: 'كوكتيلات الخلاط', products: cocktailProducts },
  { id: 'city-crash', name: 'سيتي كراش', products: cityCrashProducts },
  { id: 'diet-zone', name: 'دايت زون', products: dietZoneProducts },
  { id: 'desserts', name: 'أطباق وحلويات', products: dessertProducts },
  { id: 'fruit-boxes', name: 'علب الفاكهة', products: fruitBoxProducts },
  { id: 'jugs', name: 'الجراكن والأحجام الكبيرة', products: jugProducts },
]

/** Flattened list of every product paired with the category/subcategory it lives in — used for search. */
export interface SearchableProduct {
  product: Product
  categoryId: string
  categoryName: string
  subcategoryId?: string
  subcategoryName?: string
}

export function getAllProducts(): SearchableProduct[] {
  const out: SearchableProduct[] = []
  for (const cat of menu) {
    if (cat.products) {
      for (const product of cat.products) {
        out.push({ product, categoryId: cat.id, categoryName: cat.name })
      }
    }
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        for (const product of sub.products) {
          out.push({
            product,
            categoryId: cat.id,
            categoryName: cat.name,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
          })
        }
      }
    }
  }
  return out
}

