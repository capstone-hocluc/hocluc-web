import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import { ArrowLeft } from '../../console/icons'
import StatusBadge from '../../console/status'
import type { EditorLayout } from './editor-layout'

const STATUS: Record<TeacherQuizRecord['status'], { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  DRAFT: { label: 'Bản nháp', tone: 'warning' },
  PUBLISHED: { label: 'Đã xuất bản', tone: 'success' },
  ARCHIVED: { label: 'Đã lưu trữ', tone: 'neutral' },
}

/**
 * The top bar every quiz and exam editor shares: back, the quiz's name and status, and the editor's actions. In the
 * assistant's frame (`workspace`) it is the assistant's own header: white over the grey canvas, with the HocLuc mark.
 */
export default function EditorTopBar({ title, backLabel, status, onBack, layout = 'console', children }: {
  title: string
  backLabel: string
  status: TeacherQuizRecord['status'] | null
  onBack: () => void
  layout?: EditorLayout
  children: ReactNode
}) {
  const workspace = layout === 'workspace'
  return (
    <header
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2',
        workspace ? 'min-h-14 bg-card-background px-2 py-2 sm:px-3' : 'border-b border-card-border px-4 py-2.5 sm:px-6'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button type="button" aria-label={backLabel} title={backLabel} onClick={onBack}
          className={cn(
            'grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent hover:bg-background-gray-secondary',
            workspace ? 'text-icon-tertiary hover:text-text-primary' : '-ml-1.5 text-icon-primary'
          )}>
          <ArrowLeft size={workspace ? 17 : 20} aria-hidden="true" />
        </button>
        {workspace && (
          <>
            <span aria-hidden className="hidden h-6 w-px shrink-0 bg-card-border sm:block" />
            <img src="/hocluc-mark.svg" alt="" aria-hidden width={23} height={30} className="hidden shrink-0 sm:block" />
          </>
        )}
        <h1 className={cn('m-0 min-w-0 truncate text-text-primary', workspace ? 'px-1 text-[15px] font-medium' : 'text-lg font-semibold')}>
          {title}
        </h1>
        {status && <StatusBadge tone={STATUS[status].tone}>{STATUS[status].label}</StatusBadge>}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </header>
  )
}
