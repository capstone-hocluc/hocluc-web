import { ArrowRight, CheckCircle2, Sparkles } from '../console/icons'
import SubjectAvatarIcon from '../common/SubjectAvatarIcon'
import { SUBJECT_AVATAR_TYPES } from '../common/subjectAvatars'
import type { Course } from '../../services/courseService'
import { formatCoursePrice, formatDate, formatExamLabel, prettifyEnum } from '../../lib/courseFormat'

interface CourseCardProps {
  course: Course
  onOpen: (course: Course) => void
  avatarIndex?: number
}

function CourseCard({ course, onOpen, avatarIndex = 0 }: CourseCardProps) {
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
        <SubjectAvatarIcon type={SUBJECT_AVATAR_TYPES[avatarIndex % SUBJECT_AVATAR_TYPES.length]} className="size-[54px] drop-shadow-[0_8px_10px_rgba(22,75,111,.12)]" />
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
