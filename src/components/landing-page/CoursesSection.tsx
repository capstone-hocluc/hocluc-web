import { useState } from 'react'
import type { Course } from '../../services/courseService'
import LandingCourseCard, { CourseGridSkeleton } from './LandingCourseCard'
import LandingLink from './LandingLink'
import Icon from './Icon'
import { useMainCourses } from './use-main-courses'

// Opt-in local design preview. Never substitute sample data for a failed real request.
const previewCourses: Course[] = import.meta.env.DEV
  ? [
      {
        id: 'landing-design-preview',
        title: 'V-ACT: Xây nền tảng, vững tư duy',
        description:
          'Củng cố 5 nhóm kiến thức, luyện tập theo chủ đề và hiểu cách giải qua từng bài học.',
        imageUrl: '/landing-v2/assets/hero-mai-nam-learning.webp',
        targetExam: 'V-ACT',
        price: 1490000,
        startDate: '2026-11-01',
      },
    ]
  : []

export default function CoursesSection() {
  const [isPreview] = useState(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('preview-course') === '1'
  )
  const { courses, status, retry } = useMainCourses(isPreview ? previewCourses : undefined)
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
        {isPreview && (
          <p className="course-preview-notice">
            Khóa học minh họa để xem giao diện. Tên, học phí và ngày khai giảng là dữ liệu mẫu.
          </p>
        )}
        <div aria-busy={status === 'loading'}>
          {status === 'loading' && <CourseGridSkeleton />}
          {status === 'error' && (
            <div className="course-empty" role="status">
              <Icon name="book-open" />
              <div>
                <h3>Chưa tải được khóa học</h3>
                <p>Bạn có thể thử lại hoặc trải nghiệm bài học mẫu trong lúc chờ.</p>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={retry}
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
              {courses.slice(0, 3).map((course) => (
                <LandingCourseCard key={course.id} course={course} preview={isPreview} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
