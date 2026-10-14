import type { ReactNode } from 'react'
import { Breadcrumbs } from '../tailgrids/core/breadcrumbs'
import { Eye } from './icons'

// NextAdmin page header: "Home > page" breadcrumb and 28/32 title stacked on the left, optional action on the right.
interface PageHeadingProps {
  title: string
  subtitle?: ReactNode
  /** Page-level control (for example a reload button); the caller supplies its own Button. */
  action?: ReactNode
  /** Marks a page the role can look at but not change. */
  readOnly?: boolean
}

function PageHeading({ title, subtitle, action, readOnly = false }: PageHeadingProps) {
  // Staff areas live under /console/<area>/..., so "Home" is the area root.
  const [, first, second] = window.location.pathname.split('/')
  const homeHref = first === 'console' ? `/console/${second ?? ''}` : `/${first ?? ''}`
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-2">
        <Breadcrumbs
          dividerType="chevron"
          items={[
            { href: homeHref, label: 'Trang chủ' },
            { href: '#', label: title },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
          {readOnly && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background-gray-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
              <Eye size={14} aria-hidden />
              Chế độ xem
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-text-tertiary">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}

export default PageHeading
