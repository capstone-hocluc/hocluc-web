import { useState } from 'react'
import { GraduationCap, PlayCircle, ShoppingCart } from '../console/icons'
import type { CourseDetail } from '../../services/courseService'
import { formatCoursePrice } from '../../lib/courseFormat'

interface CourseEnrollmentCardProps {
  course: CourseDetail
  onStartLearning: () => void
  onAddToCart: () => void
  addingToCart: boolean
  onGoToCart: () => void
}

function CourseEnrollmentCard({
  course,
  onStartLearning,
  onAddToCart,
  addingToCart,
  onGoToCart,
}: CourseEnrollmentCardProps) {
  const [imageError, setImageError] = useState(false)
  const showImage = Boolean(course.imageUrl) && !imageError

  return (
    <div className="hl-cd-enroll-card">
      <div className="hl-cd-enroll-cover">
        {showImage ? (
          <img src={course.imageUrl} alt={course.title} onError={() => setImageError(true)} />
        ) : (
          <div className="hl-cd-enroll-cover-fallback">
            <GraduationCap size={40} />
          </div>
        )}
        {course.videoUrl && (
          <a
            className="hl-cd-enroll-video-badge"
            href={course.videoUrl}
            target="_blank"
            rel="noreferrer"
          >
            <PlayCircle size={18} />
            Xem giới thiệu
          </a>
        )}
      </div>

      <div className="hl-cd-enroll-body">
        <span className="hl-cd-enroll-price">{formatCoursePrice(course.price, course.paid)}</span>

        {course.purchased ? (
          <button type="button" className="hl-cd-enroll-cta is-owned" onClick={onStartLearning}>
            Vào học
          </button>
        ) : course.inCart ? (
          <button type="button" className="hl-cd-enroll-cta is-secondary" onClick={onGoToCart}>
            <ShoppingCart size={16} />
            Xem giỏ hàng
          </button>
        ) : (
          <button
            type="button"
            className="hl-cd-enroll-cta"
            onClick={onAddToCart}
            disabled={addingToCart}
          >
            <ShoppingCart size={16} />
            {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
          </button>
        )}
      </div>
    </div>
  )
}

export default CourseEnrollmentCard
