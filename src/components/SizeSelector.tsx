import type { SizeOption } from '../types/menu'

interface SizeSelectorProps {
  sizes: SizeOption[]
  selectedLabel: string
  onSelect: (label: string) => void
}

export default function SizeSelector({ sizes, selectedLabel, onSelect }: SizeSelectorProps) {
  if (sizes.length === 1) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3dd] px-3 py-1 border border-[#f7d4a0] self-start">
        <span className="text-sm font-bold text-[#a86028]">{sizes[0].price} ج.م</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="اختر الحجم">
      {sizes.map((s) => {
        const isSelected = s.label === selectedLabel
        return (
          <button
            key={s.label}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(s.label)}
            className={
              'flex min-h-11 min-w-[2.7rem] flex-col items-center rounded-lg border px-1.5 py-1 transition-colors ' +
              (isSelected
                ? 'bg-[#2f805e] border-[#2f805e] text-white'
                : 'bg-[#faf8f3] border-[#e6dfd3] text-[#687268] hover:border-[#2f805e]/50')
            }
          >
            <span className={'text-[11px] leading-none font-semibold ' + (isSelected ? 'text-white/80' : 'text-[#9b6a3c]')}>
              {s.label}
            </span>
            <span className="text-sm font-extrabold leading-tight mt-0.5">{s.price}</span>
          </button>
        )
      })}
    </div>
  )
}
