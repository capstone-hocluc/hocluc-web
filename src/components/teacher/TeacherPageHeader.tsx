import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

interface TeacherPageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

/** Title block shared by the teacher feature pages. */
export default function TeacherPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: TeacherPageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <span className="block text-[13px] font-bold tracking-[1.2px] text-primary">{eyebrow}</span>
        )}
        <h1 className="mb-1.5 text-[26px] leading-tight font-normal tracking-[-0.8px] text-text-heading">
          {title}
        </h1>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** "Back to ..." text button above a teacher sub-page. */
export function TeacherBackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit cursor-pointer items-center gap-1.5 text-[13px] font-bold text-primary"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {children}
    </button>
  )
}
