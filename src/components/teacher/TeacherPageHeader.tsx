import type { ReactNode } from 'react'

interface TeacherPageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

/** NextAdmin page title with an optional muted line and actions. */
export default function TeacherPageHeader({ title, description, actions }: TeacherPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-tertiary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
