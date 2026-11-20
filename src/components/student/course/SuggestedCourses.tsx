import { useState } from 'react'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Sparkles } from '../../console/icons'
import MascotState from '../../common/MascotState'
import Button from '../../ui/Button'
import Skeleton from '../../ui/Skeleton'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useLearningProfileDialog } from '../../../hooks/useLearningProfileDialog'
import { usePageResource } from '../../../hooks/usePageResource'
import { getSuggestedCourses, type Course } from '../../../services/courseService'
import { formatCoursePrice, formatDate, formatExamLabel, formatCourseTrack } from '../../../lib/courseFormat'
import { matchesSearch } from '../../../lib/search'
import styles from './SuggestedCourses.module.css'

export default function SuggestedCourses({ onOpen, query = '', compact = false }: { onOpen: (course: Course) => void; query?: string; compact?: boolean }) {
  const { profile, status: profileStatus, loadCurrentUser } = useCurrentUser()
  const editGoals = useLearningProfileDialog()
  const targetExam = profile?.studentProfile?.targetExam
  const targetYear = profile?.studentProfile?.targetExamYear
  const resource = usePageResource(async () => targetExam ? (await getSuggestedCourses()).data ?? [] : [], [targetExam, targetYear], { forbidden: false, notFound: false })
  const [page, setPage] = useState(1)
  const courses = (resource.data ?? []).filter(course => matchesSearch(query, course.title))
  const pages = Math.max(1, Math.ceil(courses.length / 6))
  const current = Math.min(page, pages)
  return <section className={`${styles.section}${compact ? ` ${styles.compact}` : ''}`} aria-label="Khóa học đề xuất cho bạn">
    <div className={styles.heading}><p>Đề xuất khóa học phù hợp với kỳ thi mục tiêu và năm thi trong hồ sơ của bạn.</p>
      {targetExam && <span className={styles.goal}>{formatExamLabel(targetExam)}{targetYear ? ` · ${targetYear}` : ''}</span>}
    </div>
    {profileStatus === 'error' ? <MascotState imageSrc="/mascot/03.png" title="Chưa tải được mục tiêu học tập" actionLabel="Thử lại" onAction={() => void loadCurrentUser().catch(() => {})} />
      : !profile || resource.status === 'loading' ? <div className={styles.grid}>{[0, 1, 2].map(index => <Skeleton key={index} className="h-80 rounded-3xl" />)}</div>
      : !targetExam ? <MascotState imageSrc="/mascot/03.png" title="Thêm mục tiêu để nhận đề xuất" message="Chọn kỳ thi và năm thi để tìm khóa học phù hợp với bạn." actionLabel="Cập nhật mục tiêu" onAction={editGoals} />
      : resource.status === 'error' ? <MascotState imageSrc="/mascot/03.png" title="Chưa tải được khóa học đề xuất" message={resource.errorMessage} actionLabel="Thử lại" onAction={resource.reload} />
      : courses.length === 0 ? <MascotState imageSrc="/mascot/03.png" title={query ? 'Không tìm thấy khóa học' : 'Chưa có khóa học phù hợp'} message={query ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Bạn có thể cập nhật mục tiêu hoặc quay lại khi có khóa học mới.'} />
      : <>
        <div className={styles.grid}>{courses.slice((current - 1) * 6, current * 6).map(course => <button type="button" key={course.id} className={styles.card} onClick={() => onOpen(course)}>
          <div className={styles.cover}>{course.imageUrl ? <img src={course.imageUrl} alt="" loading="lazy" /> : <BookOpen size={48} />}{course.recommended && <span className={styles.recommended}><Sparkles size={13} />Phù hợp nhất</span>}</div>
          <div className={styles.body}><div className={styles.tags}><span>{formatCourseTrack(course.track) || formatExamLabel(course.targetExam) || 'Khóa học'}</span>{course.purchased && <span>Đã đăng ký</span>}</div><h3>{course.title}</h3><p className={styles.description}>{course.description || 'Khám phá nội dung và lộ trình học của khóa học.'}</p>{course.startDate && <p className={styles.date}>Khai giảng: {formatDate(course.startDate)}</p>}
            <div className={styles.footer}><strong>{formatCoursePrice(course.price)}</strong><span>{course.purchased ? 'Vào học' : 'Xem khóa học'}<ArrowRight size={16} /></span></div>
          </div>
        </button>)}</div>
        {pages > 1 && <nav className={styles.pagination} aria-label="Phân trang khóa học đề xuất"><span>Trang {current}/{pages}</span><Button appearance="outline" size="sm" aria-label="Trang đề xuất trước" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={18} /></Button><Button appearance="outline" size="sm" aria-label="Trang đề xuất tiếp theo" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={18} /></Button></nav>}
      </>}
  </section>
}
