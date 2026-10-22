import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getStaffRole, signInStaff, signOutStaff } from '../lib/baristaAuth'
import { OrderError } from '../lib/orders'
import { isSupabaseConfigured } from '../lib/supabase'
import { useStaffAuth } from '../context/StaffAuthContext'

export default function BaristaLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { session, role, loading: sessionLoading, error: sessionError } = useStaffAuth()
  const navigationState = location.state as { from?: unknown; reason?: string } | null

  useEffect(() => {
    if (!sessionLoading && session && role) {
      navigate(getDestination(role, navigationState?.from), { replace: true })
    }
  }, [sessionLoading, session, role, navigationState?.from, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const signedInSession = await signInStaff(email, password)
      const signedInRole = getStaffRole(signedInSession)
      if (!signedInRole) {
        await signOutStaff()
        setError('تم التحقق من بيانات الدخول، لكن هذا الحساب غير مصرح له باستخدام لوحة الموظفين. تواصل مع مدير النظام.')
        return
      }
      navigate(getDestination(signedInRole, navigationState?.from), { replace: true })
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)
    try {
      await signOutStaff()
    } catch (err) {
      setError(err instanceof OrderError ? err.userMessage : 'تعذر تسجيل الخروج')
    } finally {
      setSigningOut(false)
    }
  }

  if (sessionLoading) {
    return <LoginMessage>جارِ التحقق من جلسة الدخول...</LoginMessage>
  }

  if (session && role) {
    return <LoginMessage>جارِ فتح لوحة الموظفين...</LoginMessage>
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <h1 className="font-display text-xl text-gold-300 mb-1 text-center">دخول الموظفين</h1>
        <p className="text-[12px] text-cream/50 mb-6 text-center">سجّل الدخول للوصول إلى لوحة الطلبات أو إدارة المنيو</p>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-clay-500/15 px-3 py-2 text-[12.5px] text-clay-500/90 text-center">
            لم يتم ربط قاعدة البيانات بعد — راجع إعدادات Supabase
          </p>
        )}

        {sessionError && <p role="alert" className="mb-3 text-[12.5px] text-clay-500 text-center">{sessionError}</p>}
        {navigationState?.reason === 'unauthorized' && (
          <p role="alert" className="mb-3 text-[12.5px] text-clay-500 text-center">
            هذا الحساب غير مخصص لاستخدام لوحات الموظفين. تواصل مع مدير النظام.
          </p>
        )}

        {session && !role && (
          <div className="mb-4">
            <p role="alert" className="mb-3 text-[12.5px] text-clay-500 text-center">
              الحساب الحالي لا يحمل دور موظف معتمد.
            </p>
            <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="w-full rounded-full border border-white/15 py-2 text-sm text-cream disabled:opacity-40">
              {signingOut ? 'جارِ تسجيل الخروج...' : 'تسجيل الخروج من هذا الحساب'}
            </button>
          </div>
        )}

        <label className="block mb-3">
          <span className="block text-[12px] text-cream/60 mb-1">البريد الإلكتروني</span>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-teal-800/60 border border-white/10 px-3 py-2.5 text-cream outline-none focus:border-gold-400/50"
          />
        </label>

        <label className="block mb-4">
          <span className="block text-[12px] text-cream/60 mb-1">كلمة المرور</span>
          <input
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-teal-800/60 border border-white/10 px-3 py-2.5 text-cream outline-none focus:border-gold-400/50"
          />
        </label>

        {error && <p className="mb-3 text-[12.5px] text-clay-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !isSupabaseConfigured || Boolean(session)}
          className="w-full rounded-full bg-gold-400 py-3 font-bold text-teal-950 active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? 'جارِ تسجيل الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}

function getDestination(role: 'admin' | 'barista', from: unknown) {
  const fallback = role === 'admin' ? '/admin/menu' : '/barista'
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return fallback
  const pathname = from.split(/[?#]/, 1)[0]
  const allowed = role === 'admin'
    ? ['/admin', '/admin/menu', '/admin/prices', '/barista']
    : ['/barista']
  return allowed.includes(pathname) ? from : fallback
}

function LoginMessage({ children }: { children: string }) {
  return <div className="flex min-h-screen items-center justify-center px-6 text-center text-cream/70">{children}</div>
}
