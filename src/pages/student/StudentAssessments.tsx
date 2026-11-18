import { useState } from 'react'
import { BookOpen, BookOpenCheck, FileText, ChevronLeft, ChevronRight } from '../../components/console/icons'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import ResourceState from '../../components/student/common/ResourceState'
import CourseExamCard from '../../components/student/course/CourseExamCard'
import { hasCompletedExam } from '../../components/student/course/courseExamState'
import examStyles from '../../components/student/course/CourseExams.module.css'
import MascotState from '../../components/common/MascotState'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import Skeleton from '../../components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs'
import { usePageResource } from '../../hooks/usePageResource'
import { getStudentCourseAssessments, getStudentFreeAssessments } from '../../services/studentAssessmentService'
import { quizTypeLabel } from '../../lib/quiz-types'
import styles from './StudentAssessments.module.css'

type Source = 'course' | 'free'
type StatusFilter = 'all' | 'todo' | 'done'
const types = ['ALL', 'QUICK', 'LESSON', 'CHAPTER', 'EXAM']

export default function StudentAssessments({ onOpenQuiz }: { onOpenQuiz: (quizId: string) => void }) {
  const [source, setSource] = useState<Source>(() => new URLSearchParams(window.location.search).get('tab') === 'free' ? 'free' : 'course')
  const changeSource = (value: string) => {
    if (value !== 'course' && value !== 'free') return
    window.history.replaceState(window.history.state, '', `/student/assessments?tab=${value}`)
    setSource(value)
  }
  return <StudentPageContainer width="fluid" className="pb-8">
    <Tabs value={source} onValueChange={changeSource}>
      <div className={styles.banner}>
        <div className={styles.decoration} aria-hidden="true">
          <BookOpen size={58} /><FileText size={50} /><BookOpenCheck size={60} />
        </div>
        <StudentPageHeader title="Chào mừng bạn đến với Luyện đề" description="Luyện thi với đề thi thử miễn phí và bài kiểm tra theo bài học, chương trong khóa học." className={styles.heading} />
        <TabsList className={styles.sources} aria-label="Nguồn bài kiểm tra">
          <TabsTrigger value="course"><BookOpen size={18} />Trong khóa học</TabsTrigger>
          <TabsTrigger value="free"><FileText size={18} />Miễn phí</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value={source} className={styles.panel}>
        <AssessmentCatalog key={source} source={source} onOpenQuiz={onOpenQuiz} onOpenFree={() => changeSource('free')} />
      </TabsContent>
    </Tabs>
  </StudentPageContainer>
}

