import { request } from '../lib/api'

export const ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_PROVIDERS = ['VNPAY', 'SEPAY', 'MANUAL'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'AMOUNT_MISMATCH', 'LATE'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface OrderItem {
  courseId: string
  courseTitle: string
  /** Price frozen at checkout time, not the course's current price. */
  unitPrice: number
}

export interface OrderPayment {
  id: string
  provider: PaymentProvider
  status: PaymentStatus
  amount: number
  transactionNo: string | null
  sepayTransactionId: number | null
  bankCode: string | null
  payDate: string | null
  paidAt: string | null
  /** True when an operator confirmed the money by hand instead of a gateway callback. */
  manual: boolean
  confirmedByEmail: string | null
  confirmReason: string | null
  createdAt: string
}

export interface OrderAdmin {
  id: string
  orderCode: string
  paymentCode: string | null
  /** Effective status: an overdue PENDING order already reads as EXPIRED. */
  status: OrderStatus
  totalAmount: number
  studentId: string
  studentEmail: string
  studentName: string | null
  createdAt: string
  expiresAt: string | null
  paidAt: string | null
  paymentAttempts: number
  items: OrderItem[]
}

export interface OrderAdminDetail extends OrderAdmin {
  payments: OrderPayment[]
  confirmedByEmail: string | null
  confirmReason: string | null
  confirmedAt: string | null
  cancelledByEmail: string | null
  cancelledAt: string | null
}

export interface OrderAdminPage {
  content: OrderAdmin[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface OrderQuery {
  status?: OrderStatus
  studentId?: string
  courseId?: string
  /** Inclusive YYYY-MM-DD, interpreted in Vietnam time. */
  from?: string
  to?: string
  /** Matches the order code or the payment code. */
  reference?: string
  page?: number
  size?: number
}

export interface ConfirmPaymentRequest {
  reason: string
  /** Omitted means the order total is assumed received. */
  receivedAmount?: number | null
}

const path = (id?: string) => `/api/v1/admin/orders${id ? `/${encodeURIComponent(id)}` : ''}`
const requireData = <T>(response: { data?: T }): T => {
  if (!response.data) throw new Error('Không nhận được dữ liệu đơn hàng.')
  return response.data
}

export async function getAdminOrders(query: OrderQuery = {}): Promise<OrderAdminPage> {
  const params = new URLSearchParams()
  Object.entries({ ...query, page: query.page ?? 0, size: query.size ?? 20 }).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
  )
  return requireData(await request<OrderAdminPage>(`${path()}?${params}`, { auth: true }))
}

export async function getAdminOrder(id: string): Promise<OrderAdminDetail> {
  return requireData(await request<OrderAdminDetail>(path(id), { auth: true }))
}

/** Staff closes an unpaid order: expired QR the student never paid, wrong course, ... */
export async function cancelAdminOrder(id: string): Promise<OrderAdmin> {
  return requireData(await request<OrderAdmin>(`${path(id)}/cancel`, { auth: true, method: 'POST' }))
}

/** Administrator-only: settle a missing, late or mismatched order by hand. */
export async function confirmAdminPayment(
  id: string,
  payload: ConfirmPaymentRequest
): Promise<OrderAdminDetail> {
  return requireData(
    await request<OrderAdminDetail>(`${path(id)}/confirm-payment`, {
      auth: true,
      method: 'POST',
      body: payload,
    })
  )
}
