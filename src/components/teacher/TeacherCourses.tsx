import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ClipboardList } from '../console/icons'
import TeacherPageHeader from './TeacherPageHeader'
import Button from '../console/button'
import Panel from '../console/panel'
import ScheduleResourceState from '../console/schedule/schedule-resource-state'
import { usePageResource } from '../../hooks/usePageResource'
import { getAdminCourse, type CourseAdmin } from '../../services/courseAdminService'
import { getQuizCourses } from '../../services/quizCourseService'
import { getContentSections } from '../../services/contentSectionService'
import CourseContentPanel from '../management/crud/course-content-panel'

const formatDate = (value?: string) => (value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '')

const courseSubtitle = (course: CourseAdmin) => [course.track, course.targetExam].filter(Boolean).join(' · ')

function CourseCard({ course, onOpen }: { course: CourseAdmin; onOpen: (course: CourseAdmin) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(course)}
      className="group flex flex-col gap-4 rounded-xl border border-card-border bg-card-background p-5 text-left transition-colors hover:bg-background-gray-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-badge-blue-background text-badge-blue-icon-color">
          <BookOpen size={20} />
        </span>
        <ArrowRight size={16} className="mt-1 text-icon-tertiary transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <h3 className="text-base font-medium text-text-primary">{course.title}</h3>
        {courseSubtitle(course) && <p className="mt-0.5 text-sm text-text-tertiary">{courseSubtitle(course)}</p>}
      </div>
      {course.startDate && (
        <span className="inline-flex items-center gap-1.5 text-sm text-text-tertiary">
          <CalendarDays size={15} />
          {formatDate(course.startDate)} – {formatDate(course.endDate)}
        </span>
      )}
    </button>
  )
}

const quickActionClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary'

function CourseDetail({ course, onBack, onOpenQuiz, onOpenAssignments }) {
  const { data, status, errorMessage, reload } = usePageResource(async () => {
    const [detail, sections] = await Promise.all([getAdminCourse(course.id), getContentSections(course.id)])
    return { ...detail, contentSections: sections }
  }, [course.id])
  const phases = data?.phases ?? []
  const sections = data?.contentSections ?? []
  const title = data?.title ?? course.name ?? course.title

  return (
    <section className="flex flex-col gap-5">
      <div>
        <Button appearance="ghost" size="sm" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Quay lại
        </Button>
      </div>
      <TeacherPageHeader
        title={title}
        description={data ? `${phases.length} giai đoạn · ${sections.length} phần nội dung` : undefined}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ScheduleResourceState skeleton="cards"
            status={status}
            errorMessage={errorMessage}
            onRetry={reload}
          >
            {status === 'ready' && (
              <CourseContentPanel
                courseId={course.id}
                sections={sections}
                readOnly
                title="Nội dung khóa học"
                chapterAction={(chapter) => (
                  <Button size="sm" appearance="ghost" onClick={() => onOpenAssignments(course, chapter)}>
                    <ClipboardList size={14} />
                    Giao bài tập
                  </Button>
                )}
              />
            )}
          </ScheduleResourceState>
        </div>

        <aside className="flex flex-col gap-5">
          {status === 'ready' && <Panel title="Thao tác nhanh">
            <div className="-mx-2 flex flex-col">
              <button type="button" className={quickActionClass} onClick={() => onOpenAssignments(course)}>
                <ClipboardList size={17} className="text-icon-tertiary" />
                Bài tập
              </button>
              <button type="button" className={quickActionClass} onClick={() => onOpenQuiz(course)}>
                <ClipboardList size={17} className="text-icon-tertiary" />
                Bài kiểm tra
              </button>
            </div>
          </Panel>}
        </aside>
      </div>
    </section>
  )
}

function TeacherCourses({ selectedCourse, onOpenCourse, onBack, onOpenQuiz, onOpenAssignments }) {
  const { data, status, errorMessage, reload } = usePageResource(async () => {
    return getQuizCourses()
  }, [])
  if (selectedCourse)
    return <CourseDetail course={selectedCourse} onBack={onBack} onOpenQuiz={onOpenQuiz} onOpenAssignments={onOpenAssignments} />
  const courses = data ?? []
  return (
    <section className="flex flex-col gap-5">
      <TeacherPageHeader title="Lớp học" />
      <ScheduleResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        empty={status === 'ready' && courses.length === 0}
        emptyMessage="Chưa có khóa học nào."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
          ))}
        </div>
      </ScheduleResourceState>
    </section>
  )
}

export default TeacherCourses
