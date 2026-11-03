import { useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'
import type { ResourceStatus } from '../../../hooks/usePageResource'
import ListCard from '../../console/list-card'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
import { formatAbsolute, parseInstant } from '../../console/detail/detail-format'
import { FilterSelect } from '../../console/filter-toolbar'
import { COURSE_QUIZ_TYPES, quizTypeLabel } from '../../../lib/quiz-types'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { describePublishProblems } from './publish-problems'
import { stoppedLast } from '../../../lib/stopped-last'

const labels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ' }

type CatalogFilters = { query: string; status: string; type: string }
function readFilters(key: string): CatalogFilters {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (saved && typeof saved === 'object' && 'query' in saved && typeof saved.query === 'string' &&
      'status' in saved && typeof saved.status === 'string' && 'type' in saved && typeof saved.type === 'string') {
      return { query: saved.query, status: saved.status, type: saved.type }
    }
  } catch { /* Storage may be unavailable; filtering still works in memory. */ }
  return { query: '', status: 'ALL', type: 'ALL' }
}

function deadlineLabel(value: string | null) {
  const date = parseInstant(value)
  return date ? formatAbsolute(date) : 'Chưa đặt lịch'
}

/** Shared presentation only; each screen retains its existing permission/state handlers. */
export default function QuizCatalog({ items, status, errorMessage, onRetry, readOnly, exam = false, placement = false, scope = '', renderActions }: {
  items: TeacherQuizRecord[]
  status: ResourceStatus
  errorMessage: string
  onRetry: () => void
  readOnly: boolean
  exam?: boolean
  placement?: boolean
  scope?: string
  renderActions: (quiz: TeacherQuizRecord) => ReactNode
}) {
  const { identity } = useQuizAccess()
  const storageKey = `hocluc.quiz-filters:${identity}:${placement ? 'placement' : exam ? 'exam' : 'course'}:${scope}`
  const [filters, setFilters] = useState(() => readFilters(storageKey))
  const updateFilter = (key: keyof CatalogFilters, value: string) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Optional persistence. */ }
  }
  const typeFilter = filters.type
  // archived ones sink to the bottom
  const filteredItems = stoppedLast(exam || typeFilter === 'ALL' ? items : items.filter(quiz => quiz.type === typeFilter),
    quiz => quiz.status === 'ARCHIVED')
  const published = placement ? items.filter(quiz => quiz.status === 'PUBLISHED') : []
  const newestTime = Math.max(...published.map(quiz => Date.parse(quiz.createdAt ?? '')))
  const newest = published.filter(quiz => Date.parse(quiz.createdAt ?? '') === newestTime)
  const columns: ColumnDef<TeacherQuizRecord>[] = [
    {
      accessorKey: 'title', header: placement ? 'Bài đánh giá' : exam ? 'Đề thi' : 'Bài kiểm tra',
      cell: ({ row: { original: quiz } }) => <div className="min-w-48 max-w-80 space-y-1">
        <h2 className="text-sm font-medium break-words text-text-primary">{quiz.title}</h2>
        {placement && newest.some(item => item.id === quiz.id) && <Status tone="info">{newest.length === 1 ? 'Đang dùng cho Student' : 'Cùng thời điểm tạo mới nhất'}</Status>}
        {!exam && <Status tone="info">{quizTypeLabel(quiz.type)}</Status>}
        {quiz.status === 'DRAFT' && Boolean(quiz.publishProblems?.length) &&
          <p className="text-xs leading-5 text-text-tertiary">Cần hoàn thiện: {describePublishProblems(quiz.publishProblems)}</p>}
      </div>,
    },
    ...(placement ? [] : [{ accessorKey: 'courseTitle', header: 'Vị trí',
      cell: ({ row: { original: quiz } }) => <div className="min-w-28 max-w-48 space-y-1 whitespace-normal">
        <p>{quiz.courseTitle || '—'}</p>
        <p className="text-xs leading-5 text-text-tertiary">{[quiz.chapterTitle, quiz.lessonTitle].filter(Boolean).join(' → ')}</p>
      </div> } satisfies ColumnDef<TeacherQuizRecord>]),
    { id: 'settings', header: 'Nội dung', accessorFn: quiz => quiz.questionCount,
      cell: ({ row: { original: quiz } }) => <div className="space-y-1 whitespace-nowrap">
        <p>{quiz.questionCount} câu hỏi</p>
        <p className="text-xs text-text-tertiary">{quiz.durationMinutes ? `${quiz.durationMinutes} phút` : 'Không giới hạn thời gian'}</p>
        {placement && <p className="text-xs text-text-tertiary">Tối đa {quiz.maxAttempts} lượt</p>}
        {exam && !placement && quiz.passingPercentage != null && <p className="text-xs text-text-tertiary">Điểm đạt: {quiz.passingPercentage}%</p>}
        {exam && !placement && <p className="text-xs text-text-tertiary">Hạn: {deadlineLabel(quiz.availableUntil)}</p>}
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
  return <>
    <ScheduleResourceState status={status} errorMessage={errorMessage} onRetry={onRetry} skeleton="table">
      <p className="-mb-3 text-xs text-text-tertiary sm:hidden">Vuốt ngang bảng để xem đầy đủ thông tin và thao tác.</p>
      <ListCard data={filteredItems} columns={columns} getRowKey={quiz => quiz.id}
        searchState={{ value: filters.query, onChange: value => updateFilter('query', value) }}
        filterState={{ value: filters.status, onChange: value => updateFilter('status', value) }}
        searchPlaceholder={placement ? 'Tìm bài đánh giá đầu vào...' : exam ? 'Tìm đề thi hoặc khóa học...' : 'Tìm bài kiểm tra, khóa học hoặc bài học...'}
        searchText={quiz => [quiz.title, quiz.courseTitle, quiz.chapterTitle, quiz.lessonTitle, quizTypeLabel(quiz.type)].filter(Boolean).join(' ')}
        extraFilters={!exam && <FilterSelect ariaLabel="Lọc loại bài kiểm tra" value={typeFilter} onChange={value => updateFilter('type', value)}
          options={[{ id: 'ALL', label: 'Tất cả loại bài' }, ...COURSE_QUIZ_TYPES]} />}
        filter={{ ariaLabel: 'Lọc trạng thái', allLabel: 'Tất cả trạng thái', options: Object.values(labels), get: quiz => labels[quiz.status] }}
        emptyMessage={items.length === 0
          ? readOnly ? 'Chưa có bài kiểm tra trong các khóa được phân công.' : placement ? 'Chưa có bài đánh giá đầu vào. Chọn “Tạo đánh giá đầu vào” để bắt đầu.' : exam ? 'Chưa có đề thi thử. Chọn “Tạo đề thi thử” để bắt đầu.' : 'Chưa có bài kiểm tra. Chọn “Tạo bài kiểm tra” để bắt đầu.'
          : 'Không có kết quả phù hợp. Thử từ khóa hoặc bộ lọc khác.'} />
    </ScheduleResourceState>
  </>
}
