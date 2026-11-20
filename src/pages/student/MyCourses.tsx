import { useMemo, useState } from 'react'
import MascotState from '../../components/common/MascotState'
import MyCourseCard from '../../components/student/course/MyCourseCard'
import SuggestedCourses from '../../components/student/course/SuggestedCourses'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Button from '../../components/ui/Button'
import { ArrowRight, BookOpen, BookOpenCheck, FileText, Sparkles } from '../../components/console/icons'
import Skeleton from '../../components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { usePageResource } from '../../hooks/usePageResource'
import { getMyCourses } from '../../services/courseService'
import type { MyCourseEnrollment } from '../../services/courseService'
import { matchesSearch } from '../../lib/search'
import styles from './MyCourses.module.css'

interface MyCoursesProps {
  onOpenCourse: (course: MyCourseEnrollment['course']) => void
  onBrowseCourses: () => void
  onOpenSuggestedCourse: (course: MyCourseEnrollment['course']) => void
}

type CourseTab = 'main' | 'support' | 'suggested'

const courseGrid = styles.courseGrid

function MyCourses({ onOpenCourse, onBrowseCourses, onOpenSuggestedCourse }: MyCoursesProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<CourseTab>('main')
  const {
    data: response,
    status,
    errorMessage,
    reload,
  } = usePageResource(() => getMyCourses(), [], { forbidden: false, notFound: false })
  const enrollments = useMemo<MyCourseEnrollment[]>(() => response?.data || [], [response])

  const isMain = tab === 'main'
  // A SECTION bought on its own is a supplementary course; the entries that open a whole roadmap
  // are the main ones.
  const tabEnrollments = useMemo(
    () =>
      enrollments.filter((enrollment) =>
        isMain
          ? enrollment.course.courseType !== 'SECTION'
          : enrollment.course.courseType === 'SECTION'
      ),
    [enrollments, isMain]
  )

  const visibleEnrollments = useMemo(() => {
    return tabEnrollments.filter((enrollment) => matchesSearch(query, enrollment.course.title))
  }, [tabEnrollments, query])

  return (
    <StudentPageContainer width="fluid">
      <div className={styles.banner}>
        <div className={styles.decoration} aria-hidden="true">
          <BookOpen size={58} />
          <FileText size={50} />
          <BookOpenCheck size={60} />
        </div>
        <StudentPageHeader
          className={styles.heading}
          title="Khóa học của tôi"
          description="Quản lý và tiếp tục học các khóa học ĐGNL bạn đã đăng ký."
        />

        <div className={styles.toolbar}>
          <Tabs className={styles.tabGroup} value={tab} onValueChange={(value) => setTab(value as CourseTab)}>
            <TabsList aria-label="Loại khóa học" className={styles.tabs}>
              <TabsTrigger value="main"><BookOpen size={20} />Khóa học chính</TabsTrigger>
              <TabsTrigger value="support"><BookOpenCheck size={20} />Khóa học bổ trợ</TabsTrigger>
              <TabsTrigger value="suggested"><Sparkles size={20} />Khóa học đề xuất</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className={styles.actions}>
            <SearchInput
              className="max-[640px]:w-full max-[640px]:flex-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm khóa học"
            />
            <Button appearance="outline" className={styles.browseButton} onClick={onBrowseCourses}>
              Khám phá khóa học<ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>

      {tab === 'suggested' ? <SuggestedCourses compact query={query} onOpen={onOpenSuggestedCourse} /> : <section className={styles.content} aria-label={isMain ? 'Khóa học chính' : 'Khóa học bổ trợ'}>
        {status === 'loading' && (
          <div className={courseGrid}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-full rounded-2xl" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <MascotState
            title="Không thể tải khóa học của bạn"
            message={errorMessage}
            actionLabel="Thử lại"
            onAction={reload}
          />
        )}

        {status === 'ready' && tabEnrollments.length === 0 && (
          <MascotState
            imageSrc="/mascot/03.png"
            className="rounded-none border-0 bg-transparent"
            title={isMain ? 'Bạn chưa có khóa học nào' : 'Bạn chưa có khóa học bổ trợ nào'}
            message={
              isMain
                ? 'Khám phá các khóa học phù hợp để bắt đầu hành trình học tập của bạn.'
                : 'Khóa học lẻ bạn đã mua sẽ xuất hiện ở đây để học riêng phần đó.'
            }
          />
        )}

        {status === 'ready' && tabEnrollments.length > 0 && visibleEnrollments.length === 0 && (
          <MascotState
            imageSrc="/mascot/03.png"
            className="rounded-none border-0 bg-transparent"
            title="Không tìm thấy khóa học"
            message="Thử thay đổi từ khóa tìm kiếm của bạn."
          />
        )}

        {status === 'ready' && visibleEnrollments.length > 0 && (
          <div
            className={`${courseGrid}${visibleEnrollments.length > 6 ? ` ${styles.scrollable}` : ''}`}
            role="region"
            aria-label="Danh sách khóa học"
            tabIndex={visibleEnrollments.length > 6 ? 0 : undefined}
          >
            {visibleEnrollments.map((enrollment) => (
              <MyCourseCard
                compact
                key={enrollment.course.id}
                enrollment={enrollment}
                onOpen={onOpenCourse}
              />
            ))}
          </div>
        )}
      </section>}
    </StudentPageContainer>
  )
}

export default MyCourses
