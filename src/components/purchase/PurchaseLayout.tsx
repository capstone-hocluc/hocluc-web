import type { ReactNode } from 'react'
import { PublicFooter, PublicHeader } from '../landing-page/PublicChrome'
import '../../styles/landing/purchase.css'

export default function PurchaseLayout({
  title,
  step,
  children,
}: {
  title: string
  step?: string
  children: ReactNode
}) {
  return (
    <div className="hl-purchase">
      <PublicHeader />
      <main className="purchase-container">
        <header className="purchase-heading">
          <p className="purchase-eyebrow">HỌC LỰC / {step || 'KHÓA HỌC'}</p>
          <h1>{title}</h1>
        </header>
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
export function PurchaseNotice({ children }: { children: ReactNode }) {
  return (
    <div className="purchase-notice" role="alert">
      {children}
    </div>
  )
}
