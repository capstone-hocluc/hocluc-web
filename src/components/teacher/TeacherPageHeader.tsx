import type { ReactNode } from 'react'

interface TeacherPageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

/** Reuse the teacher dashboard's existing title rhythm for feature pages. */
export default function TeacherPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: TeacherPageHeaderProps) {
  return (
    <header className="hl-teacher-title">
      <div>
        {eyebrow && <span className="hl-teacher-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
