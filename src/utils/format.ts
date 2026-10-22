/** Shared display formatting for the daily report and the printed invoice.
 *  Latin digits are used on purpose: staff copy these figures into a separate
 *  cash register system, where unambiguous digits matter. */

/** The store's business time zone. Day boundaries for reports are computed here,
 *  never from the browser's local zone or UTC, to avoid off-by-one-day errors. */
export const BUSINESS_TIME_ZONE = 'Africa/Cairo'

const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function formatMoney(value: number): string {
  return `${moneyFormatter.format(Number.isFinite(value) ? value : 0)} ج.م`
}

export function formatPlainNumber(value: number): string {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0)
}

const timeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: BUSINESS_TIME_ZONE })
const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: BUSINESS_TIME_ZONE })

export function formatOrderTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : timeFormatter.format(date)
}

export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}
