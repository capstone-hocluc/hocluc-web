import { request } from '../lib/api'

export interface OrderItem {
  courseId: string
  courseTitle: string
  unitPrice: number
}

export interface Order {
  id: string
  orderCode: string
  paymentCode: string
  status: string
  totalAmount: number
  createdAt: string
  expiresAt: string | null
  paidAt: string | null
  paymentAttempts: number
  items: OrderItem[]
}

// Checkout, explicit payment retry and GET /orders/{id}/payment share this shape.
// Bank fields are null for terminal/free orders; the order is always authoritative.
export interface OrderPaymentData {
  order: Order
  paymentCode: string | null
  bankCode: string | null
  accountNumber: string | null
  accountName: string | null
  amount: number | null
  qrUrl: string | null
}

export async function checkout(
  cartVersion: string,
  idempotencyKey: string
): Promise<OrderPaymentData> {
  const response = await request<OrderPaymentData>('/api/v1/orders/checkout', {
    method: 'POST',
    auth: true,
    body: { cartVersion },
    headers: { 'Idempotency-Key': idempotencyKey },
    timeoutMs: 20_000,
  })
  if (!response.data) throw new Error('Phản hồi tạo đơn hàng không hợp lệ.')
  return response.data
}

export async function getPaymentData(orderId: string): Promise<OrderPaymentData> {
  const response = await request<OrderPaymentData>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/payment`,
    { auth: true, timeoutMs: 15_000 }
  )
  if (!response.data) throw new Error('Không tải được thông tin thanh toán.')
  return response.data
}

export async function getOrder(orderId: string): Promise<Order> {
  const response = await request<Order>(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
    auth: true,
  })
  if (!response.data) throw new Error('Không tìm thấy dữ liệu đơn hàng.')
  return response.data
}

export async function getMyOrders(): Promise<Order[]> {
  const response = await request<Order[]>('/api/v1/orders/me', { auth: true })
  return response.data || []
}

export async function payOrder(orderId: string): Promise<OrderPaymentData> {
  const response = await request<OrderPaymentData>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/pay`,
    { method: 'POST', auth: true, timeoutMs: 20_000 }
  )
  if (!response.data) throw new Error('Phản hồi thanh toán không hợp lệ.')
  return response.data
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const response = await request<Order>(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    auth: true,
  })
  if (!response.data) throw new Error('Phản hồi hủy đơn hàng không hợp lệ.')
  return response.data
}
