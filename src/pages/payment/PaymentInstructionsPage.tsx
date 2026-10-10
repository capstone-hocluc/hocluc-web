import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import PaymentInstructionsCard from '../../components/payment/PaymentInstructionsCard'
import { getOrder, type Order, type OrderPaymentData } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { getOrderStatusLabel } from '../../lib/orderStatus'
import { formatCoursePrice } from '../../lib/courseFormat'

interface PaymentInstructionsPageProps {
  orderId: string
  onGoToOrderDetail: () => void
  onGoToMyCourses: () => void
}

const POLL_INTERVAL_MS = 4000

// The QR/bank-transfer instructions only ever come from the checkout/pay
// response - GET /orders/{orderId} never returns them (confirmed contract).
// They're handed to this page via navigation history state, which survives
// an in-tab refresh (F5) but not a brand-new navigation (new tab, shared
// link, reopened tab). That second case is a real, reported limitation, not
// something this page tries to paper over with invented data.
function readNavigationPaymentData(orderId: string): OrderPaymentData | null {
  const state = window.history.state as OrderPaymentData | null
  if (state && state.order && state.order.id === orderId) return state
  return null
}

function PaymentInstructionsPage({
  orderId,
  onGoToOrderDetail,
  onGoToMyCourses,
}: PaymentInstructionsPageProps) {
  const [paymentData] = useState<OrderPaymentData | null>(() => readNavigationPaymentData(orderId))
  const [order, setOrder] = useState<Order | null>(paymentData?.order ?? null)
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const pollInFlightRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let polling = true

    const fetchOnce = async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      try {
        const data = await getOrder(orderId)
        if (cancelled) return
        setOrder(data)
        setStatus('ready')
        // Only PENDING is worth continuing to poll for - any other status
        // (known terminal or unrecognized) stops it rather than polling
        // indefinitely on a state we don't understand.
        if (data.status !== 'PENDING') {
          polling = false
          window.clearInterval(intervalId)
        }
      } catch (error) {
        if (cancelled) return
        setErrorMessage(getErrorMessage(error))
        setStatus('error')
      } finally {
        pollInFlightRef.current = false
      }
    }

    fetchOnce()
    const intervalId = window.setInterval(() => {
      if (!polling || document.hidden) return
      fetchOnce()
    }, POLL_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (polling && document.visibilityState === 'visible') fetchOnce()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      polling = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [orderId, reloadKey])

  const retry = () => {
    setStatus('checking')
    setReloadKey((current) => current + 1)
  }

  return (
    <div className="hl-pay-page">
      <Navbar />
      <main className="hl-pay-main-wrap">
        <div className="hl-pay-container">
          <h1 className="hl-pay-title">Thanh toán khóa học</h1>

          {status === 'checking' && !order && (
            <div className="hl-pay-grid">
              <div className="hl-pay-skeleton" style={{ height: 340 }} />
              <div className="hl-pay-skeleton" style={{ height: 200 }} />
            </div>
          )}

          {status === 'error' && !order && (
            <div className="hl-pay-state">
              <AlertTriangle size={30} />
              <p>{errorMessage}</p>
              <button type="button" onClick={retry}>
                Thử lại
              </button>
            </div>
          )}

          {order && order.status === 'PENDING' && (
            <>
              {paymentData ? (
                <PaymentInstructionsCard paymentData={paymentData} />
              ) : (
                <div className="hl-pay-state">
                  <AlertTriangle size={30} />
                  <p>
                    Không tìm thấy thông tin thanh toán cho đơn hàng này. Vui lòng quay lại chi
                    tiết đơn hàng và bấm "Thanh toán" để lấy lại mã QR và thông tin chuyển khoản
                    mới nhất.
                  </p>
                  <button type="button" onClick={onGoToOrderDetail}>
                    Xem chi tiết đơn hàng
                  </button>
                </div>
              )}
              <div className="hl-pay-pending-note">
                <Clock size={16} />
                Đang chờ thanh toán — hệ thống sẽ tự động cập nhật khi nhận được chuyển khoản.
              </div>
            </>
          )}

          {order && order.status === 'PAID' && (
            <div className="hl-pay-result-card">
              <CheckCircle2 size={44} className="is-success" />
              <h2>Thanh toán thành công</h2>
              <p>Đơn hàng #{order.orderCode} đã được thanh toán.</p>
              <div className="hl-pay-result-actions">
                <button type="button" className="hl-pay-result-cta" onClick={onGoToMyCourses}>
                  Vào khóa học của tôi
                </button>
                <button
                  type="button"
                  className="hl-pay-result-cta is-secondary"
                  onClick={onGoToOrderDetail}
                >
                  Xem đơn hàng
                </button>
              </div>
            </div>
          )}

          {order && ['FAILED', 'CANCELLED', 'EXPIRED'].includes(order.status) && (
            <div className="hl-pay-result-card">
              <XCircle size={44} className="is-danger" />
              <h2>{getOrderStatusLabel(order.status)}</h2>
              <p>
                Đơn hàng #{order.orderCode} · {formatCoursePrice(order.totalAmount)}
              </p>
              <div className="hl-pay-result-actions">
                <button type="button" className="hl-pay-result-cta" onClick={onGoToOrderDetail}>
                  Xem chi tiết đơn hàng
                </button>
              </div>
            </div>
          )}

          {order && !['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(order.status) && (
            <div className="hl-pay-result-card">
              <AlertTriangle size={44} />
              <h2>Trạng thái đơn hàng: {getOrderStatusLabel(order.status)}</h2>
              <div className="hl-pay-result-actions">
                <button type="button" className="hl-pay-result-cta" onClick={onGoToOrderDetail}>
                  Xem chi tiết đơn hàng
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PaymentInstructionsPage
