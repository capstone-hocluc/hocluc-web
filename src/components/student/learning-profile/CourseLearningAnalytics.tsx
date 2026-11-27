import { useEffect, useState, type ReactNode } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import type { QuizAttemptSummary } from '../../../services/assessmentService'
import { getLearningCourseQuizzes, getLearningQuizHistory, type LearningCourseQuiz, type LearningProfileCourse, type LearningQuizAttempt } from '../../../services/learningProfileService'
import { formatDateTime, formatDuration } from '../../../lib/courseFormat'
import { quizTypeLabel } from '../../../lib/quiz-types'
import { studentRoutes } from '../../../lib/studentRoutes'
import type { ProfileNavigate } from './LearningCoursePanel'
import Card, { CardTitle } from '../../ui/Card'
import Button from '../../ui/Button'
import DropdownField from '../../ui/DropdownField'
import Notice from '../../ui/Notice'
import Skeleton from '../../ui/Skeleton'
import ResourceState from '../common/ResourceState'
import MascotState from '../../common/MascotState'
import surface from './LearningAnalyticsSurface.module.css'

const MODES = [
  { id: 'ALL', label: 'Tất cả chế độ' },
  { id: 'EXAM', label: 'Chính thức' },
  { id: 'PRACTICE', label: 'Luyện tập' },
  { id: 'UNKNOWN', label: 'Chưa xác định chế độ' },
]
const TYPE_COLORS: Record<string, string> = {
  QUICK: '#1e88ff', LESSON: '#16a569', CHAPTER: '#fd8945', EXAM: '#8b5cf6',
}
function modeOf(attempt: QuizAttemptSummary) {
  return attempt.mode === 'EXAM' || attempt.mode === 'PRACTICE' ? attempt.mode : 'UNKNOWN'
}
function attemptTime(attempt: QuizAttemptSummary) {
  const date = Date.parse(attempt.submittedAt || attempt.startedAt)
  return Number.isFinite(date) ? date : 0
}

