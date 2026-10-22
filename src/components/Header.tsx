import { Search, Sun, MapPin } from 'lucide-react'
import { storeConfig } from '../config/store'

interface HeaderProps {
  onSearchOpen: () => void
  onStoreInfoOpen: () => void
}

export default function Header({ onSearchOpen, onStoreInfoOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e8e0d2] bg-[#fbfaf6]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f805e] shadow-sm">
            <Sun className="h-[20px] w-[20px] text-[#fbd27d]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg leading-tight text-[#20352a]">{storeConfig.nameAr}</h1>
            <p className="truncate text-[11px] leading-tight tracking-wide text-[#8a9187]">{storeConfig.nameEn}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onStoreInfoOpen}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#e5ded1] bg-white px-3 text-xs font-bold text-[#2f805e] transition-colors hover:bg-[#f3f0e8] active:scale-95"
          >
            <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            بيانات المحل
          </button>
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label="بحث في المنيو"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5ded1] bg-white text-[#2f805e] transition-colors hover:bg-[#f3f0e8] active:scale-95"
          >
            <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pb-2 text-[11px] text-[#8a9187] sm:px-6">
        <MapPin className="h-3.5 w-3.5 text-[#f29a4a]" aria-hidden="true" />
        <span className="min-w-0 truncate">{storeConfig.address}</span>
      </div>
    </header>
  )
}
