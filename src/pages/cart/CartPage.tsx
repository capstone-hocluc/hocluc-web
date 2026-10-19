import { useEffect, useRef, useState } from 'react'
import { ShoppingBag } from '../../components/console/icons'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import CartItemRow from '../../components/cart/CartItemRow'
import CartSummary from '../../components/cart/CartSummary'
import {
  getCart,
  canCheckoutCart,
  clearCart,
  removeCartItem,
  type Cart,
} from '../../services/cartService'
import { getErrorMessage } from '../../lib/errors'
import { showSuccessToast } from '../../lib/toastBus'

interface Props {
  onBrowseCourses: () => void
  onGoToCheckout: () => void
}
export default function CartPage({ onBrowseCourses, onGoToCheckout }: Props) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [mutation, setMutation] = useState<string | null>(null)
  const mutationRef = useRef(false)
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    let active = true
    getCart()
      .then((r) => {
        if (active) {
          if (!r.data) throw new Error('Không tải được giỏ hàng.')
          setCart(r.data)
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
  }, [reload])
  const mutate = async (id: string) => {
    if (mutationRef.current) return
    mutationRef.current = true
    setMutation(id)
    setError('')
    try {
      const r = id === 'clear' ? await clearCart() : await removeCartItem(id)
      if (r.data) setCart(r.data)
      else {
        const fresh = await getCart()
        if (!fresh.data) throw new Error('Không tải được giỏ hàng.')
        setCart(fresh.data)
      }
      setConfirmClear(false)
      showSuccessToast(id === 'clear' ? 'Đã xóa toàn bộ giỏ hàng.' : 'Đã xóa khóa học khỏi giỏ.')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      mutationRef.current = false
      setMutation(null)
    }
  }
  const eligible = !!cart && canCheckoutCart(cart)
  return (
    <PurchaseLayout title="Giỏ hàng của bạn" step="01 / GIỎ HÀNG">
      <p className="purchase-intro">Tiếp tục hành trình học tập với những khóa học bạn đã chọn.</p>
      {error && (
        <PurchaseNotice>
          {error}{' '}
          <button
            className="purchase-link"
            onClick={() => {
              setLoading(true)
              setReload((v) => v + 1)
            }}
            disabled={!!mutation}
          >
            Tải lại giỏ hàng
          </button>
        </PurchaseNotice>
      )}
      {loading ? (
        <div className="purchase-skeleton" role="status">
          Đang tải giỏ hàng…
        </div>
      ) : cart && !cart.items.length ? (
        <section className="purchase-panel purchase-empty">
          <ShoppingBag size={40} />
          <h2>Giỏ hàng đang trống</h2>
          <p>Khám phá khóa học phù hợp với mục tiêu của bạn.</p>
          <button className="btn" onClick={onBrowseCourses}>
            Khám phá khóa học
          </button>
        </section>
      ) : (
        cart && (
          <div className="purchase-grid">
            <section>
              <div className="purchase-list-heading">
                <h2>{cart.items.length} khóa học</h2>
                <button
                  className="purchase-link"
                  disabled={!!mutation}
                  onClick={() => setConfirmClear(true)}
                >
                  Xóa toàn bộ
                </button>
              </div>
              {confirmClear && (
                <div className="purchase-notice" role="alert">
                  <p>Xóa tất cả {cart.items.length} khóa học khỏi giỏ hàng?</p>
                  <div className="purchase-actions">
                    <button
                      className="btn is-secondary"
                      disabled={!!mutation}
                      onClick={() => setConfirmClear(false)}
                    >
                      Giữ giỏ hàng
                    </button>
                    <button
                      className="btn is-danger"
                      disabled={!!mutation}
                      onClick={() => void mutate('clear')}
                    >
                      {mutation === 'clear' ? 'Đang xóa…' : 'Xác nhận xóa'}
                    </button>
                  </div>
                </div>
              )}
              <div className="purchase-list" aria-busy={!!mutation}>
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.courseId}
                    item={item}
                    removing={mutation === item.courseId}
                    disabled={!!mutation}
                    onRemove={(id) => void mutate(id)}
                  />
                ))}
              </div>
              <button className="purchase-link purchase-back" onClick={onBrowseCourses}>
                ← Khám phá thêm khóa học
              </button>
            </section>
            <aside>
              <CartSummary
                itemCount={cart.itemCount}
                totalAmount={cart.totalAmount}
                disabled={!eligible || !!mutation || !!error}
                reason={
                  mutation
                    ? 'Đang cập nhật giỏ hàng…'
                    : !eligible
                      ? 'Hãy xóa các khóa học không còn đủ điều kiện để tiếp tục.'
                      : undefined
                }
                onCheckout={() => {
                  if (eligible && !mutation && !error) onGoToCheckout()
                }}
              />
            </aside>
          </div>
        )
      )}
    </PurchaseLayout>
  )
}
