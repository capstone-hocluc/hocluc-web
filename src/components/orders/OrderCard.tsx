import { ChevronRight } from '../console/icons'
import type { Order } from '../../services/orderService'
import { formatCoursePrice, formatDate } from '../../lib/courseFormat'
import OrderStatusBadge from './OrderStatusBadge'
import StatusBadge from '../ui/StatusBadge'
import { getOrderStatusLabel, getOrderStatusTone } from '../../lib/orderStatus'
export default function OrderCard({
  order,
  onOpen,
  student = false,
}: {
  order: Order
  onOpen: (id: string) => void
  student?: boolean
}) {
  return (
    <button
      type="button"
      className={student ? 'flex w-full cursor-pointer flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-card bg-surface p-5 text-left text-text-heading hover:border-line-brand focus-visible:outline-2 focus-visible:outline-focus-ring' : 'purchase-order-card purchase-panel'}
      onClick={() => onOpen(order.id)}
    >
      <div className={student ? 'grid min-w-0 gap-3 break-words' : 'purchase-order-main'}>
        <div className={student ? 'flex flex-wrap items-center gap-3' : 'purchase-order-top'}>
          <strong>#{order.orderCode}</strong>
          {student ? <StatusBadge tone={getOrderStatusTone(order.status)}>{getOrderStatusLabel(order.status)}</StatusBadge> : <OrderStatusBadge status={order.status} />}
        </div>
        <p>
          {order.items
            .map((item) => (item.credits ? `${item.courseTitle} (${item.credits} Sao)` : item.courseTitle))
            .join(', ')}
        </p>
        <span className={student ? 'text-sm text-text-secondary' : 'purchase-muted'}>{formatDate(order.createdAt)}</span>
      </div>
      <div className={student ? 'flex shrink-0 items-center gap-3 text-primary-text' : 'purchase-order-side'}>
        <strong>{formatCoursePrice(order.totalAmount)}</strong>
        <ChevronRight size={20} />
      </div>
    </button>
  )
}
