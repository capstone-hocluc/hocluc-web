import { useEffect, useState } from 'react'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import { getOrder, type Order } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { formatCoursePrice } from '../../lib/courseFormat'
import { getOrderStatusLabel } from '../../lib/orderStatus'
interface Props {
  onGoToMyCourses: () => void
  onOpenOrder: (id: string) => void
  onGoToOrders: () => void
}
export default function PaymentResultPage({ onGoToMyCourses, onOpenOrder, onGoToOrders }: Props) {
  const orderId = new URLSearchParams(window.location.search).get('orderId')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!orderId)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!orderId) return
    let active = true
    getOrder(orderId)
      .then((next) => {
        if (active) {
          setOrder(next)
          setError('')
        }
      })
      .catch((e) => {
        if (active) setError(getErrorMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orderId, reload])
  return (
    <PurchaseLayout title="Trạng thái thanh toán" step="XÁC NHẬN">
      {error && (
        <PurchaseNotice>
          {error}{' '}
          <button
            className="purchase-link"
            onClick={() => {
              setLoading(true)
              setReload((v) => v + 1)
            }}
          >
            Kiểm tra lại
          </button>
        </PurchaseNotice>
      )}
      {loading ? (
        <p className="purchase-skeleton" role="status">
          Đang kiểm tra với máy chủ…
        </p>
      ) : order ? (
        <section className="purchase-panel purchase-empty">
          <h2>{getOrderStatusLabel(order.status)}</h2>
          <p>
            Đơn #{order.orderCode} · {formatCoursePrice(order.totalAmount)}
          </p>
          <p>
            {order.status === 'PAID'
              ? 'Quyền học đã được cập nhật cho tài khoản của bạn.'
              : 'Mở đơn hàng để xem thông tin và tiếp tục thanh toán nếu cần.'}
          </p>
          <div className="purchase-actions">
            {order.status === 'PAID' && (
              <button className="btn" onClick={onGoToMyCourses}>
                Vào khóa học của tôi
              </button>
            )}
            <button className="btn is-secondary" onClick={() => onOpenOrder(order.id)}>
              Xem đơn hàng
            </button>
          </div>
        </section>
      ) : (
        !error && (
          <section className="purchase-panel purchase-empty">
            <h2>Chưa có đơn hàng để kiểm tra</h2>
            <button className="btn" onClick={onGoToOrders}>
              Đơn hàng của tôi
            </button>
          </section>
        )
      )}
    </PurchaseLayout>
  )
}
