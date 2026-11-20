import type { ReactNode } from 'react'
import Status from '../../console/status'
import type { CourseAdmin } from '../../../services/courseAdminService'
import CourseCover from './course-cover'
import { COURSE_TYPE_LABELS, courseDisplayStatus } from './course-labels'
import { formatExamDate } from './exam-year-labels'

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

const coursePrice = (course: CourseAdmin) =>
  course.paid ? vnd.format(course.price ?? 0) : 'Miễn phí'

interface Props {
  course: CourseAdmin
  /** The subject name is left out when the list is already filtered to one subject. */
  showSubject: boolean
  onOpen: () => void
  /** The next step and the menu; kept above the card's link so they stay clickable. */
  actions: ReactNode
}

// One course in the console list. The whole card opens the course; the actions in its footer do not.
export default function CourseCard({ course, showSubject, onOpen, actions }: Props) {
  const status = courseDisplayStatus(course)
  const dates =
    course.startDate && course.endDate
      ? `${formatExamDate(course.startDate)} – ${formatExamDate(course.endDate)}`
      : null
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-card-border bg-card-background transition-colors hover:border-input-primary-focus-border/40">
      <CourseCover
        imageUrl={course.imageUrl}
        title={course.title}
        categoryName={course.categoryName}
        loading="lazy"
        className="rounded-none text-2xl"
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-text-tertiary">
          <span className="shrink-0">{COURSE_TYPE_LABELS[course.courseType]}</span>
          {showSubject && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{course.categoryName ?? 'Chưa phân loại'}</span>
            </>
          )}
        </p>
        <h3 className="m-0 text-base leading-6 font-semibold text-text-primary">
          <button
            type="button"
            onClick={onOpen}
            title={course.title}
            className="line-clamp-2 cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-inherit outline-none after:absolute after:inset-0 hover:text-primary focus-visible:underline"
          >
            {course.title}
          </button>
        </h3>
        {dates && <p className="text-xs text-text-tertiary">{dates}</p>}
        <p className="mt-auto pt-1 text-sm font-semibold text-text-primary">{coursePrice(course)}</p>
      </div>
      <footer className="flex min-h-13 items-center justify-between gap-2 border-t border-card-border py-2 pr-3 pl-4">
        <Status tone={status.tone}>{status.label}</Status>
        <div className="relative z-10">{actions}</div>
      </footer>
    </article>
  )
}
