import { useEffect, useState } from 'react'
import { AlertTriangle, ShoppingBag } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import Chatbot from '../../components/landing/Chatbot'
import CartItemRow from '../../components/cart/CartItemRow'
import CartSummary from '../../components/cart/CartSummary'
import { getCart, removeCartItem, type Cart } from '../../services/cartService'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'

interface CartPageProps {
  onBrowseCourses: () => void
  onGoToCheckout: () => void
}

function CartPage({ onBrowseCourses, onGoToCheckout }: CartPageProps) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [removingId, setRemovingId] = useState<string | null>(null)

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

  const handleRemove = async (courseId: string) => {
    if (removingId) return
    setRemovingId(courseId)
    try {
      const response = await removeCartItem(courseId)
      if (response.data) setCart(response.data)
      showSuccessToast('Đã xóa khóa học khỏi giỏ hàng.')
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setRemovingId(null)
    }
  }

  const handleCheckout = () => {
    onGoToCheckout()
  }

  return (
    <div className="hl-cart-page">
      <Navbar />
      <main className="hl-cart-main-wrap">
        <div className="hl-cart-container">
          <h1 className="hl-cart-title">Giỏ hàng</h1>

          {status === 'loading' && (
            <div className="hl-cart-grid">
              <div className="hl-cart-skeleton-block" style={{ height: 280 }} />
              <div className="hl-cart-skeleton-block" style={{ height: 200 }} />
            </div>
          )}

          {status === 'error' && (
            <div className="hl-cart-state">
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
            <div className="hl-cart-empty">
              <ShoppingBag size={36} />
              <h2>Giỏ hàng của bạn đang trống</h2>
              <p>Hãy khám phá các khóa học phù hợp với mục tiêu của bạn.</p>
              <button type="button" onClick={onBrowseCourses}>
                Khám phá khóa học
              </button>
            </div>
          )}

          {status === 'ready' && cart && cart.items.length > 0 && (
            <div className="hl-cart-grid">
              <div className="hl-cart-list">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.courseId}
                    item={item}
                    onRemove={handleRemove}
                    removing={removingId === item.courseId}
                  />
                ))}
              </div>
              <aside className="hl-cart-aside">
                <CartSummary
                  itemCount={cart.itemCount}
                  totalAmount={cart.totalAmount}
                  onCheckout={handleCheckout}
                />
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

export default CartPage
