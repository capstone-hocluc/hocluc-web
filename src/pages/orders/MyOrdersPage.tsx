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
  const [page, setPage] = useState(1)
  const sortedOrders = [...orders].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  const pages = Math.max(1, Math.ceil(sortedOrders.length / 5))
  const currentPage = Math.min(page, pages)
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
    </Notice> : orders.length ? <>
      <p className="text-xs text-text-secondary">{orders.length} đơn hàng · Mới nhất trước</p>
      <div className="space-y-2.5">{sortedOrders.slice((currentPage - 1) * 5, currentPage * 5).map((order) => <OrderCard key={order.id} order={order} onOpen={onOpenOrder} student />)}</div>
      {pages > 1 && <nav aria-label="Phân trang đơn hàng" className="flex items-center justify-end gap-2 text-xs text-text-secondary"><span>Trang {currentPage}/{pages}</span><Button size="sm" appearance="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Trước</Button><Button size="sm" appearance="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sau</Button></nav>}
    </>
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
