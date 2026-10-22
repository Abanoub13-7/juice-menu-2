import { storeConfig } from '../config/store'
import StoreBranches from './StoreBranches'
import StoreContact from './StoreContact'
import StoreLocation from './StoreLocation'

/**
 * The complete store-information section for the customer-facing menu.
 * Individual pieces remain reusable in compact contexts such as the footer.
 */
export default function StoreInfo() {
  return (
    <section id="store-info" className="scroll-mt-36 mx-auto grid max-w-6xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
      <StoreLocation />
      <div className="space-y-6 rounded-[24px] bg-[#f3f0e8] p-5 sm:p-6">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a86028]">عن المكان</p>
          <h2 className="font-display text-2xl font-bold text-[#20352a]">نكهة قريبة منك</h2>
          <p className="mt-2 text-sm leading-7 text-[#687268]">{`اختار طلبك من المنيو، وتعالى عندنا في ${storeConfig.nameAr} أو تواصل معنا مباشرة.`}</p>
        </div>
        <StoreContact />
        <StoreBranches />
      </div>
    </section>
  )
}
