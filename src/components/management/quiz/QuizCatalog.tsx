import { useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import type { ResourceStatus } from '../../../hooks/usePageResource'
import { CheckCircle2, ClipboardCheck, Users } from '../../console/icons'
import ListCard from '../../console/list-card'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
import StatCard from '../../ui/StatCard'
import { formatAbsolute, parseInstant } from '../../console/detail/detail-format'
import { FilterSelect } from '../../console/filter-toolbar'
import { COURSE_QUIZ_TYPES, quizTypeLabel } from '../../../lib/quiz-types'

const labels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }
const statClass = 'p-3 text-xs sm:p-5 sm:text-sm [&_b]:text-xl sm:[&_b]:text-2xl'

function deadlineLabel(value: string | null) {
  const date = parseInstant(value)
  return date ? formatAbsolute(date) : 'Chưa đặt lịch'
}

/** Shared presentation only; each screen retains its existing permission/state handlers. */
export default function QuizCatalog({ items, status, errorMessage, onRetry, readOnly, exam = false, renderActions }: {
  items: TeacherQuizRecord[]
  status: ResourceStatus
  errorMessage: string
  onRetry: () => void
  readOnly: boolean
  exam?: boolean
  renderActions: (quiz: TeacherQuizRecord) => ReactNode
}) {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const filteredItems = exam || typeFilter === 'ALL' ? items : items.filter(quiz => quiz.type === typeFilter)
  const columns: ColumnDef<TeacherQuizRecord>[] = [
    {
      accessorKey: 'title', header: exam ? 'Đề thi' : 'Bài kiểm tra',
      cell: ({ row: { original: quiz } }) => <div className="min-w-48 max-w-80 space-y-1">
        <h2 className="text-sm font-medium break-words text-text-primary">{quiz.title}</h2>
        {!exam && <Status tone="info">{quizTypeLabel(quiz.type)}</Status>}
        {quiz.status === 'DRAFT' && Boolean(quiz.publishProblems?.length) &&
          <p className="text-xs leading-5 text-text-tertiary">Cần hoàn thiện: {quiz.publishProblems?.join(', ')}</p>}
      </div>,
    },
    { accessorKey: 'courseTitle', header: 'Vị trí',
      cell: ({ row: { original: quiz } }) => <div className="min-w-28 max-w-48 space-y-1 whitespace-normal">
        <p>{quiz.courseTitle || '—'}</p>
        <p className="text-xs leading-5 text-text-tertiary">{[quiz.chapterTitle, quiz.lessonTitle].filter(Boolean).join(' → ')}</p>
      </div> },
    { id: 'settings', header: 'Nội dung', accessorFn: quiz => quiz.questionCount,
      cell: ({ row: { original: quiz } }) => <div className="space-y-1 whitespace-nowrap">
        <p>{quiz.questionCount} câu hỏi</p>
        <p className="text-xs text-text-tertiary">{quiz.durationMinutes ? `${quiz.durationMinutes} phút` : 'Không giới hạn thời gian'}</p>
        {exam && quiz.passingPercentage != null && <p className="text-xs text-text-tertiary">Điểm đạt: {quiz.passingPercentage}%</p>}
        {exam && <p className="text-xs text-text-tertiary">Hạn: {deadlineLabel(quiz.availableUntil)}</p>}
      </div> },
    { accessorKey: 'attemptCount', header: 'Lượt làm', meta: { className: 'text-center' } },
    { accessorKey: 'status', header: 'Trạng thái',
      cell: ({ row: { original: quiz } }) => <div className="flex flex-col items-start gap-1.5 whitespace-nowrap">
        <Status tone={quiz.status === 'PUBLISHED' ? 'success' : quiz.status === 'DRAFT' ? 'warning' : 'neutral'}>{labels[quiz.status]}</Status>
        {(quiz.locked || quiz.attemptCount > 0) && <span className="text-xs text-text-tertiary">Đã có lượt thi</span>}
      </div> },
    { id: 'actions', header: 'Thao tác', enableSorting: false,
      meta: { className: 'text-right' }, cell: ({ row }) => renderActions(row.original) },
  ]
  const ready = status === 'ready'
  return <>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <StatCard className={statClass} label={exam ? 'Tổng đề thi thử' : 'Tổng bài kiểm tra'} value={ready ? items.length : '—'} icon={ClipboardCheck} />
      <StatCard className={statClass} label="Đã xuất bản" value={ready ? items.filter(item => item.status === 'PUBLISHED').length : '—'} icon={CheckCircle2} tone="success" />
      <StatCard className={statClass} label="Lượt làm bài" value={ready ? items.reduce((sum, item) => sum + item.attemptCount, 0) : '—'} icon={Users} />
    </div>
    <ScheduleResourceState status={status} errorMessage={errorMessage} onRetry={onRetry} skeleton="table">
      <p className="-mb-3 text-xs text-text-tertiary sm:hidden">Vuốt ngang bảng để xem đầy đủ thông tin và thao tác.</p>
      <ListCard data={filteredItems} columns={columns} getRowKey={quiz => quiz.id}
        searchPlaceholder={exam ? 'Tìm đề thi hoặc khóa học...' : 'Tìm bài kiểm tra, khóa học hoặc bài học...'}
        searchText={quiz => [quiz.title, quiz.courseTitle, quiz.chapterTitle, quiz.lessonTitle, quizTypeLabel(quiz.type)].filter(Boolean).join(' ')}
        extraFilters={!exam && <FilterSelect ariaLabel="Lọc loại bài kiểm tra" value={typeFilter} onChange={setTypeFilter}
          options={[{ id: 'ALL', label: 'Tất cả loại bài' }, ...COURSE_QUIZ_TYPES]} />}
        filter={{ ariaLabel: 'Lọc trạng thái', allLabel: 'Tất cả trạng thái', options: Object.values(labels), get: quiz => labels[quiz.status] }}
        emptyMessage={items.length === 0
          ? readOnly ? 'Chưa có bài kiểm tra trong các khóa được phân công.' : exam ? 'Chưa có đề thi thử. Chọn “Tạo đề thi thử” để bắt đầu.' : 'Chưa có bài kiểm tra. Chọn “Tạo bài kiểm tra” để bắt đầu.'
          : 'Không có kết quả phù hợp. Thử từ khóa hoặc bộ lọc khác.'} />
    </ScheduleResourceState>
  </>
}
