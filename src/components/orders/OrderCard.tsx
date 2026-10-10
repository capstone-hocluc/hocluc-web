import { ChevronRight } from '../console/icons'
import type { Order } from '../../services/orderService'
import { formatCoursePrice, formatDate } from '../../lib/courseFormat'
import OrderStatusBadge from './OrderStatusBadge'

interface OrderCardProps {
  order: Order
  onOpen: (orderId: string) => void
}

function OrderCard({ order, onOpen }: OrderCardProps) {
  const titles = order.items.map((item) => item.courseTitle)
  const preview = titles.slice(0, 2).join(', ')
  const extraCount = titles.length - 2

  return (
    <button type="button" className="hl-order-card" onClick={() => onOpen(order.id)}>
      <div className="hl-order-card-main">
        <div className="hl-order-card-top">
          <span className="hl-order-code">#{order.orderCode}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="hl-order-card-courses">
          {preview}
          {extraCount > 0 ? ` và ${extraCount} khóa học khác` : ''}
        </p>
        <span className="hl-order-card-date">{formatDate(order.createdAt)}</span>
      </div>
      <div className="hl-order-card-side">
        <span className="hl-order-card-total">{formatCoursePrice(order.totalAmount)}</span>
        <ChevronRight size={18} />
      </div>
    </button>
  )
}

export default OrderCard
