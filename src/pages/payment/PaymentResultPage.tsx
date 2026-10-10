import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, XCircle } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import Chatbot from '../../components/landing/Chatbot'
import { getOrder, type Order } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { formatCoursePrice } from '../../lib/courseFormat'
import { getOrderStatusLabel } from '../../lib/orderStatus'

interface PaymentResultPageProps {
  onGoToMyCourses: () => void
  onOpenOrder: (orderId: string) => void
  onGoToOrders: () => void
}

function formatDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN')
}

// The payment gateway is expected to redirect back with the order id in the
// query string. No provider-specific params (VNPay or otherwise) are parsed
// here - just this one generic, provider-neutral key.
function getOrderIdFromUrl() {
  return new URLSearchParams(window.location.search).get('orderId')
}

function PaymentResultPage({ onGoToMyCourses, onOpenOrder, onGoToOrders }: PaymentResultPageProps) {
  const [orderId] = useState(getOrderIdFromUrl)
  const [order, setOrder] = useState<Order | null>(null)
  const [status, setStatus] = useState<'checking' | 'ready' | 'error' | 'no-order'>(
    orderId ? 'checking' : 'no-order'
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    getOrder(orderId)
      .then((data) => {
        if (cancelled) return
        setOrder(data)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setErrorMessage(getErrorMessage(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [orderId, reloadKey])

  const recheck = () => {
    setStatus('checking')
    setReloadKey((current) => current + 1)
  }

  return (
    <div className="hl-payres-page">
      <Navbar />
      <main className="hl-payres-main-wrap">
        <div className="hl-payres-container">
          {status === 'checking' && (
            <div className="hl-payres-state">
              <Clock size={32} />
              <p>Đang kiểm tra trạng thái thanh toán...</p>
            </div>
          )}

          {status === 'no-order' && (
            <div className="hl-payres-state">
              <HelpCircle size={32} />
              <p>Không tìm thấy thông tin đơn hàng để kiểm tra.</p>
              <button type="button" onClick={onGoToOrders}>
                Xem đơn hàng của tôi
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="hl-payres-state">
              <AlertTriangle size={32} />
              <p>{errorMessage}</p>
              <button type="button" onClick={recheck}>
                Thử lại
              </button>
            </div>
          )}

          {status === 'ready' && order && (
            <div className="hl-payres-card">
              {order.status === 'PAID' && (
                <>
                  <CheckCircle2 size={44} className="is-success" />
                  <h1>Thanh toán thành công</h1>
                  <p>Đơn hàng #{order.orderCode} đã được thanh toán.</p>
                  <div className="hl-payres-actions">
                    <button type="button" className="hl-payres-cta" onClick={onGoToMyCourses}>
                      Xem khóa học của tôi
                    </button>
                    <button
                      type="button"
                      className="hl-payres-cta is-secondary"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}

              {order.status === 'PENDING' && (
                <>
                  <Clock size={44} className="is-warning" />
                  <h1>Đang chờ xác nhận thanh toán</h1>
                  <dl className="hl-payres-info-list">
                    <div>
                      <dt>Mã đơn</dt>
                      <dd>#{order.orderCode}</dd>
                    </div>
                    <div>
                      <dt>Tổng cộng</dt>
                      <dd>{formatCoursePrice(order.totalAmount)}</dd>
                    </div>
                    {order.expiresAt && (
                      <div>
                        <dt>Hết hạn</dt>
                        <dd>{formatDateTime(order.expiresAt)}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="hl-payres-actions">
                    <button type="button" className="hl-payres-cta" onClick={recheck}>
                      Kiểm tra lại trạng thái
                    </button>
                    <button
                      type="button"
                      className="hl-payres-cta is-secondary"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}

              {order.status === 'FAILED' && (
                <>
                  <XCircle size={44} className="is-danger" />
                  <h1>Thanh toán chưa thành công</h1>
                  <p>Đơn hàng #{order.orderCode} chưa được thanh toán thành công.</p>
                  <div className="hl-payres-actions">
                    <button
                      type="button"
                      className="hl-payres-cta"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}

              {order.status === 'EXPIRED' && (
                <>
                  <XCircle size={44} className="is-danger" />
                  <h1>Đơn hàng đã hết hạn</h1>
                  <p>Đơn hàng #{order.orderCode} đã hết hạn thanh toán.</p>
                  <div className="hl-payres-actions">
                    <button
                      type="button"
                      className="hl-payres-cta"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}

              {order.status === 'CANCELLED' && (
                <>
                  <XCircle size={44} className="is-danger" />
                  <h1>Đơn hàng đã được hủy</h1>
                  <p>Đơn hàng #{order.orderCode} đã bị hủy.</p>
                  <div className="hl-payres-actions">
                    <button
                      type="button"
                      className="hl-payres-cta"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}

              {!['PAID', 'PENDING', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(order.status) && (
                <>
                  <HelpCircle size={44} />
                  <h1>Trạng thái đơn hàng: {getOrderStatusLabel(order.status)}</h1>
                  <div className="hl-payres-actions">
                    <button
                      type="button"
                      className="hl-payres-cta"
                      onClick={() => onOpenOrder(order.id)}
                    >
                      Xem đơn hàng
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  )
}

export default PaymentResultPage
