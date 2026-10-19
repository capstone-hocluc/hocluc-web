import { ArrowLeft, ChevronRight } from '../console/icons'
import type { LessonDetail } from '../../services/lessonService'
import Button from '../ui/Button'

interface LessonBreadcrumbProps {
  lesson: Pick<LessonDetail, 'title' | 'sectionCourseTitle' | 'chapterTitle'>
  onBack: () => void
}

function LessonBreadcrumb({ lesson, onBack }: LessonBreadcrumbProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-text-secondary"
      aria-label="Breadcrumb"
    >
      <Button
        appearance="ghost"
        size="sm"
        className="h-auto gap-1.5 p-0 text-sm font-semibold text-primary-text hover:bg-transparent"
        onClick={onBack}
      >
        <ArrowLeft size={16} />
        Khóa học
      </Button>
      {lesson.sectionCourseTitle && (
        <>
          <ChevronRight size={13} />
          <span>{lesson.sectionCourseTitle}</span>
        </>
      )}
      {lesson.chapterTitle && (
        <>
          <ChevronRight size={13} />
          <span>{lesson.chapterTitle}</span>
        </>
      )}
      <ChevronRight size={13} />
      <span className="max-w-[260px] truncate font-semibold text-text-heading">{lesson.title}</span>
    </nav>
  )
}

export default LessonBreadcrumb
