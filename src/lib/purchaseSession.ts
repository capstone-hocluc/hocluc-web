export function safePurchaseReturnTo(value: string | null): string | null {
  if (!value || value.includes('\\') || value.startsWith('//')) return null
  return /^\/(?:cart|checkout|orders(?:\/[a-zA-Z0-9-]+(?:\/payment)?)?|payment\/result)(?:\?[^#]*)?$/.test(
    value
  )
    ? value
    : null
}
export function safePurchaseOrderId(value: unknown): string | null {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}
export function purchaseLoginPath() {
  const target = safePurchaseReturnTo(window.location.pathname + window.location.search) || '/cart'
  return '/login?returnTo=' + encodeURIComponent(target)
}
function intentStorageKey(userId: string, version: string) {
  return 'hocluc.checkout:' + encodeURIComponent(userId) + ':' + encodeURIComponent(version)
}
export function checkoutIntent(userId: string, version: string): string {
  const storageKey = intentStorageKey(userId, version)
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing
  const key = crypto.randomUUID()
  sessionStorage.setItem(storageKey, key)
  return key
}
export function clearCheckoutIntent(userId: string, version: string) {
  sessionStorage.removeItem(intentStorageKey(userId, version))
}
