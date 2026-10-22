import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { StaffAuthProvider, useStaffAuth } from './context/StaffAuthContext'
import RequireStaffRole from './components/RequireStaffRole'
import MenuPage from './pages/MenuPage'
import OrderPage from './pages/OrderPage'
import BaristaLoginPage from './pages/BaristaLoginPage'
import BaristaDashboardPage from './pages/BaristaDashboardPage'
import AdminMenuPage from './pages/AdminMenuPage'

export default function App() {
  return (
    <StaffAuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/order/:token" element={<OrderPage />} />
            <Route path="/login" element={<BaristaLoginPage />} />
            <Route path="/barista/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<StaffEntry />} />
            <Route element={<RequireStaffRole roles={['admin', 'barista']} />}>
              <Route path="/barista" element={<BaristaDashboardPage />} />
            </Route>
            <Route element={<RequireStaffRole roles={['admin']} />}>
              <Route path="/admin/menu" element={<AdminMenuPage />} />
              <Route path="/admin/prices" element={<Navigate to="/admin/menu" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </StaffAuthProvider>
  )
}

function StaffEntry() {
  const { session, role, loading, error } = useStaffAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center text-cream/70">جارِ التحقق من جلسة الدخول...</div>
  if (error) return <div role="alert" className="flex min-h-screen items-center justify-center px-6 text-center text-cream/70">{`تعذر التحقق من جلسة الدخول: ${error}`}</div>
  if (!session) return <Navigate to="/login" replace state={{ from: '/admin' }} />
  if (role === 'admin') return <Navigate to="/admin/menu" replace />
  if (role === 'barista') return <Navigate to="/barista" replace />
  return <Navigate to="/login" replace state={{ reason: 'unauthorized' }} />
}
