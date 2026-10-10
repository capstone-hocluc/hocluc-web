import { useEffect, useState } from 'react'
import { AlertTriangle, Landmark, ShoppingBag } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import Chatbot from '../../components/landing/Chatbot'
import { getCart, type Cart } from '../../services/cartService'
import { checkout, type OrderPaymentData } from '../../services/orderService'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast } from '../../lib/toastBus'
import { formatCoursePrice } from '../../lib/courseFormat'

interface CheckoutPageProps {
  onOrderCreated: (paymentData: OrderPaymentData) => void
  onBackToCart: () => void
}

function CheckoutPage({ onOrderCreated, onBackToCart }: CheckoutPageProps) {
  const { profile } = useCurrentUser()
  const [cart, setCart] = useState<Cart | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCart()
      .then((response) => {
        if (cancelled) return
        setCart(response.data || { items: [], itemCount: 0, totalAmount: 0 })
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
  }, [reloadKey])

  const buyerName =
    profile?.displayName ||
    [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') ||
    ''

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await checkout()
      onOrderCreated(result)
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hl-checkout-page">
      <Navbar />
      <main className="hl-checkout-main-wrap">
        <div className="hl-checkout-container">
          <h1 className="hl-checkout-title">Thanh toán</h1>

          {status === 'loading' && (
            <div className="hl-checkout-grid">
              <div className="hl-checkout-skeleton" style={{ height: 260 }} />
              <div className="hl-checkout-skeleton" style={{ height: 220 }} />
            </div>
          )}

          {status === 'error' && (
            <div className="hl-checkout-state">
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

          {status === 'ready' && cart && cart.items.length === 0 && (
            <div className="hl-checkout-state">
              <ShoppingBag size={30} />
              <p>Giỏ hàng của bạn đang trống, không có gì để thanh toán.</p>
              <button type="button" onClick={onBackToCart}>
                Quay lại giỏ hàng
              </button>
            </div>
          )}

          {status === 'ready' && cart && cart.items.length > 0 && (
            <div className="hl-checkout-grid">
              <div className="hl-checkout-main">
                <section className="hl-checkout-section">
                  <h2>Thông tin người mua</h2>
                  <dl className="hl-checkout-info-list">
                    {buyerName && (
                      <div>
                        <dt>Họ và tên</dt>
                        <dd>{buyerName}</dd>
                      </div>
                    )}
                    {profile?.email && (
                      <div>
                        <dt>Email</dt>
                        <dd>{profile.email}</dd>
                      </div>
                    )}
                    {profile?.phone && (
                      <div>
                        <dt>Số điện thoại</dt>
                        <dd>{profile.phone}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="hl-checkout-section">
                  <h2>Phương thức thanh toán</h2>
                  <div className="hl-checkout-payment-method">
                    <Landmark size={20} />
                    <div>
                      <strong>Chuyển khoản ngân hàng</strong>
                      <span>Thanh toán qua cổng SePay</span>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="hl-checkout-aside">
                <div className="hl-checkout-summary">
                  <h2>Thông tin đơn hàng</h2>
                  <div className="hl-checkout-items">
                    {cart.items.map((item) => (
                      <div className="hl-checkout-item" key={item.courseId}>
                        <span>{item.title}</span>
                        <strong>{formatCoursePrice(item.price)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="hl-checkout-summary-row">
                    <span>Số khóa học</span>
                    <strong>{cart.itemCount}</strong>
                  </div>
                  <div className="hl-checkout-summary-row is-total">
                    <span>Tổng cộng</span>
                    <strong>{formatCoursePrice(cart.totalAmount)}</strong>
                  </div>
                  <button
                    type="button"
                    className="hl-checkout-cta"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Đang tạo đơn hàng...' : 'Đặt hàng & Thanh toán'}
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  )
}

export default CheckoutPage
