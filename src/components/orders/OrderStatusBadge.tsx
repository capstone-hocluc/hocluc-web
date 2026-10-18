import { getOrderStatusLabel, getOrderStatusTone } from '../../lib/orderStatus'
export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={'purchase-status is-' + getOrderStatusTone(status)}>
      {getOrderStatusLabel(status)}
    </span>
  )
}
