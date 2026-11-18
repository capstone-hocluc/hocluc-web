import { useState } from 'react'
import { getCourseExams } from '../../../services/courseService'
import { usePageResource } from '../../../hooks/usePageResource'
import MascotState from '../../common/MascotState'
import ResourceState from '../common/ResourceState'
import Card from '../../ui/Card'
import Skeleton from '../../ui/Skeleton'
import styles from './CourseStudyAppearance.module.css'
import examStyles from './CourseExams.module.css'
import CourseExamCard from './CourseExamCard'
import { hasCompletedExam } from './courseExamState'
import { Tabs, TabsList, TabsTrigger } from '../../ui/Tabs'
import Button from '../../ui/Button'
import { ChevronLeft, ChevronRight } from '../../console/icons'

const PAGE_SIZE = 6
type ExamFilter = 'all' | 'todo' | 'done'

interface CourseExamsTabProps {
  courseId: string
  onOpenQuiz: (quizId: string) => void
}

function CourseExamsTab({ courseId, onOpenQuiz }: CourseExamsTabProps) {
  const [filter, setFilter] = useState<ExamFilter>(() => {
    const value = new URLSearchParams(window.location.search).get('examFilter')
    return value === 'todo' || value === 'done' ? value : 'all'
  })
  const [page, setPage] = useState(() => {
    const value = Number(new URLSearchParams(window.location.search).get('examPage'))
    return Number.isSafeInteger(value) && value > 0 ? value : 1
  })
  const {
    data: exams,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getCourseExams(courseId), [courseId])
  const doneCount = exams?.filter(hasCompletedExam).length ?? 0
  const filtered = (exams ?? []).filter((exam) => filter === 'all' || (filter === 'done' ? hasCompletedExam(exam) : !hasCompletedExam(exam)))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visibleExams = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const updateView = (nextFilter: ExamFilter, nextPage: number) => {
    setFilter(nextFilter)
    setPage(nextPage)
    const search = new URLSearchParams(window.location.search)
    if (nextFilter === 'all') search.delete('examFilter')
    else search.set('examFilter', nextFilter)
    if (nextPage === 1) search.delete('examPage')
    else search.set('examPage', String(nextPage))
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search.size ? `?${search}` : ''}${window.location.hash}`)
  }

  return (
    <>
      <ResourceState imageSrc="/mascot/03.png"
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className={examStyles.grid} aria-label="Đang tải danh sách bài thi">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        }
        forbidden={{
          title: 'Bạn chưa có quyền xem bài thi',
          message: 'Hãy kiểm tra quyền truy cập khóa học của bạn.',
        }}
        notFound={{ title: 'Không tìm thấy danh sách bài thi của khóa học.' }}
        error={{ title: 'Không thể tải bài thi' }}
      />

      {status === 'ready' && exams && (
        <Card as="section" padding="lg" radius="xl" className="border-0 p-0 shadow-none" aria-label="Bài thi của khóa học">
          <div className={examStyles.toolbar}>
            <Tabs value={filter} onValueChange={(value) => updateView(value as ExamFilter, 1)}>
              <TabsList data-pill-tabs="" aria-label="Lọc bài thi" className={examStyles.filters}>
                <TabsTrigger value="all">Tất cả <span>{exams.length}</span></TabsTrigger>
                <TabsTrigger value="todo">Chưa làm <span>{exams.length - doneCount}</span></TabsTrigger>
                <TabsTrigger value="done">Đã làm <span>{doneCount}</span></TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-xs text-text-secondary" aria-live="polite">{filtered.length} bài thi</span>
          </div>

          {filtered.length === 0 ? (
            <MascotState imageSrc="/mascot/03.png"
              title={exams.length === 0 ? 'Khóa học chưa có bài thi' : filter === 'done' ? 'Bạn chưa hoàn thành bài thi nào' : 'Không còn bài thi chưa làm'}
              message={exams.length === 0 ? 'Khi có bài thi mới, nội dung sẽ xuất hiện tại đây.' : filter === 'done' ? 'Các đề có kết quả chính thức sẽ xuất hiện tại đây.' : 'Bạn có thể xem lại các đề trong tab Đã làm.'}
              className={styles.emptyState}
            />
          ) : (
            <div className={examStyles.grid} role="list" aria-label="Danh sách bài thi">
              {visibleExams.map((exam) => <CourseExamCard key={exam.id} exam={exam} onOpenQuiz={onOpenQuiz} />)}
            </div>
          )}
          {pages > 1 && (
            <nav className={examStyles.pagination} aria-label="Phân trang bài thi">
              <span aria-live="polite">Trang {currentPage}/{pages}</span>
              <Button appearance="outline" size="icon" aria-label="Trang bài thi trước" disabled={currentPage === 1} onClick={() => updateView(filter, currentPage - 1)}><ChevronLeft size={18} /></Button>
              <Button appearance="outline" size="icon" aria-label="Trang bài thi sau" disabled={currentPage === pages} onClick={() => updateView(filter, currentPage + 1)}><ChevronRight size={18} /></Button>
            </nav>
          )}
        </Card>
      )}
    </>
  )
}

export default CourseExamsTab
