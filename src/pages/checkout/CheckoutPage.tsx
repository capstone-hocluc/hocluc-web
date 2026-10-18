import { useEffect, useRef, useState } from 'react'
import { Landmark } from '../../components/console/icons'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import { getCart, cartItemIssue, canCheckoutCart, type Cart } from '../../services/cartService'
import { checkout, type OrderPaymentData } from '../../services/orderService'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getErrorMessage } from '../../lib/errors'
import { ApiError } from '../../lib/api'
import { formatCoursePrice } from '../../lib/courseFormat'
import { checkoutIntent, clearCheckoutIntent } from '../../lib/purchaseSession'

interface Props {
  onOrderCreated: (data: OrderPaymentData) => void
  onBackToCart: () => void
}
export default function CheckoutPage({ onOrderCreated, onBackToCart }: Props) {
  const { profile } = useCurrentUser()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [changed, setChanged] = useState(false)
  const [reconfirmVersion, setReconfirmVersion] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    getCart()
      .then((r) => {
        if (active) {
          if (!r.data) throw new Error('Không tải được giỏ hàng.')
          setCart(r.data)
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
  }, [reload])
  const buyer =
    profile?.displayName ||
    [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') ||
    profile?.email
  const eligible = !!cart && canCheckoutCart(cart) && !!cart.version && !!profile
  const submit = async () => {
    if (!eligible || !cart?.version || !profile || submittingRef.current || changed) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    const version = cart.version
    const key = checkoutIntent(profile.id, version)
    try {
      const result = await checkout(version, key)
      clearCheckoutIntent(profile.id, version)
      if (mounted.current) onOrderCreated(result)
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.code === 'CART_CHANGED' || e.code === 'ORDER_IDEMPOTENCY_CONFLICT')
      ) {
        setChanged(true)
        setReconfirmVersion(version)
        setError(
          'Giỏ hàng đã thay đổi. Kiểm tra lại khóa học và tổng tiền, rồi xác nhận để tiếp tục.'
        )
        try {
          const fresh = await getCart()
          if (!fresh.data)
            throw new Error('Không tải được phiên bản giỏ hàng mới. Vui lòng thử lại.', {
              cause: e,
            })
          setCart(fresh.data)
        } catch (refreshError) {
          setCart(null)
          setError(getErrorMessage(refreshError))
        }
      } else setError(getErrorMessage(e))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  return (
    <PurchaseLayout title="Xác nhận đơn hàng" step="02 / THANH TOÁN">
      <button className="purchase-link purchase-back" disabled={submitting} onClick={onBackToCart}>
        ← Quay lại giỏ hàng
      </button>
      <p className="purchase-intro">Kiểm tra khóa học và thông tin người mua trước khi tạo đơn.</p>
      {error && (
        <PurchaseNotice>
          {error}
          {!cart && (
            <button
              className="purchase-link"
              onClick={() => {
                setError('')
                setLoading(true)
                setReload((v) => v + 1)
              }}
            >
              Thử lại
            </button>
          )}
        </PurchaseNotice>
      )}
      {loading ? (
        <div className="purchase-skeleton" role="status">
          Đang kiểm tra giỏ hàng…
        </div>
      ) : cart && !cart.items.length ? (
        <section className="purchase-panel purchase-empty">
          <h2>Chưa có khóa học để thanh toán</h2>
          <button className="btn" onClick={onBackToCart}>
            Quay lại giỏ hàng
          </button>
        </section>
      ) : (
        cart && (
          <div className="purchase-grid">
            <div className="purchase-stack">
              <section className="purchase-panel">
                <h2>Thông tin người mua</h2>
                <dl className="purchase-details">
                  <div>
                    <dt>Họ và tên</dt>
                    <dd>{buyer}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile?.email}</dd>
                  </div>
                  {profile?.phone && (
                    <div>
                      <dt>Số điện thoại</dt>
                      <dd>{profile.phone}</dd>
                    </div>
                  )}
                </dl>
                <p className="purchase-muted">
                  Quyền học sẽ được cấp cho tài khoản này sau khi thanh toán được xác nhận.
                </p>
              </section>
              <section className="purchase-panel">
                <h2>Phương thức thanh toán</h2>
                <div className="purchase-payment-method">
                  <Landmark size={28} />
                  <div>
                    <strong>Chuyển khoản ngân hàng</strong>
                    <p className="purchase-muted">
                      Quét VietQR hoặc chuyển khoản theo hướng dẫn ở bước tiếp theo.
                    </p>
                  </div>
                </div>
              </section>
              <section className="purchase-panel">
                <h2>Khóa học đã chọn</h2>
                {cart.items.map((item) => (
                  <div className="purchase-checkout-course" key={item.courseId}>
                    <a href={'/courses/' + encodeURIComponent(item.courseId)}>{item.title}</a>
                    <strong>{formatCoursePrice(item.price)}</strong>
                    {cartItemIssue(item) && (
                      <p className="purchase-line-error">{cartItemIssue(item)}</p>
                    )}
                  </div>
                ))}
              </section>
            </div>
            <aside>
              <section className="purchase-panel purchase-summary">
                <h2>Thông tin đơn hàng</h2>
                <div className="purchase-total-row">
                  <span>Số khóa học</span>
                  <strong>{cart.itemCount}</strong>
                </div>
                <div className="purchase-total-row is-total">
                  <span>Tổng thanh toán</span>
                  <strong>{formatCoursePrice(cart.totalAmount)}</strong>
                </div>
                {!canCheckoutCart(cart) && (
                  <p className="purchase-line-error">
                    Có khóa học không còn đủ điều kiện. Quay lại giỏ hàng để xóa trước khi đặt hàng.
                  </p>
                )}
                {!cart.version && (
                  <p className="purchase-line-error">
                    Chưa tải được phiên bản giỏ hàng. Hãy tải lại trang để kiểm tra.
                  </p>
                )}
                {changed && (
                  <button
                    className="btn is-secondary"
                    disabled={submitting}
                    onClick={() => {
                      if (profile && reconfirmVersion)
                        clearCheckoutIntent(profile.id, reconfirmVersion)
                      if (profile && cart.version) clearCheckoutIntent(profile.id, cart.version)
                      setChanged(false)
                      setError('')
                      setReconfirmVersion(null)
                    }}
                  >
                    Tôi đã kiểm tra thay đổi
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  disabled={!eligible || submitting || changed}
                  onClick={() => void submit()}
                >
                  {submitting
                    ? 'Đang tạo đơn hàng…'
                    : cart.totalAmount === 0
                      ? 'Đăng ký khóa học miễn phí'
                      : 'Tạo đơn & tiếp tục thanh toán'}
                </button>
                <p className="purchase-muted">
                  Đơn hàng chỉ được xác nhận sau khi hệ thống ghi nhận thanh toán. Nếu mạng gián
                  đoạn, bạn có thể thử lại mà không tạo ý định thanh toán mới.
                </p>
              </section>
            </aside>
          </div>
        )
      )}
    </PurchaseLayout>
  )
}
