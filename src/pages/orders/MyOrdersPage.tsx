import { useEffect, useState } from 'react'
import PurchaseLayout, { PurchaseNotice } from '../../components/purchase/PurchaseLayout'
import OrderCard from '../../components/orders/OrderCard'
import { getMyOrders, type Order } from '../../services/orderService'
import { getErrorMessage } from '../../lib/errors'
import MascotState from '../../components/common/MascotState'
import Notice from '../../components/ui/Notice'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
interface Props {
  onOpenOrder: (id: string) => void
  onBrowseCourses: () => void
}
export default function MyOrdersPage({ onOpenOrder, onBrowseCourses }: Props) {
  return <PurchaseLayout title="Đơn hàng của tôi" step="ĐƠN HÀNG">
    <MyOrdersContent onOpenOrder={onOpenOrder} onBrowseCourses={onBrowseCourses} />
  </PurchaseLayout>
}

export function MyOrdersContent({ onOpenOrder, onBrowseCourses, student = false }: Props & { student?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    getMyOrders()
      .then((data) => {
        if (active) {
          setOrders(data)
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
  if (student) return <div className="space-y-4">
    {loading ? <Skeleton className="h-48 rounded-2xl" /> : error ? <Notice role="alert" tone="danger">
      {error}<Button appearance="outline" size="sm" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Thử lại</Button>
    </Notice> : orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} onOpen={onOpenOrder} student />)
      : <MascotState title="Bạn chưa có đơn hàng nào" message="Đơn mua khóa học và gói Sao sẽ xuất hiện tại đây."
        actionLabel="Khám phá khóa học" onAction={onBrowseCourses} />}
  </div>
  return (
    <>
      {error && (
        <PurchaseNotice>
          {error}{' '}
          <button
            className="purchase-link"
            onClick={() => {
              setLoading(true)
              setReload((v) => v + 1)
            }}
          >
            Thử lại
          </button>
        </PurchaseNotice>
      )}
      {loading ? (
        <p className="purchase-skeleton" role="status">
          Đang tải đơn hàng…
        </p>
      ) : (
        !error &&
        (orders.length ? (
          <div className="purchase-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onOpen={onOpenOrder} />
            ))}
          </div>
        ) : (
          <section className="purchase-panel purchase-empty">
            <h2>Bạn chưa có đơn hàng nào</h2>
            <p>Chọn khóa học phù hợp để bắt đầu hành trình học tập.</p>
            <button className="btn" onClick={onBrowseCourses}>
              Khám phá khóa học
            </button>
          </section>
        ))
      )}
    </>
  )
}
