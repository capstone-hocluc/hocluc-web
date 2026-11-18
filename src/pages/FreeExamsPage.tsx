import { useMemo, useState } from 'react'
import { PublicFooter, PublicHeader } from '../components/landing-page/PublicChrome'
import AppLink from '../components/landing-page/AppLink'
import MascotState from '../components/common/MascotState'
import ResourceState from '../components/student/common/ResourceState'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import { ArrowLeft, ArrowRight, FileText } from '../components/console/icons'
import { usePageResource } from '../hooks/usePageResource'
import { getFreeExams, competencyPath } from '../services/freeExamService'
import { studentRoutes } from '../lib/studentRoutes'
import { getAssessmentLockMessage } from '../lib/quizLock'
import { formatDateTime } from '../lib/courseFormat'
import styles from './FreeExamsPage.module.css'

export default function FreeExamsPage() {
  const resource = usePageResource(() => getFreeExams(), [])
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState(() => new URLSearchParams(window.location.search).get('courseId') ?? '')
  const [page, setPage] = useState(1)
  const courses = useMemo(() => [...new Map((resource.data ?? []).filter(exam => exam.courseId).map(exam => [exam.courseId!, exam.courseTitle ?? 'Khóa học'])).entries()], [resource.data])
  const exams = (resource.data ?? []).filter(exam => (!course || exam.courseId === course) && exam.title.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))
  const pages = Math.max(1, Math.ceil(exams.length / 6))
  const current = Math.min(page, pages)
  return <><PublicHeader /><main className={styles.page}>
    <header className={styles.heading}><span>THỬ SỨC · KHÁM PHÁ NĂNG LỰC</span><h1>Đề thi thử miễn phí</h1><p>Chọn đề để thử sức. Đăng nhập hoặc tạo tài khoản miễn phí trước khi làm bài.</p><p className={styles.note}>Đề mới nhất được hiển thị trước. Không cần mua khóa học để thi.</p></header>
    <section className={styles.catalog} aria-label="Danh sách đề thi thử miễn phí">
      <div className={styles.filters}>
        <label>Tìm kiếm đề thi<input type="search" value={search} placeholder="Nhập tên đề thi…" onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
        <label>Khóa học<select value={course} onChange={event => {
          const id = event.target.value
          setCourse(id); setPage(1)
          const query = new URLSearchParams(window.location.search)
          if (id) query.set('courseId', id); else query.delete('courseId')
          window.history.replaceState(window.history.state, '', `/free-exams${query.size ? `?${query}` : ''}`)
        }}><option value="">Tất cả khóa học</option>{course && !courses.some(([id]) => id === course) && <option value={course}>Khóa đang chọn</option>}{courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
      </div>
      <ResourceState imageSrc="/mascot/03.png" status={resource.status} errorMessage={resource.errorMessage} onRetry={resource.reload} loading={<Skeleton className="h-64" />} error={{ title: 'Chưa tải được đề thi miễn phí' }} />
      {resource.status === 'ready' && (exams.length ? <>
        <p className={styles.count}>{exams.length} đề thi · Mới nhất trước</p>
        <div className={styles.grid}>{exams.slice((current - 1) * 6, current * 6).map(exam => {
          const started = Boolean(exam.inProgressAttemptId)
          const completed = exam.bestPercentage != null
          return <article key={exam.id} className={styles.card} data-completed={completed || undefined}>
            <div className={styles.cardTop}><span className={styles.icon}><FileText size={24} /></span><span className={styles.badge}>{completed ? 'Đã làm' : 'Miễn phí'}</span></div>
            <h2>{exam.title}</h2>
            {exam.courseTitle && <p className={styles.course}>{exam.courseTitle}</p>}
            {exam.description && <p className={styles.description}>{exam.description}</p>}
            <p className={styles.meta}>{exam.questionCount} câu hỏi · {exam.durationMinutes ? `${exam.durationMinutes} phút` : 'Không giới hạn thời gian'}</p>
            {exam.availableFrom && <p className={styles.meta}>Mở: {formatDateTime(exam.availableFrom)}</p>}
            {exam.availableUntil && <p className={styles.meta}>Đóng: {formatDateTime(exam.availableUntil)}</p>}
            {exam.attemptsUsed != null && <p className={styles.meta}>Đã dùng {exam.attemptsUsed}/{exam.maxAttempts} lượt thi{completed ? ` · Cao nhất ${exam.bestPercentage}%` : ''}</p>}
            {exam.locked && <p className={styles.lock} role="status">{getAssessmentLockMessage(exam.lockReason)}</p>}
            <div className={styles.actions}><Button asChild size="sm"><AppLink href={`${studentRoutes.quiz(exam.id)}?from=free-exams`}>{started ? 'Tiếp tục làm bài' : exam.locked || completed ? 'Xem đề và kết quả' : 'Làm bài miễn phí'}<ArrowRight size={16} /></AppLink></Button>
            {completed && exam.courseId && <AppLink href={competencyPath(exam.courseId)} className={styles.analysis}>Xem đánh giá năng lực</AppLink>}</div>
          </article>
        })}</div>
        {pages > 1 && <nav aria-label="Phân trang đề thi" className={styles.pagination}><Button appearance="outline" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Trang trước"><ArrowLeft size={16} /></Button><span>Trang {current}/{pages}</span><Button appearance="outline" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Trang sau"><ArrowRight size={16} /></Button></nav>}
      </> : <MascotState imageSrc="/mascot/03.png" title="Chưa có đề thi phù hợp" message="Thử đổi từ khóa hoặc chọn khóa học khác." />)}
    </section>
  </main><PublicFooter /></>
}
