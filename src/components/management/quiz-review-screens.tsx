import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, ClipboardList, Clock3, GraduationCap, ListChecks, MoreHorizontal } from '../console/icons'
import ListCard from '../console/list-card'
import ScheduleResourceState from '../console/schedule/schedule-resource-state'
import SelectField from '../console/select-field'
import Notice from '../console/notice'
import StatCard from '../ui/StatCard'
import Status from '../console/status'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../tailgrids/core/dropdown'
import { usePageResource } from '../../hooks/usePageResource'
import { getErrorMessage } from '../../lib/errors'
import {
  getTeacherQuiz,
  getTeacherQuizAttempts,
  getTeacherQuizStats,
  getTeacherQuizzes,
  markTeacherQuestionsReviewed,
  type TeacherAttemptRecord,
  type TeacherQuestionType,
} from '../../services/teacherQuizService'
import Page from './screen-page'
import { text } from './screen-columns'

// Màn hình dùng API giáo viên (/api/v1/teacher/...): Teacher, Staff, Manager, Admin đều gọi được.

const QUESTION_TYPE_LABELS: Record<TeacherQuestionType, string> = {
  SINGLE_CHOICE: 'Một đáp án',
  MULTIPLE_CHOICE: 'Nhiều đáp án',
  TRUE_FALSE: 'Đúng/Sai',
  SHORT_ANSWER: 'Trả lời ngắn',
  LONG_ANSWER: 'Tự luận',
}

const formatDateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'

/* ---------- Duyệt câu hỏi ---------- */

interface ReviewRow {
  id: string
  quizId: string
  quizTitle: string
  courseTitle: string
  questionText: string
  type: string
  reviewNote: string
}

async function loadReviewRows(): Promise<ReviewRow[]> {
  const quizzes = (await getTeacherQuizzes()).filter((quiz) => quiz.needsReviewCount > 0)
  const editors = await Promise.all(quizzes.map((quiz) => getTeacherQuiz(quiz.id)))
  return editors.flatMap(({ quiz, questions }) =>
    questions
      .filter((question) => question.needsReview)
      .map((question) => ({
        id: question.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        courseTitle: quiz.courseTitle ?? '—',
        questionText: question.questionText,
        type: QUESTION_TYPE_LABELS[question.questionType],
        reviewNote: question.reviewNote ?? '—',
      }))
  )
}

