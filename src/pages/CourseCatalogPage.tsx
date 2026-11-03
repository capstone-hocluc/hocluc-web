import { useMemo } from 'react'
import RoadmapCompare from '../components/course-catalog/RoadmapCompare'
import AuthLink from '../components/landing-page/AuthLink'
import Icon from '../components/landing-page/Icon'
import LandingCourseCard, { CourseGridSkeleton } from '../components/landing-page/LandingCourseCard'
import { parseCourseDate } from '../components/landing-page/landing-course-format'
import { PublicFooter, PublicHeader } from '../components/landing-page/PublicChrome'
import { useMainCourses } from '../components/landing-page/use-main-courses'
import { landingHero } from '../data/landing-content'
import '../styles/landing/landing-page.css'
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
                  <p>Mỗi lộ trình gồm đủ 4 phần của bài thi ĐGNL, khác nhau ở thời gian ôn và nhịp học.</p>
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
                    </div>
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

          {status === 'ready' && sorted.length > 1 && <RoadmapCompare courses={sorted} />}

          <section className="closing-cta" aria-labelledby="catalog-help-title">
            <div className="container closing-cta-inner">
              <div>
                <h2 id="catalog-help-title">Chưa biết chọn lộ trình nào?</h2>
                <p>Làm bài đánh giá miễn phí để biết phần nào cần ôn trước, rồi chọn lộ trình vừa sức.</p>
              </div>
              <div className="closing-cta-actions grid-cols-1!">
                <AuthLink className="btn btn-primary">
                  {landingHero.assessmentCta} <Icon name="arrow-right" />
                </AuthLink>
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
