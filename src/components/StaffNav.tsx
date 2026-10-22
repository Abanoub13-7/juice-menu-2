import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { LogOut, ReceiptText } from 'lucide-react'
import { signOutStaff } from '../lib/baristaAuth'
import { OrderError } from '../lib/orders'
import { storeConfig } from '../config/store'

export default function StaffNav({ admin }: { admin: boolean }) {
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setError(null)
    try {
      await signOutStaff()
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تسجيل الخروج')
    }
  }

  return (
    <header className="border-b border-[#e8e0d2] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/barista" className="truncate font-display text-xl font-bold text-[#20352a]">{storeConfig.nameEn}</Link>
        <nav className="flex items-center gap-2 text-sm font-bold" aria-label="تنقل الموظفين">
          <Link to="/barista" className={`inline-flex min-h-10 items-center gap-1 rounded-full px-3 ${location.pathname === '/barista' ? 'bg-[#2f805e] text-white' : 'text-[#667367]'}`}><ReceiptText className="h-4 w-4" aria-hidden="true" /> الطلبات</Link>
          {admin && <Link to="/admin/menu" className={`inline-flex min-h-10 items-center rounded-full px-3 ${location.pathname === '/admin/menu' ? 'bg-[#f29a4a] text-[#392313]' : 'text-[#667367]'}`}>المنتجات</Link>}
          <button type="button" onClick={() => void handleSignOut()} aria-label="تسجيل الخروج" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5ded1] text-[#667367]"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      </div>
      {error && <p role="alert" className="mx-auto max-w-6xl px-4 pb-3 text-center text-sm text-clay-500">{error}</p>}
    </header>
  )
}
