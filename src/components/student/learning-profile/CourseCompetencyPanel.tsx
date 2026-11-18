import { ArrowRight, CheckCircle2, Target } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import Progress from '../../ui/Progress'
import StatusBadge from '../../ui/StatusBadge'
import Skeleton from '../../ui/Skeleton'
import ResourceState from '../common/ResourceState'
import MascotState from '../../common/MascotState'
import type { useCourseCompetency } from '../../../hooks/useCourseCompetency'
import { freeExamsPath } from '../../../services/freeExamService'
import { studentRoutes } from '../../../lib/studentRoutes'
import { formatDateTime } from '../../../lib/courseFormat'
import type { ProfileNavigate } from './LearningCoursePanel'

const levels: Record<string, string> = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung bình', ADVANCED: 'Nâng cao' }

export default function CourseCompetencyPanel({ competency, onNavigate, compact = false }: {
  competency: ReturnType<typeof useCourseCompetency>; onNavigate: ProfileNavigate; compact?: boolean
}) {
  const { courses, courseId, data, status, errorMessage, reload, changeCourse } = competency
  const options = courses.data ?? []
  return <Card as="section" aria-label="Đánh giá năng lực theo khóa" className="min-w-0 space-y-4 rounded-3xl p-5 max-[640px]:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">Đánh giá năng lực theo khóa</h2><p className="mt-1 max-w-3xl text-sm text-text-secondary">Tổng hợp từ lần thi chính thức đầu tiên đã chấm của mỗi đề miễn phí thuộc khóa. Thi lại và luyện tập không cộng vào phân tích.</p></div>
      <Button size="sm" appearance="outline" className="border-primary-text text-primary-text" onClick={() => onNavigate(freeExamsPath(courseId || undefined))}>Làm đề miễn phí<ArrowRight size={16} /></Button>
    </div>
    <ResourceState status={courses.status} errorMessage={courses.errorMessage} onRetry={courses.reload} imageSrc="/mascot/03.png" loading={<Skeleton className="h-12" />} error={{ title: 'Không thể tải danh sách khóa để đánh giá' }} />
    {(options.length > 0 || courseId) && <label className="grid max-w-xl gap-2 text-sm font-semibold">Khóa dùng để đánh giá
      <select className="min-h-11 min-w-0 rounded-xl border border-line-card bg-surface px-3 text-text-heading" value={courseId} onChange={event => changeCourse(event.target.value)}>
        {courseId && !options.some(course => course.id === courseId) && <option value={courseId}>{data?.courseTitle ?? 'Khóa đang chọn'}</option>}
        {options.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
    </label>}
    {courseId && <ResourceState status={status} errorMessage={errorMessage} onRetry={reload} imageSrc="/mascot/03.png" loading={<Skeleton className="h-48" />} forbidden={{ title: 'Bạn chưa có quyền xem đánh giá này' }} notFound={{ title: 'Không tìm thấy khóa dùng để đánh giá' }} error={{ title: 'Không thể tải đánh giá năng lực' }} />}
    {courses.status === 'ready' && !courseId && <MascotState imageSrc="/mascot/03.png" title="Chưa có khóa để đánh giá" message="Bạn vẫn có thể làm các đề thi thử miễn phí." />}
    {status === 'ready' && data && <>
      {!data.examCount ? <MascotState imageSrc="/mascot/03.png" title="Bạn chưa có kết quả đánh giá cho khóa này" message="Hoàn thành một đề thi chính thức thuộc khóa để bắt đầu phân tích năng lực." /> : <>
        <div className="grid gap-3 rounded-2xl bg-surface-brand p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Đề được tính" value={`${data.examCount} đề`} />
          <Metric label="Tỷ lệ điểm tổng hợp" value={data.overallPercentage == null ? 'Chưa có dữ liệu' : `${data.overallPercentage}%`} />
          <Metric label="Số câu đúng" value={`${data.correctCount}/${data.totalQuestions}`} />
          <Metric label="Tổng điểm" value={data.score == null || data.maxScore == null ? 'Chưa có dữ liệu' : `${data.score}/${data.maxScore}`} />
        </div>
        {data.level && <StatusBadge tone="primary">{levels[data.level] ?? 'Chưa phân loại'}</StatusBadge>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-xl border border-line-card p-3"><CheckCircle2 size={18} className="shrink-0 text-success" /><div><p className="text-xs text-text-secondary">Lĩnh vực mạnh nhất</p><strong className="text-sm">{data.strongCategoryName || 'Chưa có dữ liệu'}</strong></div></div>
          <div className="flex items-start gap-2 rounded-xl border border-line-card p-3"><Target size={18} className="shrink-0 text-primary-text" /><div><p className="text-xs text-text-secondary">Lĩnh vực cần cải thiện</p><strong className="text-sm">{data.weakCategoryName || 'Chưa có dữ liệu'}</strong></div></div>
        </div>
        {!compact && <>
          <h3 className="font-semibold">Kết quả theo lĩnh vực</h3>
          {data.categories.length ? <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Kết quả theo lĩnh vực">{data.categories.map(category => <li key={category.categoryId} className="min-w-0 rounded-2xl border border-line-card p-4"><div className="flex justify-between gap-2 text-sm"><strong>{category.categoryName}</strong><span className="text-primary-text">{category.percentage}%</span></div><Progress className="my-3" value={category.percentage} aria-label={`Tỷ lệ đúng môn ${category.categoryName}`} /><p className="text-xs text-text-secondary">{category.correctCount}/{category.totalCount} câu đúng</p></li>)}</ul> : <p className="text-sm text-text-secondary">Chưa có kết quả phân loại theo lĩnh vực.</p>}
          <h3 className="font-semibold">Các lượt thi được dùng để đánh giá</h3>
          <ul className="grid max-h-80 gap-2 overflow-y-auto" aria-label="Đề được tính vào đánh giá">{data.exams.map(exam => <li key={exam.attemptId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-card p-3"><div><h4 className="text-sm font-semibold">{exam.quizTitle}</h4><p className="mt-1 text-xs text-text-secondary">{exam.submittedAt ? formatDateTime(exam.submittedAt) : 'Đã chấm'} · {exam.score}/{exam.maxScore} điểm · {exam.percentage}%</p></div><Button size="sm" appearance="outline" onClick={() => onNavigate(studentRoutes.attemptReview(exam.attemptId))}>Xem kết quả</Button></li>)}</ul>
        </>}
      </>}
      {!compact && data.pendingExams.length > 0 && <><h3 className="font-semibold">Đề chưa có kết quả thi chính thức</h3><ul className="grid max-h-72 gap-2 overflow-y-auto">{data.pendingExams.map(exam => <li key={exam.quizId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-brand p-3"><div><h4 className="text-sm font-semibold">{exam.quizTitle}</h4>{exam.durationMinutes != null && <p className="text-xs text-text-secondary">{exam.durationMinutes} phút</p>}</div><Button size="sm" appearance="outline" onClick={() => onNavigate(studentRoutes.quiz(exam.quizId))}>Xem đề thi</Button></li>)}</ul></>}
    </>}
  </Card>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-text-secondary">{label}</p><strong className="mt-1 block text-lg text-primary-text">{value}</strong></div>
}
