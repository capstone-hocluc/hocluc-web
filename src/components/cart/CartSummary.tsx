import { formatCoursePrice } from '../../lib/courseFormat'
export default function CartSummary({
  itemCount,
  totalAmount,
  onCheckout,
  disabled,
  reason,
}: {
  itemCount: number
  totalAmount: number
  onCheckout: () => void
  disabled?: boolean
  reason?: string
}) {
  return (
    <section className="purchase-panel purchase-summary">
      <h2>Tóm tắt đơn hàng</h2>
      <div className="purchase-total-row">
        <span>Số khóa học</span>
        <strong>{itemCount}</strong>
      </div>
      <div className="purchase-total-row is-total">
        <span>Tổng cộng</span>
        <strong>{formatCoursePrice(totalAmount)}</strong>
      </div>
      {reason && (
        <p className="purchase-muted" id="cart-checkout-reason" role="status">
          {reason}
        </p>
      )}
      <button
        type="button"
        className="btn"
        disabled={disabled}
        aria-describedby={reason ? 'cart-checkout-reason' : undefined}
        onClick={onCheckout}
      >
        Tiến hành thanh toán
      </button>
      <p className="purchase-muted">Kiểm tra thông tin trước khi tạo đơn và chuyển khoản.</p>
    </section>
  )
}
