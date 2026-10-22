import { useState } from 'react'
import Header from '../components/Header'
import CategoryNav from '../components/CategoryNav'
import ProductGrid from '../components/ProductGrid'
import Footer from '../components/Footer'
import SearchOverlay from '../components/SearchOverlay'
import CartButton from '../components/CartButton'
import CartDrawer from '../components/CartDrawer'
import StoreInfo from '../components/StoreInfo'
import { menu } from '../data/menu'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLiveMenu } from '../hooks/useLiveMenu'
import { ArrowDown, Leaf } from 'lucide-react'

export default function MenuPage() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { categories, error } = useLiveMenu()
  const { activeId, registerSection, scrollToSection } = useActiveSection(menu[0].id)
  const scrollToStoreInfo = () => {
    document.getElementById('store-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) {
    return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#fbfaf6] px-6 text-center text-[#687268]">تعذر تحميل المنيو الحالية. برجاء المحاولة لاحقًا.</div>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearchOpen={() => setSearchOpen(true)} onStoreInfoOpen={scrollToStoreInfo} />
      <CategoryNav categories={categories} activeId={activeId} onSelect={scrollToSection} />

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-2 pt-6 sm:px-6 md:grid-cols-[1.1fr_.9fr] md:items-center md:pt-10">
        <div className="rounded-[28px] bg-[#2f805e] px-6 py-8 text-white shadow-[0_18px_45px_rgba(47,128,94,0.2)] sm:px-10 sm:py-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-[#fbd27d]"><Leaf className="h-3.5 w-3.5" /> طازة كل يوم</span>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">طعم الفاكهة على أصوله</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/75">اختار عصيرك المفضل، حدد الحجم، وخلّي طلبك علينا.</p>
          <button type="button" onClick={() => scrollToSection(categories[0].id)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f29a4a] px-5 py-3 text-sm font-extrabold text-[#392313] shadow-sm active:scale-95">
            تصفح المنيو <ArrowDown className="h-4 w-4" />
          </button>
        </div>
        <div className="relative hidden min-h-[230px] overflow-hidden rounded-[28px] bg-[#f4d77e] md:block">
          <img src="https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=82" alt="عصير برتقال طازج" width="900" height="600" className="h-full w-full object-cover mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#f4d77e]/10 to-[#2f805e]/20" />
        </div>
      </section>

      <main className="flex-1 pb-24">
        <ProductGrid categories={categories} registerSection={registerSection} />

        <StoreInfo />
      </main>

      <Footer />

      <CartButton onOpen={() => setCartOpen(true)} />

      {searchOpen && <SearchOverlay categories={categories} onClose={() => setSearchOpen(false)} />}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </div>
  )
}
