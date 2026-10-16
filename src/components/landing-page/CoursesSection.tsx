import { useEffect, useState } from 'react'
import { coursesSection } from '../../data/landing-content'
import { formatCoursePrice, formatDate, formatExamLabel, prettifyEnum } from '../../lib/courseFormat'
import { getMainCourses, type Course } from '../../services/courseService'
import AppLink from './AppLink'
import AuthLink from './AuthLink'
import Icon from './Icon'

const SHOWN_COURSES = 3

type CoursesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; courses: Course[] }

// Courses starting soonest first; courses without a start date go last.
function byStartDate(a: Course, b: Course) {
  const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY
  const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY
  return aTime - bTime
}

function CourseCardLink({ course }: { course: Course }) {
  const badge = formatExamLabel(course.targetExam) || prettifyEnum(course.track)
  const startDate = formatDate(course.startDate)

  return (
    <AppLink className="course-card" href={`/courses/${encodeURIComponent(course.id)}`}>
      <div className="course-cover">
        {course.imageUrl ? (
          <img src={course.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="course-cover-fallback" aria-hidden="true">
            <Icon name="book-open" />
          </span>
        )}
        {course.purchased && <span className="course-owned">{coursesSection.owned}</span>}
      </div>
      <div className="course-body">
        {badge && <span className="course-badge">{badge}</span>}
        <h3>{course.title}</h3>
        {course.description && <p>{course.description}</p>}
        {startDate && (
          <span className="course-meta">
            <Icon name="calendar" />
            Khai giảng {startDate}
          </span>
        )}
        <div className="course-footer">
          <strong className="course-price">{formatCoursePrice(course.price)}</strong>
          <span className="course-cta">
            {coursesSection.cardCta} <Icon name="arrow-right" />
          </span>
        </div>
      </div>
    </AppLink>
  )
}

function CoursesSection() {
  const [state, setState] = useState<CoursesState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMainCourses()
      .then((response) => {
        if (cancelled) return
        const courses = [...(response.data || [])].sort(byStartDate).slice(0, SHOWN_COURSES)
        setState({ status: 'ready', courses })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = () => {
    setState({ status: 'loading' })
    setReloadKey((current) => current + 1)
  }

  const hasCourses = state.status === 'ready' && state.courses.length > 0

  return (
    <section
      className="section courses-section"
      id="cac-khoa-hoc"
      aria-labelledby="courses-title"
      aria-busy={state.status === 'loading'}
    >
      <div className="container">
        <div className="catalog-heading">
          <div>
            <h2 id="courses-title">{coursesSection.title}</h2>
            <p>{coursesSection.text}</p>
          </div>
        </div>

        {state.status === 'loading' && (
          <>
            <p className="sr-only" role="status">
              {coursesSection.loading}
            </p>
            <div className="course-grid" aria-hidden="true">
              {Array.from({ length: SHOWN_COURSES }, (_, index) => (
                <div key={index} className="course-card is-skeleton">
                  <div className="course-cover" />
                  <div className="course-body">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className="courses-state" role="alert">
            <h3>{coursesSection.errorTitle}</h3>
            <p>{coursesSection.errorText}</p>
            <div className="courses-state-actions">
              <button type="button" className="btn btn-secondary" onClick={retry}>
                <Icon name="rotate-ccw" />
                {coursesSection.retry}
              </button>
              <AppLink className="text-link" href="/courses">
                {coursesSection.allCta} <Icon name="arrow-right" />
              </AppLink>
            </div>
          </div>
        )}

        {state.status === 'ready' && !hasCourses && (
          <div className="courses-state">
            <img src={coursesSection.emptyImage} alt="" width={120} height={120} loading="lazy" />
            <h3>{coursesSection.emptyTitle}</h3>
            <p>{coursesSection.emptyText}</p>
            <div className="courses-state-actions">
              <AuthLink className="btn btn-primary">
                {coursesSection.emptyCta}
                <Icon name="arrow-right" />
              </AuthLink>
            </div>
          </div>
        )}

        {state.status === 'ready' && hasCourses && (
          <>
            <div className="course-grid">
              {state.courses.map((course) => (
                <CourseCardLink key={course.id} course={course} />
              ))}
            </div>
            <div className="courses-more">
              <AppLink className="btn btn-secondary" href="/courses">
                {coursesSection.allCta}
                <Icon name="arrow-right" />
              </AppLink>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default CoursesSection
