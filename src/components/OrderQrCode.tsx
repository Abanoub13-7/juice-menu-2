import { QRCodeSVG } from 'qrcode.react'

export default function OrderQrCode({ token }: { token: string }) {
  // Encodes only the order URL — the barista/customer's device fetches the
  // live order from Supabase via the token, so the QR never carries order
  // contents (which could go stale the moment a price or status changes).
  const baseUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin
  const url = `${baseUrl}/order/${token}`

  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[#e8e0d2] bg-white p-5 shadow-sm">
      <QRCodeSVG value={url} size={196} level="M" includeMargin={false} />
      <p dir="ltr" className="text-[11px] text-teal-900/60 break-all text-center max-w-[220px]">
        {url}
      </p>
    </div>
  )
}
