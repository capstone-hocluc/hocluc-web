import { GraduationCap, Trash2 } from '../console/icons'
import type { CartItem } from '../../services/cartService'
import { formatCoursePrice, formatDate, prettifyEnum } from '../../lib/courseFormat'

interface CartItemRowProps {
  item: CartItem
  onRemove: (courseId: string) => void
  removing: boolean
}

function CartItemRow({ item, onRemove, removing }: CartItemRowProps) {
  const trackLabel = prettifyEnum(item.track)
  const startLabel = formatDate(item.startDate)
  const endLabel = formatDate(item.endDate)

  return (
    <div className="hl-cart-item">
      <div className="hl-cart-item-cover">
        <GraduationCap size={24} />
      </div>

      <div className="hl-cart-item-body">
        <h3>{item.title}</h3>
        <div className="hl-cart-item-meta">
          {trackLabel && <span>{trackLabel}</span>}
          {startLabel && (
            <span>
              {startLabel}
              {endLabel ? ` – ${endLabel}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="hl-cart-item-side">
        <span className="hl-cart-item-price">{formatCoursePrice(item.price)}</span>
        <button
          type="button"
          className="hl-cart-item-remove"
          onClick={() => onRemove(item.courseId)}
          disabled={removing}
        >
          <Trash2 size={13} />
          {removing ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  )
}

export default CartItemRow
