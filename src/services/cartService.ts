import { request } from '../lib/api'

export interface CartItem {
  courseId: string
  title: string
  track?: string
  startDate?: string
  endDate?: string
  price?: number
  addedAt?: string
  thumbnailUrl?: string | null
  eligibility?: { canPurchase: boolean; reasonCode: string | null; message: string | null }
}
export interface Cart {
  items: CartItem[]
  itemCount: number
  totalAmount: number
  version?: string
  currency?: 'VND'
  canCheckout?: boolean
}
export interface AddCartItemRequest {
  courseId: string
}
export async function getCart() {
  return request<Cart>('/api/v1/cart', { auth: true })
}
export async function addCartItem(courseId: string) {
  return request<Cart>('/api/v1/cart/items', {
    method: 'POST',
    body: { courseId } satisfies AddCartItemRequest,
    auth: true,
  })
}
export async function removeCartItem(courseId: string) {
  return request<Cart>('/api/v1/cart/items/' + encodeURIComponent(courseId), {
    method: 'DELETE',
    auth: true,
  })
}
export async function clearCart() {
  return request<Cart>('/api/v1/cart', { method: 'DELETE', auth: true })
}
export function getEndedCartItems(items: CartItem[], now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)
  return items.filter((item) => !!item.endDate && item.endDate < today)
}
export function cartItemIssue(item: CartItem): string | null {
  if (item.eligibility?.canPurchase === false)
    return (
      item.eligibility.message ||
      'Khóa học hiện không đủ điều kiện mua. Hãy xóa khỏi giỏ để tiếp tục.'
    )
  if (!item.eligibility && getEndedCartItems([item]).length)
    return 'Khóa học đã kết thúc. Hãy xóa khỏi giỏ để tiếp tục.'
  return null
}
export function canCheckoutCart(cart: Cart) {
  return (
    cart.items.length > 0 &&
    cart.canCheckout !== false &&
    cart.items.every((item) => !cartItemIssue(item))
  )
}
