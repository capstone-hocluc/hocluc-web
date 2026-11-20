import { ArrowRight } from '../../console/icons'
import MyCourseCard from '../course/MyCourseCard'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Notice from '../../ui/Notice'
import MascotState from '../../common/MascotState'
import { studentRoutes } from '../../../lib/studentRoutes'
import type { LearningProfileCourse } from '../../../services/learningProfileService'

export type ProfileNavigate = (path: string, studyCourseId?: string) => void

export function CourseProgressCard({ item, onNavigate, onRetry }: {
  item: LearningProfileCourse; onNavigate: ProfileNavigate; onRetry: () => void
}) {
  const { course } = item.enrollment
  const data = item.study
  return <article className="flex w-full min-w-0 flex-col gap-3">
    <MyCourseCard compact layout="horizontal" enrollment={data ? { ...item.enrollment, progressPercentage: data.progressPercentage } : item.enrollment}
      progressAvailable={Boolean(data) || item.enrollment.progressPercentage != null}
      progressDetail={data ? `${data.completedLessons}/${data.totalLessons} bài hoàn thành` : undefined}
      actionLabel={data?.continueLessonId ? 'Tiếp tục học' : 'Vào khóa học'}
      onOpen={() => onNavigate(data?.continueLessonId
        ? studentRoutes.lesson(data.continueSectionCourseId ?? course.id, data.continueLessonId)
        : studentRoutes.courseStudy(course.id), course.id)} />
    {!data && <Notice tone="danger"><span>Không thể tải tiến độ khóa học này</span>
      <span className="w-full font-normal">{item.error}</span><Button size="sm" appearance="outline" onClick={onRetry}>Thử lại</Button></Notice>}
  </article>
}

export function LearningCourseList({ courses, onNavigate, onRetry, title, onViewAll }: {
  courses: LearningProfileCourse[]; onNavigate: ProfileNavigate; onRetry: () => void
  title?: string; onViewAll?: () => void
}) {
  return <section aria-label="Danh sách tiến độ khóa học" className="w-full space-y-3">
    {(title || onViewAll) && <div className="flex flex-wrap items-center justify-between gap-2">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
      {onViewAll && <Button appearance="ghost" onClick={onViewAll}>Xem tất cả<ArrowRight size={16} /></Button>}
      </div>
    </div>}
    <div role={courses.length > 2 ? 'region' : undefined} aria-label={courses.length > 2 ? 'Cuộn xem các khóa học' : undefined} tabIndex={courses.length > 2 ? 0 : undefined}
      className={`grid grid-cols-1 items-start gap-3 rounded-3xl p-1 ${courses.length > 2 ? 'max-h-80 overflow-y-auto overscroll-y-contain pr-3 [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-focus-ring' : ''}`}>
      {courses.map((item) => <CourseProgressCard key={item.enrollment.course.id} item={item} onNavigate={onNavigate} onRetry={onRetry} />)}
    </div>
  </section>
}

export function CourseDistribution({ courses }: { courses: LearningProfileCourse[] }) {
  const values = courses.map(({ study, enrollment }) => study?.progressPercentage ?? enrollment.progressPercentage)
  const states = [
    { label: 'Chưa bắt đầu', count: values.filter((value) => value === 0).length, color: 'var(--color-line-soft)' },
    { label: 'Đang học', count: values.filter((value) => value != null && value > 0 && value < 100).length, color: 'var(--color-primary)' },
    { label: 'Hoàn thành', count: values.filter((value) => value != null && value >= 100).length, color: 'var(--color-success)' },
  ]
  const unknown = values.filter((value) => value == null).length
  if (unknown) states.push({ label: 'Chưa có dữ liệu', count: unknown, color: 'var(--color-line)' })
  let edge = 0
  const segments = states.map(({ count, color }) => {
    const start = edge
    edge += count / courses.length * 360
    return `${color} ${start}deg ${edge}deg`
  })
  return <section aria-label="Phân bố tiến độ khóa học" className="min-w-0">
    <div className="pt-1"><Card className="rounded-2xl p-4">
    <p className="text-xs text-text-body">Trạng thái các khóa đã đăng ký.</p>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
      <div role="img" aria-label={`Phân bố ${courses.length} khóa học`} className="grid size-28 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${segments.join(',')})` }}>
        <div className="flex size-22 flex-col items-center justify-center rounded-full bg-surface"><strong className="text-2xl text-primary-text">{courses.length}</strong><span className="text-xs text-text-secondary">khóa học</span></div>
      </div>
      <ul className="grid min-w-36 flex-1 gap-2 text-sm">{states.map(({ label, count, color }) => <li key={label} className="flex items-center gap-2 rounded-xl bg-surface-hover px-3 py-2">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span><strong className="ml-auto">{count}</strong>
      </li>)}</ul>
    </div>
  </Card></div>
  </section>
}

export function CourseMockExamResults({ courses, onNavigate }: { courses: LearningProfileCourse[]; onNavigate: ProfileNavigate }) {
  const exams = new Map(courses.flatMap(({ study, enrollment }) => (study?.exams ?? []).map((exam) => [exam.id, { exam, course: enrollment.course }] as const)))
  const incomplete = courses.some(({ study }) => !study || !Array.isArray(study.exams))
  return <Card as="section" className="min-w-0 space-y-3 rounded-3xl p-4">
    <div><CardTitle className="mb-1 text-lg">Thi thử theo khóa học</CardTitle><p className="text-xs text-text-body">Điểm cao nhất và lượt đã dùng của các đề thi thử trong khóa đã đăng ký.</p></div>
    {incomplete && <Notice tone="warning">Chưa tải đủ danh sách thi thử của một số khóa. Bạn có thể vào khóa học để xem bài thi.</Notice>}
    {exams.size ? <ul aria-label="Danh sách thi thử theo khóa" tabIndex={exams.size > 3 ? 0 : undefined} className="grid max-h-[304px] gap-2 overflow-y-auto p-1">{[...exams.values()].map(({ exam, course }) => <li key={exam.id} className="flex min-h-24 flex-wrap items-center justify-between gap-2 rounded-2xl border border-line-card p-3">
      <div className="min-w-0"><h3 className="text-sm font-semibold break-words">{exam.title}</h3><p className="mt-1 text-xs break-words text-text-body">{course.title}</p>
        <p className="mt-1 text-sm font-semibold text-primary-text">{exam.bestPercentage == null ? 'Chưa có kết quả đã chấm' : `Điểm cao nhất: ${exam.bestPercentage}%`}</p>
        <p className="mt-1 text-xs text-text-secondary">Lượt đã dùng: {exam.attemptsUsed}/{exam.maxAttempts}{exam.locked ? ' · Chưa thể bắt đầu lượt mới' : ''}</p>
      </div>
      <Button size="sm" shape="pill" appearance="outline" className="border-primary-text text-primary-text not-disabled:hover:bg-primary/6" onClick={() => onNavigate(studentRoutes.quiz(exam.id), course.id)}>Xem bài thi</Button>
    </li>)}</ul> : <MascotState imageSrc="/mascot/03.png" className="min-h-0 border-0 p-3 [&>img]:size-16" title={incomplete ? 'Chưa có dữ liệu thi thử để hiển thị từ các khóa đã tải.' : 'Các khóa đã đăng ký chưa có đề thi thử.'} />}
  </Card>
}
