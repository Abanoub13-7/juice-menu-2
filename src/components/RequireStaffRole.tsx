import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStaffAuth } from '../context/StaffAuthContext'
import type { StaffRole } from '../lib/baristaAuth'

export default function RequireStaffRole({ roles }: { roles: StaffRole[] }) {
  const { session, role, loading, error } = useStaffAuth()
  const location = useLocation()

  if (loading) {
    return <AccessMessage>جارِ التحقق من جلسة الدخول...</AccessMessage>
  }

  if (error) {
    return <AccessMessage>{`تعذر التحقق من جلسة الدخول: ${error}`}</AccessMessage>
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  if (!role) {
    return <Navigate to="/login" replace state={{ reason: 'unauthorized' }} />
  }

  if (!roles.includes(role)) {
    return (
      <Navigate
        to={role === 'admin' ? '/admin/menu' : '/barista'}
        replace
        state={{ accessDenied: 'هذا القسم غير متاح لهذا الحساب' }}
      />
    )
  }

  return <Outlet />
}

function AccessMessage({ children }: { children: string }) {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center px-6 text-center text-cream/70 text-sm">
      {children}
    </div>
  )
}
