import { useRef, useEffect } from 'react'
import type { Category } from '../types/menu'

interface CategoryNavProps {
  categories: Category[]
  activeId: string
  onSelect: (id: string) => void
}

export default function CategoryNav({ categories, activeId, onSelect }: CategoryNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [activeId])

  return (
    <nav
      aria-label="فئات المنيو"
      className="sticky top-[86px] z-20 border-b border-[#e8e0d2] bg-[#fbfaf6]/95 backdrop-blur"
    >
      <div
        ref={containerRef}
        className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeId
          return (
            <button
              key={cat.id}
              ref={isActive ? activeButtonRef : undefined}
              type="button"
              onClick={() => onSelect(cat.id)}
              aria-current={isActive ? 'true' : undefined}
              className={
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-bold whitespace-nowrap transition-colors ' +
                (isActive
                  ? 'bg-[#2f805e] text-white shadow-sm'
                  : 'border border-[#e5ded1] bg-white text-[#667367] hover:border-[#2f805e]/40')
              }
            >
              {cat.name}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
