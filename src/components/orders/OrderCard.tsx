import { ChevronRight } from '../console/icons'
import type { Order } from '../../services/orderService'
import { formatCoursePrice, formatDate } from '../../lib/courseFormat'
import OrderStatusBadge from './OrderStatusBadge'
export default function OrderCard({
  order,
  onOpen,
}: {
  order: Order
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      className="purchase-order-card purchase-panel"
      onClick={() => onOpen(order.id)}
    >
      <div className="purchase-order-main">
        <div className="purchase-order-top">
          <strong>#{order.orderCode}</strong>
          <OrderStatusBadge status={order.status} />
        </div>
        <p>{order.items.map((item) => item.courseTitle).join(', ')}</p>
        <span className="purchase-muted">{formatDate(order.createdAt)}</span>
      </div>
      <div className="purchase-order-side">
        <strong>{formatCoursePrice(order.totalAmount)}</strong>
        <ChevronRight size={20} />
      </div>
    </button>
  )
}
