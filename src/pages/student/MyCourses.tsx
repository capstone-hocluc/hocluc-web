import { useMemo, useState } from 'react'
import MascotState from '../../components/common/MascotState'
import MyCourseCard from '../../components/student/course/MyCourseCard'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Skeleton from '../../components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { usePageResource } from '../../hooks/usePageResource'
import { getMyCourses } from '../../services/courseService'
import type { MyCourseEnrollment } from '../../services/courseService'
import { matchesSearch } from '../../lib/search'

interface MyCoursesProps {
  onOpenCourse: (course: MyCourseEnrollment['course']) => void
  onBrowseCourses: () => void
}

type CourseTab = 'main' | 'support'

const courseGrid =
  'grid grid-cols-3 items-stretch gap-5 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1'

function MyCourses({ onOpenCourse, onBrowseCourses }: MyCoursesProps) {
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
    <StudentPageContainer>
      <StudentPageHeader
        title="Khóa học của tôi"
        description="Quản lý và tiếp tục học các khóa học ĐGNL bạn đã đăng ký."
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 max-[640px]:flex-col max-[640px]:items-stretch">
        <Tabs value={tab} onValueChange={(value) => setTab(value as CourseTab)}>
          <TabsList aria-label="Loại khóa học">
            <TabsTrigger value="main">Khóa học chính</TabsTrigger>
            <TabsTrigger value="support">Khóa học bổ trợ</TabsTrigger>
          </TabsList>
        </Tabs>

        <SearchInput
          className="ml-auto max-[640px]:ml-0 max-[640px]:w-full max-[640px]:flex-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm kiếm khóa học"
        />
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl font-bold tracking-[-0.3px] text-text-heading">
            {isMain ? 'Khóa học chính' : 'Khóa học bổ trợ'}
          </h2>
          {status === 'ready' && (
            <span className="rounded-full bg-primary-soft px-3 py-0.5 text-sm font-semibold text-primary-text">
              {visibleEnrollments.length} khóa học
            </span>
          )}
        </div>

        {status === 'loading' && (
          <div className={courseGrid}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
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
            title={isMain ? 'Bạn chưa có khóa học nào' : 'Bạn chưa có khóa học bổ trợ nào'}
            message={
              isMain
                ? 'Khám phá các khóa học phù hợp để bắt đầu hành trình học tập của bạn.'
                : 'Khóa học lẻ bạn đã mua sẽ xuất hiện ở đây để học riêng phần đó.'
            }
            actionLabel={isMain ? 'Khám phá khóa học' : undefined}
            onAction={isMain ? onBrowseCourses : undefined}
          />
        )}

        {status === 'ready' && tabEnrollments.length > 0 && visibleEnrollments.length === 0 && (
          <MascotState
            title="Không tìm thấy khóa học"
            message="Thử thay đổi từ khóa tìm kiếm của bạn."
          />
        )}

        {status === 'ready' && visibleEnrollments.length > 0 && (
          <div className={courseGrid}>
            {visibleEnrollments.map((enrollment) => (
              <MyCourseCard
                key={enrollment.course.id}
                enrollment={enrollment}
                onOpen={onOpenCourse}
              />
            ))}
          </div>
        )}
      </section>
    </StudentPageContainer>
  )
}

export default MyCourses
