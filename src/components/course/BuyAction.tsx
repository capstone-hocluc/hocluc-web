import type { CourseDetail } from '../../services/courseService'
import Icon from '../landing-page/Icon'

interface BuyActionProps {
  course: CourseDetail
  adding: boolean
  onAdd: () => void
  onStart: () => void
  onCart: () => void
}

// The one button that fits where the visitor stands with a course: study it once it is bought,
// open the cart when it is already in there, otherwise add it to the cart.
export default function BuyAction({ course, adding, onAdd, onStart, onCart }: BuyActionProps) {
  if (course.purchased)
    return (
      <button type="button" className="btn btn-primary" onClick={onStart}>
        Vào học <Icon name="arrow-right" />
      </button>
    )
  if (course.inCart)
    return (
      <button type="button" className="btn btn-secondary" onClick={onCart}>
        <Icon name="shopping-cart" /> Xem giỏ hàng
      </button>
    )
  return (
    <button type="button" className="btn btn-primary" onClick={onAdd} disabled={adding}>
      <Icon name="shopping-cart" /> {adding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
    </button>
  )
}
