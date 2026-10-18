import { useEffect, useRef, useState } from 'react'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import OrderStatusBadge from '../../components/orders/OrderStatusBadge'
import {
  cancelOrder,
  getOrder,
  payOrder,
  type Order,
  type OrderPaymentData,
} from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { ApiError } from '../../lib/api'
import { formatCoursePrice } from '../../lib/courseFormat'
import { canCancelOrder, canPayOrder } from '../../lib/orderStatus'
import { safePurchaseOrderId } from '../../lib/purchaseSession'

interface Props {
  orderId: string
  onBackToOrders: () => void
  onGoToMyCourses: () => void
  onPaymentReady: (data: OrderPaymentData) => void
  onOpenCourse: (id: string) => void
}
function date(value: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : '—'
}
export default function OrderDetailPage({
  orderId,
  onBackToOrders,
  onGoToMyCourses,
  onPaymentReady,
  onOpenCourse,
}: Props) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    let active = true
    getOrder(orderId)
      .then((next) => {
        if (active) {
          setOrder(next)
          setError('')
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError && e.status === 404
              ? 'Không tìm thấy đơn hàng này.'
              : getErrorMessage(e)
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orderId, reload])
  const mutate = async (action: 'pay' | 'cancel') => {
    if (!order || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setActiveOrderId(null)
    try {
      if (action === 'pay') {
        const next = await payOrder(order.id)
        setOrder(next.order)
        if (mounted.current) onPaymentReady(next)
      } else {
        setOrder(await cancelOrder(order.id))
        setConfirm(false)
      }
    } catch (e) {
      setError(getErrorMessage(e))
      if (e instanceof ApiError && e.code === 'ORDER_PAYMENT_IN_PROGRESS')
        setActiveOrderId(safePurchaseOrderId(e.errors?.activeOrderId))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  return (
    <PurchaseLayout
      title={order ? 'Đơn hàng #' + order.orderCode : 'Chi tiết đơn hàng'}
      step="ĐƠN HÀNG"
    >
      <button className="purchase-link purchase-back" onClick={onBackToOrders}>
        ← Đơn hàng của tôi
      </button>
      {error && (
        <PurchaseNotice>
          {error}{' '}
          {activeOrderId && (
            <a className="purchase-link" href={`/orders/${activeOrderId}/payment`}>
              Tiếp tục thanh toán đơn đang chờ
            </a>
          )}
          <button className="purchase-link" disabled={busy} onClick={() => setReload((v) => v + 1)}>
            Kiểm tra lại
          </button>
        </PurchaseNotice>
      )}
      {loading ? (
        <p className="purchase-skeleton" role="status">
          Đang tải đơn hàng…
        </p>
      ) : (
        order && (
          <div className="purchase-grid">
            <div className="purchase-stack">
              <section className="purchase-panel">
                <h2>Thông tin đơn hàng</h2>
                <dl className="purchase-details">
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>
                      <OrderStatusBadge status={order.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Ngày tạo</dt>
                    <dd>{date(order.createdAt)}</dd>
                  </div>
                  {order.expiresAt && (
                    <div>
                      <dt>Hết hạn</dt>
                      <dd>{date(order.expiresAt)}</dd>
                    </div>
                  )}
                  {order.paidAt && (
                    <div>
                      <dt>Thanh toán lúc</dt>
                      <dd>{date(order.paidAt)}</dd>
                    </div>
                  )}
                </dl>
              </section>
              <section className="purchase-panel">
                <h2>Khóa học</h2>
                {order.items.map((item) => (
                  <div className="purchase-checkout-course" key={item.courseId}>
                    <button className="purchase-link" onClick={() => onOpenCourse(item.courseId)}>
                      {item.courseTitle}
                    </button>
                    <strong>{formatCoursePrice(item.unitPrice)}</strong>
                  </div>
                ))}
              </section>
            </div>
            <aside>
              <section className="purchase-panel purchase-summary">
                <div className="purchase-total-row is-total">
                  <span>Tổng cộng</span>
                  <strong>{formatCoursePrice(order.totalAmount)}</strong>
                </div>
                {canPayOrder(order.status) && (
                  <button
                    className="btn"
                    disabled={busy || confirm}
                    onClick={() => void mutate('pay')}
                  >
                    {busy
                      ? 'Đang xử lý…'
                      : order.status === 'PENDING'
                        ? 'Tiếp tục thanh toán'
                        : 'Thanh toán lại'}
                  </button>
                )}
                {canCancelOrder(order.status) && !confirm && (
                  <button
                    className="btn is-secondary"
                    disabled={busy}
                    onClick={() => setConfirm(true)}
                  >
                    Hủy đơn hàng
                  </button>
                )}
                {confirm && (
                  <div role="alert">
                    <p>Bạn muốn hủy đơn hàng này?</p>
                    <div className="purchase-actions">
                      <button
                        className="btn is-secondary"
                        disabled={busy}
                        onClick={() => setConfirm(false)}
                      >
                        Giữ đơn hàng
                      </button>
                      <button
                        className="btn is-danger"
                        disabled={busy}
                        onClick={() => void mutate('cancel')}
                      >
                        {busy ? 'Đang hủy…' : 'Xác nhận hủy'}
                      </button>
                    </div>
                  </div>
                )}
                {order.status === 'PAID' && (
                  <button className="btn" onClick={onGoToMyCourses}>
                    Vào học ngay
                  </button>
                )}
              </section>
            </aside>
          </div>
        )
      )}
    </PurchaseLayout>
  )
}
