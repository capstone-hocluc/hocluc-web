import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from '../console/icons'
import type { Course } from '../../services/courseService'
import { formatCoursePrice, formatDate, formatExamLabel, prettifyEnum } from '../../lib/courseFormat'

interface CourseCardProps {
  course: Course
  onOpen: (course: Course) => void
}

function CourseCard({ course, onOpen }: CourseCardProps) {
  const badgeLabel = formatExamLabel(course.targetExam) || prettifyEnum(course.track) || 'Khóa học'
  const startLabel = formatDate(course.startDate)

  return (
    <button type="button" className="hl-catalog-card" onClick={() => onOpen(course)}>
      <div className="hl-catalog-cover">
        {course.recommended && (
          <span className="hl-catalog-badge-recommended">
            <Sparkles size={12} />
            Đề xuất
          </span>
        )}
        <span className="hl-catalog-cover-badge">{badgeLabel}</span>
        <BookOpen size={34} />
      </div>

      <div className="hl-catalog-body">
        <div>
          <div className="hl-catalog-tags">
            <span className="hl-catalog-subject">{badgeLabel}</span>
            {course.purchased && (
              <span className="hl-catalog-badge-owned">
                <CheckCircle2 size={12} />
                Đã đăng ký
              </span>
            )}
          </div>
          <h3>{course.title}</h3>
          <p>{course.description || 'Chưa có mô tả cho khóa học này.'}</p>
        </div>

        {startLabel && (
          <div className="hl-catalog-meta">
            <span>Khai giảng: {startLabel}</span>
          </div>
        )}

        <div className="hl-catalog-footer">
          <span className="hl-catalog-price">{formatCoursePrice(course.price)}</span>
          {course.purchased ? (
            <span className="hl-catalog-cta is-owned">
              Vào học
              <ArrowRight size={15} />
            </span>
          ) : (
            <span className="hl-catalog-cta">
              Xem khóa học
              <ArrowRight size={15} />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default CourseCard
