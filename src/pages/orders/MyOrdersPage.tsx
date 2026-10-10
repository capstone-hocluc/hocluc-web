import { useEffect, useState } from 'react'
import { AlertTriangle, PackageOpen } from '../../components/console/icons'
import Navbar from '../../components/common/Navbar'
import Footer from '../../components/common/Footer'
import Chatbot from '../../components/landing/Chatbot'
import OrderCard from '../../components/orders/OrderCard'
import { getMyOrders, type Order } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'

interface MyOrdersPageProps {
  onOpenOrder: (orderId: string) => void
  onBrowseCourses: () => void
}

function MyOrdersPage({ onOpenOrder, onBrowseCourses }: MyOrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMyOrders()
      .then((data) => {
        if (cancelled) return
        setOrders(data)
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

  return (
    <div className="hl-orders-page">
      <Navbar />
      <main className="hl-orders-main-wrap">
        <div className="hl-orders-container">
          <h1 className="hl-orders-title">Đơn hàng của tôi</h1>

          {status === 'loading' && (
            <div className="hl-orders-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="hl-orders-skeleton" key={index} />
              ))}
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

          {status === 'ready' && orders.length === 0 && (
            <div className="hl-orders-empty">
              <PackageOpen size={36} />
              <h2>Bạn chưa có đơn hàng nào</h2>
              <p>Khám phá các khóa học phù hợp và bắt đầu hành trình học tập của bạn.</p>
              <button type="button" onClick={onBrowseCourses}>
                Khám phá khóa học
              </button>
            </div>
          )}

          {status === 'ready' && orders.length > 0 && (
            <div className="hl-orders-list">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={onOpenOrder} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <Chatbot />
    </div>
  )
}

export default MyOrdersPage
