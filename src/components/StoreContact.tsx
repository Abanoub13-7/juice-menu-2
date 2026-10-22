import { Facebook, Instagram, MessageCircle, Phone } from 'lucide-react'
import { storeConfig } from '../config/store'

export default function StoreContact() {
  const telHref = `tel:${storeConfig.phone.replace(/\s+/g, '')}`
  const whatsappHref = storeConfig.whatsapp
    ? `https://wa.me/${storeConfig.whatsapp.replace(/\D/g, '')}`
    : undefined

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#a86028]">تواصل معنا</p>
      <div className="flex flex-wrap gap-2">
        <a href={telHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2f805e] px-4 text-sm font-bold text-white transition-colors hover:bg-[#276d4f]">
          <Phone className="h-4 w-4" aria-hidden="true" />
          <span dir="ltr">{storeConfig.phone}</span>
        </a>
        {storeConfig.whatsapp && whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d9e8dc] bg-[#f2faf3] px-4 text-sm font-bold text-[#2f805e] transition-colors hover:bg-[#e3f2e8]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> واتساب
          </a>
        )}
        {storeConfig.social?.facebook && (
          <a href={storeConfig.social.facebook} target="_blank" rel="noreferrer" aria-label="صفحة فيسبوك" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5ded1] text-[#2f805e] transition-colors hover:bg-[#f3f0e8]">
            <Facebook className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
        {storeConfig.social?.instagram && (
          <a href={storeConfig.social.instagram} target="_blank" rel="noreferrer" aria-label="صفحة إنستجرام" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5ded1] text-[#2f805e] transition-colors hover:bg-[#f3f0e8]">
            <Instagram className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  )
}
