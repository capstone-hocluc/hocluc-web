import type {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '../../../services/orderAdminService'
import type { StatusTone } from '../../console/status'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
}

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'danger',
}

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  VNPAY: 'VNPay',
  SEPAY: 'SePay',
  MANUAL: 'Xác nhận thủ công',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  AMOUNT_MISMATCH: 'Lệch số tiền',
  LATE: 'Đến trễ',
}

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  SUCCESS: 'success',
  FAILED: 'danger',
  AMOUNT_MISMATCH: 'warning',
  LATE: 'warning',
}

/** Staff can close an order that is not paid and not already closed. */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'EXPIRED' || status === 'FAILED'
}

/**
 * Manual settlement rescues a transfer that arrived outside the normal flow - missing, late or
 * mismatched - and the money is what makes it real, so an order staff already closed can still be
 * settled. Only a PAID order is left alone, matching what the backend accepts.
 */
export function canConfirmOrder(status: OrderStatus): boolean {
  return status !== 'PAID'
}