export function QuestionReview() {
  const { data, setData, status, errorMessage, reload } = usePageResource(loadReviewRows, [])
  const [error, setError] = useState('')

  const markReviewed = async (row: ReviewRow) => {
    setError('')
    try {
      await markTeacherQuestionsReviewed(row.quizId, [row.id])
      setData((current) => current?.filter((item) => item.id !== row.id) ?? current)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  const columns: ColumnDef<ReviewRow>[] = [
      {
        id: 'questionText',
        header: 'Câu hỏi',
        accessorKey: 'questionText',
        cell: ({ row }) => <span className="block max-w-96 truncate font-medium text-text-primary">{row.original.questionText}</span>,
      },
      text<ReviewRow>('quizTitle', 'Bài kiểm tra'),
      text<ReviewRow>('courseTitle', 'Khóa học'),
      text<ReviewRow>('type', 'Dạng câu'),
      text<ReviewRow>('reviewNote', 'Ghi chú'),
      {
        id: 'status',
        header: 'Trạng thái',
        cell: () => <Status tone="warning">Chờ duyệt</Status>,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Thao tác duyệt câu hỏi"
                className="grid size-8 place-items-center rounded-md text-icon-tertiary outline-none hover:bg-background-gray-secondary"
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onAction={() => void markReviewed(row.original)}>
                  <CheckCircle2 size={16} />
                  Đánh dấu đã duyệt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
  ]

  const rows = data ?? []
  return (
    <Page
      title="Duyệt câu hỏi"
      stats={[
        { label: 'Câu hỏi chờ duyệt', value: rows.length, icon: Clock3, tone: 'warning' },
        { label: 'Bài kiểm tra liên quan', value: new Set(rows.map((row) => row.quizId)).size, icon: ClipboardList },
      ]}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <ScheduleResourceState status={status} errorMessage={errorMessage} onRetry={reload} empty={status === 'ready' && rows.length === 0} emptyMessage="Không có câu hỏi nào chờ duyệt.">
        <ListCard
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Tìm câu hỏi, bài kiểm tra..."
          searchText={(row) => `${row.questionText} ${row.quizTitle} ${row.courseTitle}`}
        />
      </ScheduleResourceState>
    </Page>
  )
}

/* ---------- Bài làm học viên ---------- */

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Đang làm',
  PAUSED: 'Tạm dừng',
  SUBMITTED: 'Đã nộp',
  GRADED: 'Đã chấm',
  EXPIRED: 'Hết giờ',
}

interface AttemptRow {
  id: string
  student: string
  email: string
  attempt: string
  status: string
  score: string
  correct: string
  duration: string
  submittedAt: string
  passed: boolean
}

const toAttemptRow = (item: TeacherAttemptRecord): AttemptRow => ({
  id: item.attemptId,
  student: item.studentName || item.studentEmail || '—',
  email: item.studentEmail ?? '—',
  attempt: `Lần ${item.attemptNumber}`,
  status: ATTEMPT_STATUS_LABELS[item.status] ?? item.status,
  score: item.percentage === null ? '—' : `${Math.round(item.percentage)}%`,
  correct: item.totalQuestions === null ? '—' : `${item.correctCount ?? 0}/${item.totalQuestions}`,
  duration: item.timeSpentSeconds === null ? '—' : `${Math.max(1, Math.round(item.timeSpentSeconds / 60))} phút`,
  submittedAt: formatDateTime(item.submittedAt),
  passed: item.passed,
})

function QuizAttempts({ quizId }: { quizId: string }) {
  const { data, status, errorMessage, reload } = usePageResource(
    async () => {
      const [attempts, stats] = await Promise.all([getTeacherQuizAttempts(quizId), getTeacherQuizStats(quizId)])
      return { rows: attempts.map(toAttemptRow), stats }
    },
    [quizId]
  )

  const columns = useMemo<ColumnDef<AttemptRow>[]>(
    () => [
      {
        id: 'student',
        header: 'Học viên',
        accessorKey: 'student',
        cell: ({ row }) => (
          <span className="block">
            <span className="block font-medium text-text-primary">{row.original.student}</span>
            <span className="block text-xs text-text-tertiary">{row.original.email}</span>
          </span>
        ),
      },
      text<AttemptRow>('attempt', 'Lượt'),
      {
        id: 'status',
        header: 'Trạng thái',
        accessorKey: 'status',
        cell: ({ row }) => <Status tone={row.original.status === 'Đã chấm' ? 'success' : 'neutral'}>{row.original.status}</Status>,
      },
      text<AttemptRow>('score', 'Điểm'),
      text<AttemptRow>('correct', 'Đúng'),
      text<AttemptRow>('duration', 'Thời gian'),
      text<AttemptRow>('submittedAt', 'Nộp lúc'),
      {
        id: 'passed',
        header: 'Kết quả',
        accessorFn: (row) => (row.passed ? 1 : 0),
        cell: ({ row }) => <Status tone={row.original.passed ? 'success' : 'neutral'}>{row.original.passed ? 'Đạt' : 'Chưa đạt'}</Status>,
      },
    ],
    []
  )

  const stats = data?.stats
  return (
    <ScheduleResourceState status={status} errorMessage={errorMessage} onRetry={reload} empty={status === 'ready' && !data?.rows.length} emptyMessage="Chưa có học viên làm bài kiểm tra này.">
      <div className="space-y-5">
        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Lượt đã chấm" value={stats.gradedAttempts} icon={ListChecks} />
            <StatCard label="Đang làm" value={stats.inProgressAttempts} icon={Clock3} />
            <StatCard label="Điểm trung bình" value={stats.averagePercentage === null ? '—' : `${Math.round(stats.averagePercentage)}%`} icon={GraduationCap} />
            <StatCard label="Tỉ lệ đạt" value={stats.passRate === null ? '—' : `${Math.round(stats.passRate)}%`} icon={CheckCircle2} />
          </div>
        )}
        <ListCard
          data={data?.rows ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Tìm học viên..."
          searchText={(row) => `${row.student} ${row.email}`}
        />
      </div>
    </ScheduleResourceState>
  )
}

export function TeacherAttempts() {
  const { data, status, errorMessage, reload } = usePageResource(async () => (await getTeacherQuizzes()).filter((quiz) => quiz.attemptCount > 0), [])
  const [selected, setSelected] = useState('')
  const quizzes = data ?? []
  const quizId = selected || quizzes[0]?.id || ''

  return (
    <Page title="Bài làm học viên">
      <ScheduleResourceState status={status} errorMessage={errorMessage} onRetry={reload} empty={status === 'ready' && quizzes.length === 0} emptyMessage="Chưa có bài kiểm tra nào có lượt làm.">
        <div className="space-y-5">
          <SelectField
            ariaLabel="Chọn bài kiểm tra"
            value={quizId}
            onChange={setSelected}
            options={quizzes.map((quiz) => ({ id: quiz.id, label: quiz.title }))}
            triggerClassName="h-10 min-w-72"
          />
          {quizId && <QuizAttempts key={quizId} quizId={quizId} />}
        </div>
      </ScheduleResourceState>
    </Page>
  )
}
