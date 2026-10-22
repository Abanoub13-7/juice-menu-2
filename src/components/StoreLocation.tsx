import { ExternalLink, MapPin } from 'lucide-react'
import { storeConfig } from '../config/store'

export default function StoreLocation() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e8e0d2] bg-white shadow-[0_10px_30px_rgba(56,44,24,0.06)]">
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a86028]">موقعنا</p>
          <h2 className="font-display text-2xl font-bold text-[#20352a]">{storeConfig.nameAr}</h2>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#687268]">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#f29a4a]" aria-hidden="true" />
            <span>{storeConfig.address}</span>
          </p>
        </div>
        <MapPin className="h-7 w-7 shrink-0 text-[#2f805e]" aria-hidden="true" />
      </div>
      <div className="aspect-[4/3] min-h-[220px] w-full bg-[#e9efe8] sm:aspect-[16/9]">
        <iframe
          title={`خريطة موقع ${storeConfig.nameAr}`}
          src={storeConfig.location.embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
      <div className="p-4 sm:p-5">
        <a href={storeConfig.location.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f29a4a] px-4 text-sm font-bold text-[#392313] transition-colors hover:bg-[#f5aa63] sm:w-auto">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> فتح الموقع في الخرائط
        </a>
      </div>
    </div>
  )
}
