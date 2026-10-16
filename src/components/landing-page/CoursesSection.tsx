import { useEffect, useState } from 'react'
import { getMainCourses, type Course } from '../../services/courseService'
import LandingLink from './LandingLink'
import Icon from './Icon'

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function CourseCover({ course }: { course: Course }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="course-cover">
      {course.imageUrl && !failed ? (
        <img src={course.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="course-cover-fallback">
          <Icon name="book-open" />
          <span>{course.targetExam || 'Học Lực'}</span>
        </div>
      )}
      {course.purchased && (
        <span className="course-owned">
          <Icon name="check" /> Đã sở hữu
        </span>
      )}
    </div>
  )
}

export default function CoursesSection() {
  const [courses, setCourses] = useState<Course[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    getMainCourses()
      .then((response) => {
        if (cancelled) return
        setCourses(response.data ?? [])
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])
  return (
    <section className="section courses-section" id="khoa-hoc" aria-labelledby="courses-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <h2 id="courses-title">
              Chọn khóa học.
              <br />
              <span className="accent">Bắt đầu hành trình của bạn.</span>
            </h2>
            <p>Tìm nội dung phù hợp, xem thông tin và học phí trước khi quyết định.</p>
          </div>
          <LandingLink className="text-link" href="/courses">
            Xem tất cả khóa học <Icon name="arrow-up-right" />
          </LandingLink>
        </div>
        <div aria-busy={status === 'loading'}>
          {status === 'loading' && (
            <>
              <p className="sr-only" role="status">
                Đang tải khóa học
              </p>
              <div className="course-grid" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="course-skeleton">
                    <div />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            </>
          )}
          {status === 'error' && (
            <div className="course-empty" role="status">
              <Icon name="book-open" />
              <div>
                <h3>Chưa tải được khóa học</h3>
                <p>Bạn có thể thử lại hoặc trải nghiệm bài học mẫu trong lúc chờ.</p>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setStatus('loading')
                    setAttempt((value) => value + 1)
                  }}
                >
                  Thử lại <Icon name="rotate-ccw" />
                </button>
              </div>
              <a className="text-link" href="#hoc-thu">
                Thử một bài học <Icon name="arrow-right" />
              </a>
            </div>
          )}
          {status === 'ready' && courses.length === 0 && (
            <div className="course-empty" role="status">
              <Icon name="book-open" />
              <div>
                <h3>Khóa học đang được cập nhật</h3>
                <p>Trong lúc chờ, thử một câu hỏi và khám phá cách học cùng Học Lực.</p>
              </div>
              <a className="btn btn-secondary" href="#hoc-thu">
                Thử một bài học <Icon name="arrow-right" />
              </a>
            </div>
          )}
          {status === 'ready' && courses.length > 0 && (
            <div className="course-grid">
              {courses.slice(0, 3).map((course) => {
                const date = course.startDate
                  ? new Date(`${course.startDate.slice(0, 10)}T00:00:00`)
                  : null
                return (
                  <article className="landing-course" key={course.id}>
                    <CourseCover course={course} />
                    <div className="course-info">
                      <h3>
                        <LandingLink href={`/courses/${encodeURIComponent(course.id)}`}>
                          {course.title}
                        </LandingLink>
                      </h3>
                      {course.description && (
                        <p className="course-description">{course.description}</p>
                      )}
                      {date && !Number.isNaN(date.getTime()) && (
                        <p className="course-date">Khai giảng {dateFormat.format(date)}</p>
                      )}
                      <div className="course-bottom">
                        <div>
                          {typeof course.price === 'number' &&
                            Number.isFinite(course.price) &&
                            course.price >= 0 && (
                              <>
                                <span className="course-price-label">Học phí</span>
                                <strong>
                                  {course.price === 0 ? 'Miễn phí' : currency.format(course.price)}
                                </strong>
                              </>
                            )}
                        </div>
                        <LandingLink
                          className="text-link"
                          href={`/courses/${encodeURIComponent(course.id)}`}
                        >
                          Xem chi tiết <Icon name="arrow-right" />
                          <span className="sr-only"> {course.title}</span>
                        </LandingLink>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