export default function CourseLearningAnalytics({ courses, onNavigate, onRetry }: {
  courses: LearningProfileCourse[]; onNavigate: ProfileNavigate; onRetry: () => void
}) {
  const [filters, setFilters] = useState(() => {
    const query = new URLSearchParams(window.location.search)
    return { course: query.get('resultCourse') ?? '', type: query.get('resultType') ?? 'ALL',
      quiz: query.get('resultQuiz') ?? 'ALL' }
  })
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.has('resultMode')) {
      query.delete('resultMode')
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}${window.location.hash}`)
    }
  }, [])
  const course = courses.find(item => item.enrollment.course.id === filters.course) ?? courses[0]
  const courseId = course?.enrollment.course.id ?? ''
  const quizzes = getLearningCourseQuizzes(course ? [course] : [])
  const types = [...new Set(quizzes.map(quiz => quiz.type).filter(Boolean))]
  const type = types.includes(filters.type) ? filters.type : 'ALL'
  const filteredQuizzes = quizzes.filter(quiz => type === 'ALL' || quiz.type === type)
  const quiz = filteredQuizzes.find(item => item.id === filters.quiz)
  const quizId = quiz?.id ?? 'ALL'
  const selectedQuizzes = quiz ? [quiz] : filteredQuizzes
  const historyKey = JSON.stringify([courseId, selectedQuizzes.map(item => [item.id, item.title, item.type])])
  const update = (changes: Partial<typeof filters>) => {
    const next = { course: courseId, type, quiz: quizId, ...changes }
    setFilters(next)
    const query = new URLSearchParams(window.location.search)
    query.delete('resultMode')
    for (const [key, value] of Object.entries(next)) {
      const name = `result${key[0].toUpperCase()}${key.slice(1)}`
      if (value) query.set(name, value)
      else query.delete(name)
    }
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}${window.location.hash}`)
  }
  return <Card as="section" aria-label="Theo dõi kết quả khóa học" className={`${surface.panel} min-w-0 space-y-3 rounded-3xl p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="mb-1 text-lg">Tiến bộ học tập</CardTitle><p className="text-xs text-text-body">Theo dõi tiến độ học tập của bạn qua các bài kiểm tra.</p></div>
        {quiz && <Button size="sm" appearance="outline" shape="pill" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.quiz(quiz.id), courseId)}>Xem bài kiểm tra</Button>}
      </div>
      <div className="grid gap-2 min-[640px]:grid-cols-3">
        <Filter label="Khóa học"><DropdownField triggerClassName={surface.outline} ariaLabel="Lọc kết quả theo khóa học" value={courseId} options={courses.map(item => ({ id: item.enrollment.course.id, label: item.enrollment.course.title }))} onChange={value => update({ course: value ?? '', type: 'ALL', quiz: 'ALL' })} isSearchable isDisabled={!courses.length} /></Filter>
        <Filter label="Loại bài kiểm tra"><DropdownField triggerClassName={surface.outline} ariaLabel="Lọc loại bài kiểm tra" value={type} options={[{ id: 'ALL', label: 'Tất cả loại bài' }, ...types.map(id => ({ id, label: quizTypeLabel(id) }))]} onChange={value => update({ type: value ?? 'ALL', quiz: 'ALL' })} isDisabled={!quizzes.length} /></Filter>
        <Filter label="Bài kiểm tra"><DropdownField triggerClassName={surface.outline} ariaLabel="Chọn bài kiểm tra xem biểu đồ" value={filteredQuizzes.length ? quizId : null} options={[...(filteredQuizzes.length ? [{ id: 'ALL', label: type === 'ALL' ? 'Tất cả bài trong khóa' : 'Tất cả bài trong loại đã chọn' }] : []), ...filteredQuizzes.map(item => ({ id: item.id, label: item.title }))]} onChange={value => update({ quiz: value ?? 'ALL' })} isSearchable isDisabled={!filteredQuizzes.length} placeholder="Chưa có bài kiểm tra" /></Filter>
      </div>
      {courses.some(item => !item.study) && <Notice tone="warning">Một số khóa chưa tải được nội dung. Danh sách bài kiểm tra có thể chưa đầy đủ.<Button appearance="ghost" size="sm" onClick={onRetry}>Thử tải lại khóa học</Button></Notice>}
      {selectedQuizzes.length ? <QuizAttemptHistory key={historyKey} quizzes={selectedQuizzes} aggregate={!quiz} courseId={courseId} onNavigate={onNavigate} />
        : <MascotState imageSrc="/mascot/03.png" className={`${surface.soft} min-h-0 p-3 [&>img]:size-16`} title={course && !course.study ? 'Chưa tải được nội dung khóa để chọn bài kiểm tra.' : 'Chưa có bài kiểm tra phù hợp để theo dõi điểm.'} />}
  </Card>
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><p className="text-xs font-semibold text-text-body">{label}</p>{children}</div>
}

function QuizAttemptHistory({ quizzes, aggregate, courseId, onNavigate }: {
  quizzes: LearningCourseQuiz[]; aggregate: boolean; courseId: string; onNavigate: ProfileNavigate
}) {
  // Remount on quiz changes so an earlier quiz's data cannot flash under a new title.
  const history = usePageResource(() => getLearningQuizHistory(quizzes), [])
  const graded = (history.data?.attempts ?? []).filter(attempt => attempt.status === 'GRADED' && typeof attempt.percentage === 'number' && Number.isFinite(attempt.percentage))
    .sort((a, b) => attemptTime(a) - attemptTime(b) || a.attemptNumber - b.attemptNumber || a.attemptId.localeCompare(b.attemptId))
  const visible = graded.slice(-30)
  return <div className="space-y-3">
    <ResourceState imageSrc="/mascot/03.png" status={history.status} errorMessage={history.errorMessage} onRetry={history.reload}
      loading={<><p role="status" className="sr-only">Đang tải lịch sử bài kiểm tra…</p><Skeleton className="h-48 rounded-2xl" /></>} error={{ title: 'Không thể tải lịch sử bài kiểm tra' }}
      forbidden={{ title: 'Bạn không có quyền xem lịch sử bài này', message: 'Chọn bài kiểm tra khác hoặc kiểm tra lại quyền truy cập khóa học.' }}
      notFound={{ title: 'Không tìm thấy bài kiểm tra', message: 'Bài kiểm tra có thể không còn khả dụng. Hãy chọn bài khác.' }} />
    {history.status === 'ready' && <>
      {!!history.data?.failures.length && <Notice tone="warning"><div className="space-y-1"><p>Đã tải {history.data.loaded}/{quizzes.length} bài. Biểu đồ chưa bao gồm các bài bị lỗi:</p><ul>{history.data.failures.map(item => <li key={item.quizId}>{item.title}: {item.message}</li>)}</ul><Button size="sm" appearance="ghost" onClick={history.reload}>Thử tải lại lịch sử</Button></div></Notice>}
      {visible.length ? <>
        <dl className={`${surface.soft} grid gap-2 rounded-xl px-3 py-2 ${aggregate ? 'grid-cols-2 min-[640px]:grid-cols-4' : 'grid-cols-3'}`}>
          {[
            ...(aggregate ? [['Bài có kết quả', String(new Set(graded.map(item => item.quizId)).size)]] : []),
            ['Lượt đã chấm', String(graded.length)], ['Gần nhất', `${graded.at(-1)!.percentage}%`],
            ['Cao nhất', `${Math.max(...graded.map(attempt => attempt.percentage))}%`],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-text-body">{label}</dt><dd className="mt-1 font-bold text-primary-text">{value}</dd></div>)}
        </dl>
        <div className="grid min-w-0 items-start gap-3 min-[1200px]:grid-cols-2">
        <div className="min-w-0"><AttemptChart attempts={visible} aggregate={aggregate} /></div>
        <div className="min-w-0 space-y-2">
          <h3 className="flex h-8 items-center text-sm font-semibold">Lịch sử làm bài</h3>
        <div role="region" aria-label="Cuộn lịch sử làm bài" tabIndex={graded.length > 3 ? 0 : undefined} className="h-[272px] overflow-auto rounded-2xl border border-line-card bg-surface [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-focus-ring">
          <table className="w-full min-w-[480px] text-left text-xs">
            <caption className="sr-only">Lịch sử điểm các bài trong bộ lọc đang chọn</caption>
            <thead className="sticky top-0 z-10 bg-surface-brand text-text-body"><tr className="h-8">{['Lượt làm', 'Điểm', 'Thời gian', 'Kết quả'].map(label => <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
            <tbody>{[...graded].reverse().map(attempt => <tr key={`${attempt.quizId}:${attempt.attemptId}`} className="h-20 border-t border-line-card">
              <td className="max-w-52 px-3 py-2">{aggregate && <p className="mb-1 font-semibold break-words text-text-heading">{attempt.quizTitle}</p>}<strong>Lần {attempt.attemptNumber}</strong><p className="mt-1 text-text-body">{MODES.find(item => item.id === modeOf(attempt))!.label}</p><p className="mt-1 text-text-muted">{attempt.submittedAt ? formatDateTime(attempt.submittedAt) : 'Chưa có ngày nộp'}</p></td>
              <td className="px-3 py-2"><strong className="text-primary-text">{attempt.percentage}%</strong>{attempt.score != null && attempt.maxScore != null && <p className="mt-1 text-text-body">{attempt.score}/{attempt.maxScore} điểm</p>}</td>
              <td className="px-3 py-2 text-text-body">{attempt.timeSpentSeconds == null ? 'Chưa có dữ liệu' : attempt.timeSpentSeconds > 0 && attempt.timeSpentSeconds < 60 ? `${attempt.timeSpentSeconds} giây` : formatDuration(attempt.timeSpentSeconds)}</td>
              <td className="px-3 py-2"><Button size="sm" appearance="ghost" onClick={() => onNavigate(studentRoutes.attemptReview(attempt.attemptId), courseId)}>Xem kết quả</Button></td>
            </tr>)}</tbody>
          </table>
        </div>
        </div>
        </div>
      </> : <MascotState imageSrc="/mascot/03.png" className={`${surface.soft} min-h-0 p-3 [&>img]:size-16`} title="Chưa có kết quả theo bộ lọc" message="Chưa có lượt đã chấm cho các bài kiểm tra đang chọn. Lượt đang làm hoặc chưa có điểm không được đưa vào biểu đồ." />}
    </>}
  </div>
}

function AttemptChart({ attempts, aggregate }: { attempts: LearningQuizAttempt[]; aggregate: boolean }) {
  const x = (index: number) => attempts.length === 1 ? 350 : 50 + index / (attempts.length - 1) * 600
  const y = (percentage: number) => 200 - Math.max(0, Math.min(100, percentage)) * 1.7
  const types = [...new Set(attempts.map(attempt => attempt.quizType || 'UNKNOWN'))]
  const series = types.map(type => ({ id: type, type, label: quizTypeLabel(type), color: TYPE_COLORS[type] ?? 'var(--color-text-muted)' }))
  return <div className="space-y-2">
    <div className="flex h-8 min-w-0 items-center justify-between gap-3">
      <h3 className="shrink-0 text-sm font-semibold">Biểu đồ kết quả học tập</h3>
      <ul aria-label="Chú giải biểu đồ điểm" tabIndex={series.length > 1 ? 0 : undefined} className="flex min-w-0 items-center gap-2 overflow-x-auto text-xs text-text-body">{series.map(item => <li key={item.id} className="inline-flex shrink-0 items-center gap-1.5"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</li>)}</ul>
    </div>
    <div className="h-[272px] overflow-x-auto rounded-2xl border border-line-card bg-surface p-2">
      <svg viewBox="0 0 700 240" className="mx-auto h-full w-full min-w-[480px] max-w-[760px]" role="img" aria-label="Biểu đồ điểm các lần làm bài trong khóa học, đơn vị phần trăm; tối đa 30 lượt đã chấm gần nhất">
        {[0, 25, 50, 75, 100].map(tick => <g key={tick}><line x1="50" x2="650" y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeDasharray="4 5" /><text x="40" y={y(tick) + 4} textAnchor="end" fontSize="11" fill="currentColor">{tick}%</text></g>)}
        {series.map(item => {
          const points = attempts.flatMap((attempt, index) => (attempt.quizType || 'UNKNOWN') === item.type ? [{ attempt, index }] : [])
          return <g key={item.id}>
            {points.length > 1 && <polyline points={points.map(({ attempt, index }) => `${x(index)},${y(attempt.percentage)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" />}
            {points.map(({ attempt, index }) => <circle key={`${attempt.quizId}:${attempt.attemptId}`} cx={x(index)} cy={y(attempt.percentage)} r="5" fill={item.color} stroke="var(--color-surface)" strokeWidth="2"><title>{attempt.quizTitle} · Lần {attempt.attemptNumber} · {MODES.find(mode => mode.id === modeOf(attempt))!.label}: {attempt.percentage}%{attempt.submittedAt ? ` · ${formatDateTime(attempt.submittedAt)}` : ''}</title></circle>)}
          </g>
        })}
        {attempts.map((attempt, index) => {
          if (index % Math.max(1, Math.ceil(attempts.length / 8)) !== 0 && index !== attempts.length - 1) return null
          const timestamp = Date.parse(attempt.submittedAt ?? '')
          const date = new Date(timestamp)
          const label = aggregate ? Number.isFinite(timestamp) ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}` : `#${index + 1}` : `Lần ${attempt.attemptNumber}`
          return <text key={`${attempt.quizId}:${attempt.attemptId}`} x={x(index)} y="232" textAnchor="middle" fontSize="11" fill="currentColor">{label}</text>
        })}
      </svg>
    </div>
  </div>
}
