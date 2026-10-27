import { useMemo } from 'react'
import AuthLink from '../components/landing-page/AuthLink'
import Icon from '../components/landing-page/Icon'
import LandingCourseCard, { CourseGridSkeleton } from '../components/landing-page/LandingCourseCard'
import LandingLink from '../components/landing-page/LandingLink'
import {
  courseDate,
  formatCoursePrice,
  parseCourseDate,
} from '../components/landing-page/landing-course-format'
import { PublicFooter, PublicHeader } from '../components/landing-page/PublicChrome'
import { useMainCourses } from '../components/landing-page/use-main-courses'
import { landingHero } from '../data/landing-content'
import type { Course } from '../services/courseService'
import '../styles/landing/landing-page.css'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// "Luyện thi … · Lộ trình Dài hạn – Từ nền tảng…" reads as "Lộ trình Dài hạn" in the comparison;
// a title without that shape is shown whole.
function shortName(title: string) {
  const part = title.split(' · ')[1]?.split(' – ')[0]?.trim()
  return part || title
}

function weeksBetween(start?: string, end?: string) {
  const from = parseCourseDate(start)
  const to = parseCourseDate(end)
  if (!from || !to || to <= from) return null
  return Math.ceil((to.getTime() - from.getTime()) / WEEK_MS)
}

const formatDay = (value?: string) => {
  const date = parseCourseDate(value)
  return date ? courseDate.format(date) : '—'
}

function CompareTable({ courses }: { courses: Course[] }) {
  return (
    <section className="section catalog-compare" aria-labelledby="catalog-compare-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <h2 id="catalog-compare-title">So sánh nhanh</h2>
            <p>Các lộ trình cùng hướng tới kỳ thi, khác nhau ở thời điểm bắt đầu và thời gian ôn.</p>
          </div>
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Lộ trình</th>
              <th scope="col">Khai giảng</th>
              <th scope="col">Kết thúc</th>
              <th scope="col">Ngày thi</th>
              <th scope="col">Thời gian học</th>
              <th scope="col">Học phí</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => {
              const weeks = weeksBetween(course.startDate, course.endDate)
              return (
                <tr key={course.id}>
                  <th scope="row">
                    <LandingLink href={`/courses/${encodeURIComponent(course.id)}`}>
                      {shortName(course.title)}
                    </LandingLink>
                  </th>
                  <td data-label="Khai giảng">{formatDay(course.startDate)}</td>
                  <td data-label="Kết thúc">{formatDay(course.endDate)}</td>
                  <td data-label="Ngày thi">
                    {formatDay(course.examSessionDate)}
                    {course.examSession && !course.examSession.dateConfirmed && ' (dự kiến)'}
                  </td>
                  <td data-label="Thời gian học">{weeks ? `${weeks} tuần` : '—'}</td>
                  <td data-label="Học phí" className="compare-price">
                    {formatCoursePrice(course.price) ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Public catalog of the MAIN courses, in the landing page's look: the roadmaps first, then a
// side-by-side comparison, then a way to choose for students who are not sure yet.
function CourseCatalogPage() {
  const { courses, status, retry } = useMainCourses()
  const sorted = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          (parseCourseDate(a.startDate)?.getTime() ?? Infinity) -
          (parseCourseDate(b.startDate)?.getTime() ?? Infinity)
      ),
    [courses]
  )

  return (
    <>
      <PublicHeader />
      <div className="landing-page catalog-page">
        <main id="main">
          <section className="section catalog-intro" aria-labelledby="catalog-title">
            <div className="container">
              <div className="section-heading">
                <div>
                  <h1 id="catalog-title">
                    Khám phá khóa học.
                    <br />
                    <span className="accent">Chọn lộ trình hợp với bạn.</span>
                  </h1>
                  <p>Mỗi lộ trình gồm đủ 4 phần của bài thi V-ACT, khác nhau ở thời gian ôn và nhịp học.</p>
                </div>
              </div>
              <div aria-busy={status === 'loading'}>
                {status === 'loading' && <CourseGridSkeleton />}
                {status === 'error' && (
                  <div className="course-empty" role="status">
                    <Icon name="book-open" />
                    <div>
                      <h3>Chưa tải được khóa học</h3>
                      <p>Kiểm tra kết nối rồi thử lại.</p>
                    </div>
                    <button className="btn btn-secondary" type="button" onClick={retry}>
                      Thử lại <Icon name="rotate-ccw" />
                    </button>
                  </div>
                )}
                {status === 'ready' && sorted.length === 0 && (
                  <div className="course-empty" role="status">
                    <Icon name="book-open" />
                    <div>
                      <h3>Khóa học đang được cập nhật</h3>
                      <p>Trong lúc chờ, thử một câu hỏi và khám phá cách học cùng Học Lực.</p>
                    </div>
                    <LandingLink className="btn btn-secondary" href="/#hoc-thu">
                      Thử một bài học <Icon name="arrow-right" />
                    </LandingLink>
                  </div>
                )}
                {status === 'ready' && sorted.length > 0 && (
                  <div className="course-grid">
                    {sorted.map((course) => (
                      <LandingCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {status === 'ready' && sorted.length > 1 && <CompareTable courses={sorted} />}

          <section className="closing-cta" aria-labelledby="catalog-help-title">
            <div className="container closing-cta-inner">
              <div>
                <h2 id="catalog-help-title">Chưa biết chọn lộ trình nào?</h2>
                <p>Làm bài đánh giá miễn phí để biết phần nào cần ôn trước, rồi chọn lộ trình vừa sức.</p>
              </div>
              <div className="closing-cta-actions">
                <AuthLink className="btn btn-primary">
                  {landingHero.primaryCta} <Icon name="arrow-right" />
                </AuthLink>
                <LandingLink className="btn btn-secondary" href="/#hoc-thu">
                  Thử một bài học
                </LandingLink>
              </div>
            </div>
          </section>
        </main>
      </div>
      <PublicFooter />
    </>
  )
}

export default CourseCatalogPage
