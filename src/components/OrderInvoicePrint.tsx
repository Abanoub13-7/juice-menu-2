import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { storeConfig } from '../config/store'
import type { OrderWithItems } from '../types/order'
import { formatMoney, formatOrderDateTime, formatPlainNumber } from '../utils/format'

/**
 * Prints exactly one order's invoice.
 *
 * The invoice is rendered into its own portal on <body>. While it is mounted,
 * `body.printing-invoice` makes the print stylesheet (src/index.css) hide the
 * whole app (#root) and show only this invoice, so the dashboard, other orders,
 * filters and buttons can never end up on paper. On screen the portal is hidden.
 */
export default function OrderInvoicePrint({ order, onDone }: { order: OrderWithItems; onDone: () => void }) {
  useEffect(() => {
    document.body.classList.add('printing-invoice')
    const finish = () => onDone()
    window.addEventListener('afterprint', finish)
    // Let the portal paint (and fonts apply) before opening the print dialog.
    const timer = window.setTimeout(() => window.print(), 120)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', finish)
      document.body.classList.remove('printing-invoice')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="invoice-print-root" dir="rtl" lang="ar">
      <article className="invoice">
        <header className="invoice-header">
          <h1 className="invoice-store-ar">{storeConfig.nameAr}</h1>
          <p className="invoice-store-en" dir="ltr">{storeConfig.nameEn}</p>
          <p className="invoice-small">{storeConfig.address}</p>
          <p className="invoice-small">هاتف: <span className="invoice-num">{storeConfig.phone}</span></p>
        </header>

        <div className="invoice-rule" />

        <dl className="invoice-meta">
          <div><dt>فاتورة طلب رقم</dt><dd className="invoice-num invoice-code">{order.display_code}</dd></div>
          <div><dt>التاريخ والوقت</dt><dd className="invoice-num">{formatOrderDateTime(order.created_at)}</dd></div>
        </dl>

        <div className="invoice-rule" />

        <table className="invoice-items">
          <thead>
            <tr>
              <th className="invoice-col-name">الصنف</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="invoice-col-name">
                  <span className="invoice-item-name">{item.product_name_snapshot}</span>
                  <span className="invoice-item-size"> ({item.size})</span>
                  {item.notes && <span className="invoice-item-notes">ملاحظات: {item.notes}</span>}
                </td>
                <td className="invoice-num">{formatPlainNumber(item.quantity)}</td>
                <td className="invoice-num">{formatPlainNumber(Number(item.unit_price))}</td>
                <td className="invoice-num">{formatPlainNumber(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-rule invoice-rule-solid" />

        <div className="invoice-total">
          <span>الإجمالي</span>
          <span className="invoice-num">{formatMoney(Number(order.total_amount))}</span>
        </div>

        <div className="invoice-rule" />
        <p className="invoice-thanks">شكرًا لزيارتكم</p>
      </article>
    </div>,
    document.body,
  )
}
