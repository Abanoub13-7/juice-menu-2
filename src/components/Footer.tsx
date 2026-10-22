import { ExternalLink, MapPin } from 'lucide-react'
import { storeConfig } from '../config/store'
import StoreContact from './StoreContact'

export default function Footer() {
  return (
    <footer className="border-t border-[#e8e0d2] bg-[#f3f0e8] px-4 py-8">
      <div className="mx-auto max-w-6xl text-center">
        <p className="font-display text-lg font-bold text-[#2f805e]">{storeConfig.nameAr}</p>
        <p className="mb-2 text-[11px] tracking-wide text-[#8a9187]">{storeConfig.nameEn}</p>
        <p className="mx-auto mb-4 max-w-md text-xs leading-6 text-[#7c847b]">{storeConfig.description}</p>

        <div className="flex flex-col items-center gap-4 text-sm text-[#687268]">
          <StoreContact />
          <a href={storeConfig.location.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-center transition-colors hover:text-[#2f805e]">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{storeConfig.address}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
