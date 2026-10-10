import type { ReactNode } from 'react'
import { Breadcrumbs } from '../tailgrids/core/breadcrumbs'

// NextAdmin page header: 28/32 title on the left, optional action plus "Home > page" breadcrumb on the right.
interface PageHeadingProps {
  title: string
  subtitle?: ReactNode
  /** Page-level control (for example a reload button); the caller supplies its own Button. */
  action?: ReactNode
}

function PageHeading({ title, subtitle, action }: PageHeadingProps) {
  // Role areas live under /<area>/..., so "Home" is the area root.
  const homeHref = `/${window.location.pathname.split('/')[1] ?? ''}`
  return (
    <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {action}
        <Breadcrumbs
          dividerType="chevron"
          items={[
            { href: homeHref, label: 'Trang chủ' },
            { href: '#', label: title },
          ]}
        />
      </div>
    </div>
  )
}

export default PageHeading
