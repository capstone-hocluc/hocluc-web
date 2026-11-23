import type { ReactNode } from 'react'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import { ArrowLeft } from '../../console/icons'
import StatusBadge from '../../console/status'

const STATUS: Record<TeacherQuizRecord['status'], { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  DRAFT: { label: 'Bản nháp', tone: 'warning' },
  PUBLISHED: { label: 'Đã xuất bản', tone: 'success' },
  ARCHIVED: { label: 'Đã lưu trữ', tone: 'neutral' },
}

/** The top bar every quiz and exam editor shares: back, the quiz's name and status, and the editor's actions. */
export default function EditorTopBar({ title, backLabel, status, onBack, children }: {
  title: string
  backLabel: string
  status: TeacherQuizRecord['status'] | null
  onBack: () => void
  children: ReactNode
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-card-border px-4 py-2.5 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button type="button" aria-label={backLabel} title={backLabel} onClick={onBack}
          className="-ml-1.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary hover:bg-background-gray-secondary">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="m-0 min-w-0 truncate text-lg font-semibold text-text-primary">{title}</h1>
        {status && <StatusBadge tone={STATUS[status].tone}>{STATUS[status].label}</StatusBadge>}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </header>
  )
}
