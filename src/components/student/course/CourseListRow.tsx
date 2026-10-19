import type { ReactNode } from 'react'

interface CourseListRowProps {
  title: ReactNode
  /** Line under the title (time, instructor...). */
  meta: ReactNode
  actions?: ReactNode
}

// Divider-separated row for lists inside a Card (live classes, recordings).
function CourseListRow({ title, meta, actions }: CourseListRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-1">
        <strong className="text-base font-semibold text-text-heading">{title}</strong>
        {meta}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export default CourseListRow
