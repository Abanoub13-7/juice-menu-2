import { forwardRef } from 'react'
import type { Category } from '../types/menu'
import ProductCard from './ProductCard'
import CategoryHeader from './CategoryHeader'

interface ProductGridProps {
  categories: Category[]
  registerSection: (id: string, el: HTMLElement | null) => void
}

const ProductGrid = forwardRef<HTMLDivElement, ProductGridProps>(function ProductGrid(
  { categories, registerSection },
  ref,
) {
  return (
    <div ref={ref} className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
      {categories.map((cat) => (
        <section
          key={cat.id}
          id={`cat-${cat.id}`}
          ref={(el: HTMLElement | null) => registerSection(cat.id, el)}
          className="scroll-mt-[140px] mb-12"
          aria-labelledby={`cat-${cat.id}-heading`}
        >
          <CategoryHeader category={cat} />

          {cat.products && cat.products.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {cat.subcategories?.map((sub) => (
              <div key={sub.id} className="mb-8 last:mb-0">
              <h3 className="mb-3 text-[15px] font-bold text-[#657266]">{sub.name}</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {sub.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
})

export default ProductGrid
