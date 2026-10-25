import type { ReactNode } from 'react'
import { Breadcrumbs } from '../tailgrids/core/breadcrumbs'
import { ArrowLeft, Eye } from './icons'

// Page header in the CRM dashboard's style: breadcrumb, a bold 26/30px title, a readable description and the page
// actions on the right.
interface PageHeadingProps {
  title: string
  /** Label of the list page this page was opened from; adds it to the breadcrumb, linking to /console/<area>/<list>. */
  parent?: string
  subtitle?: ReactNode
  /** Page-level control (for example a reload button); the caller supplies its own Button. */
  action?: ReactNode
  /** Marks a page the role can look at but not change. */
  readOnly?: boolean
  /** Shows an arrow beside the title that returns to the list; backLabel is its accessible name. */
  onBack?: () => void
  backLabel?: string
}

function PageHeading({ title, parent, subtitle, action, readOnly = false, onBack, backLabel = 'Quay lại' }: PageHeadingProps) {
  // Staff areas live under /console/<area>/..., so "Home" is the area root.
  const [, first, second, third] = window.location.pathname.split('/')
  const homeHref = first === 'console' ? `/console/${second ?? ''}` : `/${first ?? ''}`
  const parentHref = first === 'console' ? `/console/${second ?? ''}/${third ?? ''}` : `/${first ?? ''}`
  return (
    <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-col gap-1">
        <Breadcrumbs
          dividerType="chevron"
          items={[
            { href: homeHref, label: 'Trang chủ' },
            ...(parent ? [{ href: parentHref, label: parent }] : []),
            { href: '#', label: title },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button type="button" aria-label={backLabel} title={backLabel} onClick={onBack}
              className="-ml-1.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary hover:bg-background-gray-secondary">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          )}
          <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.5px] text-balance text-text-primary sm:text-[28px]">
            {title}
          </h1>
          {readOnly && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background-gray-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
              <Eye size={14} aria-hidden />
              Chế độ xem
            </span>
          )}
        </div>
        {subtitle && <p className="max-w-2xl text-sm leading-6 text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  )
}

export default PageHeading
