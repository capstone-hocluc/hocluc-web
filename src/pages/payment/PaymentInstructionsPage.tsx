import { useEffect, useState } from 'react'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import PaymentInstructionsCard from '../../components/payment/PaymentInstructionsCard'
import { getPaymentData, payOrder, type OrderPaymentData } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import { canPayOrder, getOrderStatusLabel } from '../../lib/orderStatus'
import { formatCoursePrice } from '../../lib/courseFormat'
import { ApiError } from '../../lib/api'
import { safePurchaseOrderId } from '../../lib/purchaseSession'

interface Props {
  orderId: string
  onGoToOrderDetail: () => void
  onGoToMyCourses: () => void
}
export default function PaymentInstructionsPage({
  orderId,
  onGoToOrderDetail,
  onGoToMyCourses,
}: Props) {
  const [data, setData] = useState<OrderPaymentData | null>(null)
  const [error, setError] = useState('')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    let active = true,
      inFlight = false,
      failures = 0,
      terminal = false
    let timer: number | undefined
    const schedule = (delay: number) => {
      window.clearTimeout(timer)
      if (active && !terminal) timer = window.setTimeout(() => void fetchOnce(), delay)
    }
    const fetchOnce = async () => {
      if (!active || inFlight) return
      if (!navigator.onLine) {
        setError('Bạn đang ngoại tuyến. Kết nối lại để kiểm tra thanh toán.')
        schedule(15_000)
        return
      }
      if (document.hidden) {
        schedule(15_000)
        return
      }
      inFlight = true
      try {
        const next = await getPaymentData(orderId)
        if (!active) return
        setData(next)
        setError('')
        failures = 0
        terminal = next.order.status !== 'PENDING'
      } catch (e) {
        if (active) {
          setError(getErrorMessage(e))
          failures++
        }
      } finally {
        inFlight = false
        if (active && !terminal) schedule(Math.min(30_000, 4000 * 2 ** Math.min(failures, 3)))
      }
    }
    const resume = () => {
      if (!terminal) {
        window.clearTimeout(timer)
        void fetchOnce()
      }
    }
    void fetchOnce()
    window.addEventListener('online', resume)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      active = false
      window.clearTimeout(timer)
      window.removeEventListener('online', resume)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [orderId, reload])
  const retryPayment = async () => {
    if (retrying) return
    setRetrying(true)
    setError('')
    setActiveOrderId(null)
    try {
      setData(await payOrder(orderId))
      setReload((v) => v + 1)
    } catch (e) {
      setError(getErrorMessage(e))
      if (e instanceof ApiError && e.code === 'ORDER_PAYMENT_IN_PROGRESS')
        setActiveOrderId(safePurchaseOrderId(e.errors?.activeOrderId))
    } finally {
      setRetrying(false)
    }
  }
  const order = data?.order
  const pending = order?.status === 'PENDING'
  const seconds = order?.expiresAt
    ? Math.max(0, Math.ceil((Date.parse(order.expiresAt) - now) / 1000))
    : null
  const ready =
    pending && data?.accountNumber && data.paymentCode && data.amount !== null && seconds !== 0
  return (
    <PurchaseLayout
      title={order?.status === 'PAID' ? 'Thanh toán thành công' : 'Thanh toán khóa học'}
      step="03 / XÁC NHẬN"
    >
      <button className="purchase-link purchase-back" onClick={onGoToOrderDetail}>
        ← Chi tiết đơn hàng
      </button>
      {error && (
        <PurchaseNotice>
          {error}{' '}
          {activeOrderId && (
            <a className="purchase-link" href={`/orders/${activeOrderId}/payment`}>
              Tiếp tục thanh toán đơn đang chờ
            </a>
          )}
          <button className="purchase-link" onClick={() => setReload((v) => v + 1)}>
            Kiểm tra lại
          </button>
        </PurchaseNotice>
      )}
      {!data && !error && (
        <div className="purchase-skeleton" role="status">
          Đang tải thông tin thanh toán…
        </div>
      )}
      {order && (
        <>
          <div className="purchase-payment-heading">
            <strong>Đơn #{order.orderCode}</strong>
            <span>{getOrderStatusLabel(order.status)}</span>
            <strong>{formatCoursePrice(order.totalAmount)}</strong>
          </div>
          {pending ? (
            <>
              {ready ? (
                <PaymentInstructionsCard key={data.paymentCode} paymentData={data} />
              ) : (
                <section className="purchase-panel">
                  <p role="status">
                    {seconds === 0
                      ? 'Đã hết thời gian hiển thị mã. Đang kiểm tra trạng thái đơn với máy chủ; nếu bạn đã chuyển khoản, vui lòng chờ xác nhận.'
                      : 'Chưa có đủ thông tin chuyển khoản. Vui lòng kiểm tra lại hoặc mở chi tiết đơn.'}
                  </p>
                  <button className="btn is-secondary" onClick={() => setReload((v) => v + 1)}>
                    Kiểm tra trạng thái
                  </button>
                </section>
              )}
              <p className="purchase-muted" role="status">
                Hệ thống tự cập nhật khi nhận được giao dịch hợp lệ.
                {seconds !== null && seconds > 0 && (
                  <>
                    {' '}
                    Thời gian chuyển khoản: {Math.floor(seconds / 60)}:
                    {String(seconds % 60).padStart(2, '0')}.
                  </>
                )}
              </p>
              <p className="purchase-muted">
                Nếu đã chuyển khoản nhưng chưa được xác nhận, không chuyển thêm lần nữa; hãy giữ
                chứng từ để đối chiếu.
              </p>
            </>
          ) : (
            <section className="purchase-panel purchase-empty">
              <h2>{getOrderStatusLabel(order.status)}</h2>
              <p>
                {order.status === 'PAID'
                  ? 'Quyền học đã được cập nhật cho tài khoản của bạn.'
                  : 'Kiểm tra trạng thái đơn trước khi tiếp tục thanh toán.'}
              </p>
              <div className="purchase-actions">
                {order.status === 'PAID' && (
                  <button className="btn" onClick={onGoToMyCourses}>
                    Vào khóa học của tôi
                  </button>
                )}
                {canPayOrder(order.status) && (
                  <button className="btn" disabled={retrying} onClick={() => void retryPayment()}>
                    {retrying ? 'Đang chuẩn bị…' : 'Thanh toán lại'}
                  </button>
                )}
                <button className="btn is-secondary" onClick={onGoToOrderDetail}>
                  Xem đơn hàng
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </PurchaseLayout>
  )
}