function AssessmentCatalog({ source, onOpenQuiz, onOpenFree }: { source: Source; onOpenQuiz: (id: string) => void; onOpenFree: () => void }) {
  const resource = usePageResource(source === 'free' ? getStudentFreeAssessments : getStudentCourseAssessments, [source])
  const [filters, setFilters] = useState(() => {
    const query = new URLSearchParams(window.location.search)
    const status = query.get('status')
    const type = query.get('type')
    const page = Number(query.get('page'))
    return { course: query.get('course') ?? '', search: query.get('q') ?? '', type: type && types.includes(type) ? type : 'ALL',
      status: (status === 'done' || status === 'todo' ? status : 'all') as StatusFilter, page: Number.isSafeInteger(page) && page > 0 ? page : 1 }
  })
  const update = (patch: Partial<typeof filters>) => {
    const next = { ...filters, page: 1, ...patch }
    setFilters(next)
    const query = new URLSearchParams({ tab: source })
    if (next.course) query.set('course', next.course)
    if (next.search) query.set('q', next.search)
    if (next.type !== 'ALL' && source === 'course') query.set('type', next.type)
    if (next.status !== 'all') query.set('status', next.status)
    if (next.page > 1) query.set('page', String(next.page))
    window.history.replaceState(window.history.state, '', `/student/assessments?${query}`)
  }
  const data = resource.data
  const scoped = (data?.items ?? []).filter(item => (!filters.course || item.courseIds.includes(filters.course))
    && (source === 'free' || filters.type === 'ALL' || item.type === filters.type)
    && item.exam.title.toLocaleLowerCase('vi').includes(filters.search.trim().toLocaleLowerCase('vi')))
  const done = scoped.filter(item => hasCompletedExam(item.exam)).length
  const filtered = scoped.filter(item => filters.status === 'all' || (filters.status === 'done' ? hasCompletedExam(item.exam) : !hasCompletedExam(item.exam)))
  const pages = Math.max(1, Math.ceil(filtered.length / 6))
  const page = Math.min(filters.page, pages)
  const failures = data?.failures.filter(item => !filters.course || item.courseId === filters.course) ?? []

  return <>
    {source === 'free' && <p className="mb-4 text-sm text-text-secondary">Đề thi miễn phí, mới nhất trước. Không cần mua khóa học để làm bài.</p>}
    <ResourceState imageSrc="/mascot/03.png" status={resource.status} errorMessage={resource.errorMessage} onRetry={resource.reload}
      loading={<div className={examStyles.grid}><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>}
      forbidden={{ title: 'Bạn chưa có quyền xem danh sách bài kiểm tra' }} error={{ title: 'Không thể tải danh sách bài kiểm tra' }} />
    {resource.status === 'ready' && data && <>
      {failures.length > 0 && <Notice tone="warning" className="mb-4"><div className="min-w-0 flex-1"><p>Chưa tải được bài kiểm tra của một số khóa học.</p><ul className="mt-1 text-xs font-normal">{failures.map(item => <li key={`${item.courseId}:${item.title}`}>{item.title}: {item.message}</li>)}</ul></div><Button size="sm" appearance="outline" onClick={resource.reload}>Thử lại các khóa học</Button></Notice>}
      <div className={styles.searchFilters}>
        <label>Tìm kiếm bài kiểm tra<input type="search" value={filters.search} placeholder="Nhập tên đề…" onChange={event => update({ search: event.target.value })} /></label>
        <label>Khóa học<select value={filters.course} onChange={event => update({ course: event.target.value })}><option value="">Tất cả khóa học</option>
          {filters.course && !data.courses.some(course => course.id === filters.course) && <option value={filters.course}>Khóa đang chọn</option>}
          {data.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        {source === 'course' && <label>Loại bài kiểm tra<select value={filters.type} onChange={event => update({ type: event.target.value })}>{types.map(type => <option key={type} value={type}>{type === 'ALL' ? 'Tất cả loại bài' : quizTypeLabel(type)}</option>)}</select></label>}
      </div>
      <div className={examStyles.toolbar}>
        <Tabs value={filters.status} onValueChange={value => update({ status: value as StatusFilter })}>
          <TabsList data-pill-tabs="" className={examStyles.filters} aria-label="Lọc bài kiểm tra">
            <TabsTrigger value="all">Tất cả <span>{scoped.length}</span></TabsTrigger>
            <TabsTrigger value="todo">Chưa làm <span>{scoped.length - done}</span></TabsTrigger>
            <TabsTrigger value="done">Đã làm <span>{done}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-text-secondary" aria-live="polite">{filtered.length} bài kiểm tra</p>
      </div>
      {filtered.length ? <div role="list" aria-label="Danh sách bài kiểm tra" className={examStyles.grid}>
        {filtered.slice((page - 1) * 6, page * 6).map(item => <CourseExamCard key={item.exam.id} exam={item.exam} onOpenQuiz={onOpenQuiz}
          contextLabel={[source === 'free' ? 'Miễn phí' : quizTypeLabel(item.type), ...item.courseTitles].join(' · ')} />)}
      </div> : <MascotState imageSrc="/mascot/03.png" title={data.items.length ? 'Không có bài kiểm tra phù hợp' : source === 'free' ? 'Chưa có đề thi miễn phí' : 'Chưa có bài kiểm tra trong khóa học'}
        message={source === 'course' ? 'Các đề thi, bài kiểm tra theo bài và chương của khóa đã đăng ký sẽ xuất hiện tại đây.' : 'Bạn có thể quay lại sau để xem các đề mới.'}
        actionLabel={source === 'course' ? 'Xem đề miễn phí' : undefined} onAction={source === 'course' ? onOpenFree : undefined} />}
      {pages > 1 && <nav className={examStyles.pagination} aria-label="Phân trang bài kiểm tra"><span>Trang {page}/{pages}</span>
        <Button appearance="outline" size="icon" aria-label="Trang bài kiểm tra trước" disabled={page === 1} onClick={() => update({ page: page - 1 })}><ChevronLeft size={18} /></Button>
        <Button appearance="outline" size="icon" aria-label="Trang bài kiểm tra sau" disabled={page === pages} onClick={() => update({ page: page + 1 })}><ChevronRight size={18} /></Button>
      </nav>}
    </>}
  </>
}
