import type { Category } from '../types/menu'
import { getCategoryVisual } from '../data/categoryVisuals'
import { getCategoryImage } from '../data/productImages'

export default function CategoryHeader({ category }: { category: Category }) {
  const visual = getCategoryVisual(category.id)
  const Icon = visual.icon
  const image = category.imageUrl ? { url: category.imageUrl } : getCategoryImage(category.id)

  return (
    <header className="relative mb-4 aspect-[16/7] max-h-52 min-h-32 overflow-hidden rounded-[22px] bg-teal-900 shadow-[0_10px_28px_rgba(56,44,24,0.12)]">
      <img
        src={image.url}
        alt={category.name}
        loading="lazy"
        width={960}
        height={320}
        className="h-full w-full object-contain object-center opacity-90"
        onError={(event) => { event.currentTarget.style.display = 'none' }}
      />
      <div className={`absolute inset-0 bg-gradient-to-l ${visual.gradient} opacity-70`} />
      <div className="absolute inset-0 flex items-end justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 text-white">
          <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-white/70">المنيو</p>
          <h2 id={`cat-${category.id}-heading`} className="font-display text-2xl font-bold leading-tight sm:text-3xl">{category.name}</h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}
