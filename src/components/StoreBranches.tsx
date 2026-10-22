import { MapPin, Phone } from 'lucide-react'
import { storeConfig } from '../config/store'

export default function StoreBranches() {
  return (
    <section aria-labelledby="branches-heading">
      <div className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a86028]">فروعنا</p>
        <h2 id="branches-heading" className="font-display text-2xl font-bold text-[#20352a]">{storeConfig.branchesHeading}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {storeConfig.branches.map((branch) => (
          <article key={`${branch.name}-${branch.address}`} className="rounded-[20px] border border-[#e8e0d2] bg-white p-4 shadow-[0_8px_24px_rgba(56,44,24,0.05)]">
            <h3 className="font-bold text-[#20352a]">{branch.name}</h3>
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#687268]"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[#f29a4a]" aria-hidden="true" />{branch.address}</p>
            <a href={`tel:${branch.phone.replace(/\s+/g, '')}`} className="mt-2 flex items-center gap-2 text-sm font-bold text-[#2f805e]"><Phone className="h-4 w-4" aria-hidden="true" /><span dir="ltr">{branch.phone}</span></a>
            <a href={branch.mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-[#e5ded1] px-4 text-xs font-bold text-[#526157] transition-colors hover:border-[#2f805e]/40 hover:text-[#2f805e]">فتح في الخرائط</a>
          </article>
        ))}
      </div>
    </section>
  )
}
