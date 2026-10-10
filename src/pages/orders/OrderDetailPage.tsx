import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, SearchX } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import Chatbot from '../../components/landing/Chatbot'
import OrderStatusBadge from '../../components/orders/OrderStatusBadge'
import { cancelOrder, getOrder, payOrder, type Order, type OrderPaymentData } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { ApiError } from '../../lib/api'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'
import { formatCoursePrice } from '../../lib/courseFormat'
import { canCancelOrder, canPayOrder } from '../../lib/orderStatus'

interface OrderDetailPageProps {
  orderId: string
  onBackToOrders: () => void
  onGoToMyCourses: () => void
  onPaymentReady: (paymentData: OrderPaymentData) => void
  onOpenCourse: (courseId: string) => void
}

function formatDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN')
}

function OrderDetailPage({
  orderId,
  onBackToOrders,
  onGoToMyCourses,
  onPaymentReady,
  onOpenCourse,
}: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [payLoading, setPayLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  useEffect(() => {
    let cancelled = false
    getOrder(orderId)
      .then((data) => {
        if (cancelled) return
        setOrder(data)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setStatus('not-found')
          return
        }
        setErrorMessage(getErrorMessage(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [orderId, reloadKey])

  const handlePay = async () => {
    if (!order || payLoading) return
    setPayLoading(true)
    try {
      const result = await payOrder(order.id)
      setOrder(result.order)
      onPaymentReady(result)
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setPayLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!order || cancelLoading) return
    setCancelLoading(true)
    try {
      const cancelledOrder = await cancelOrder(order.id)
      setOrder(cancelledOrder)
      setConfirmingCancel(false)
      showSuccessToast('Đã hủy đơn hàng.')
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className="hl-orders-page">
      <Navbar />
      <main className="hl-orders-main-wrap">
        <div className="hl-orders-container">
          {status === 'loading' && (
            <div className="hl-orders-detail-grid">
              <div className="hl-orders-skeleton" style={{ height: 260 }} />
              <div className="hl-orders-skeleton" style={{ height: 220 }} />
            </div>
          )}

          {status === 'error' && (
            <div className="hl-orders-state">
              <AlertTriangle size={30} />
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setStatus('loading')
                  setReloadKey((current) => current + 1)
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {status === 'not-found' && (
            <div className="hl-orders-state">
              <SearchX size={30} />
              <p>Không tìm thấy đơn hàng này.</p>
              <button type="button" onClick={onBackToOrders}>
                Quay lại đơn hàng của tôi
              </button>
            </div>
          )}

          {status === 'ready' && order && (
            <>
            <button type="button" className="hl-orders-back" onClick={onBackToOrders}>
              <ChevronLeft size={16} />
              Đơn hàng của tôi
            </button>
            <div className="hl-orders-detail-grid">
              <div className="hl-orders-detail-main">
                <section className="hl-orders-section">
                  <h2>Thông tin đơn hàng</h2>
                  <dl className="hl-orders-info-list">
                    <div>
                      <dt>Mã đơn</dt>
                      <dd>#{order.orderCode}</dd>
                    </div>
                    <div>
                      <dt>Trạng thái</dt>
                      <dd>
                        <OrderStatusBadge status={order.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>Ngày tạo</dt>
                      <dd>{formatDateTime(order.createdAt)}</dd>
                    </div>
                    {order.expiresAt && (
                      <div>
                        <dt>Hết hạn</dt>
                        <dd>{formatDateTime(order.expiresAt)}</dd>
                      </div>
                    )}
                    {order.paidAt && (
                      <div>
                        <dt>Thanh toán lúc</dt>
                        <dd>{formatDateTime(order.paidAt)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Số lần thanh toán</dt>
                      <dd>{order.paymentAttempts}</dd>
                    </div>
                  </dl>
                </section>

                <section className="hl-orders-section">
                  <h2>Khóa học</h2>
                  <div className="hl-orders-items">
                    {order.items.map((item) => (
                      <button
                        type="button"
                        className="hl-orders-item is-clickable"
                        key={item.courseId}
                        onClick={() => onOpenCourse(item.courseId)}
                      >
                        <span>{item.courseTitle}</span>
                        <strong>{formatCoursePrice(item.unitPrice)}</strong>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="hl-orders-aside">
                <div className="hl-orders-summary">
                  <div className="hl-orders-summary-row is-total">
                    <span>Tổng cộng</span>
                    <strong>{formatCoursePrice(order.totalAmount)}</strong>
                  </div>

                  {canPayOrder(order.status) && (
                    <button type="button" className="hl-orders-cta" onClick={handlePay} disabled={payLoading}>
                      {payLoading ? 'Đang chuẩn bị thanh toán...' : 'Thanh toán ngay'}
                    </button>
                  )}

                  {canCancelOrder(order.status) && !confirmingCancel && (
                    <button
                      type="button"
                      className="hl-orders-cta is-danger-outline"
                      onClick={() => setConfirmingCancel(true)}
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  {confirmingCancel && (
                    <div className="hl-orders-cancel-confirm">
                      <p>Bạn có chắc muốn hủy đơn hàng này?</p>
                      <div className="hl-orders-cancel-actions">
                        <button
                          type="button"
                          className="hl-orders-cta is-secondary"
                          onClick={() => setConfirmingCancel(false)}
                          disabled={cancelLoading}
                        >
                          Giữ đơn hàng
                        </button>
                        <button
                          type="button"
                          className="hl-orders-cta is-danger"
                          onClick={handleCancel}
                          disabled={cancelLoading}
                        >
                          {cancelLoading ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === 'PAID' && (
                    <button type="button" className="hl-orders-cta is-owned" onClick={onGoToMyCourses}>
                      Vào học ngay
                    </button>
                  )}
                </div>
              </aside>
            </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  )
}

export default OrderDetailPage
