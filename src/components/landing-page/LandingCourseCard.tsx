import { useState } from 'react'
import type { Course } from '../../services/courseService'
import { fitFor, prepWeeks } from '../course-catalog/roadmap-compare'
import Icon from './Icon'
import LandingLink from './LandingLink'
import { courseDate, formatCoursePrice, parseCourseDate } from './landing-course-format'

function CourseCover({ course }: { course: Course }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="course-cover">
      {course.imageUrl && !failed ? (
        <img src={course.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="course-cover-fallback">
          <Icon name="book-open" />
          <span>{course.targetExam || 'Hocluc'}</span>
        </div>
      )}
      {course.purchased ? (
        <span className="course-flag course-owned">
          <Icon name="check" /> Đã sở hữu
        </span>
      ) : (
        course.recommended && <span className="course-flag course-recommended">Đề xuất cho bạn</span>
      )}
    </div>
  )
}

// One course on the public pages (home and /courses). `preview` is the home page's design
// sample, which has no detail page to open.
export default function LandingCourseCard({ course, preview = false }: { course: Course; preview?: boolean }) {
  const href = `/courses/${encodeURIComponent(course.id)}`
  const date = parseCourseDate(course.startDate)
  const price = formatCoursePrice(course.price)
  // The full description is a long sectioned text ("Khoá dành cho ai • …"); a card shows the one line
  // that says who the roadmap suits, and only falls back to the description when the dates are missing.
  const summary = fitFor(prepWeeks(course)) ?? course.description
  return (
    <article className="landing-course">
      <CourseCover course={course} />
      <div className="course-info">
        <h3>{preview ? course.title : <LandingLink href={href}>{course.title}</LandingLink>}</h3>
        {summary && <p className="course-description">{summary}</p>}
        {date && <p className="course-date">Khai giảng {courseDate.format(date)}</p>}
        <div className="course-bottom">
          <div>
            {price && (
              <>
                <span className="course-price-label">Học phí</span>
                <strong>{price}</strong>
              </>
            )}
          </div>
          {!preview && (
            <LandingLink className="text-link" href={href}>
              {course.purchased ? 'Vào học' : 'Xem chi tiết'} <Icon name="arrow-right" />
              <span className="sr-only"> {course.title}</span>
            </LandingLink>
          )}
        </div>
      </div>
    </article>
  )
}

export function CourseGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      <p className="sr-only" role="status">
        Đang tải khóa học
      </p>
      <div className="course-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, item) => (
          <div key={item} className="course-skeleton">
            <div />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </>
  )
}
