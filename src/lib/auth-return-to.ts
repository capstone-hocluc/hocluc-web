import { safePurchaseReturnTo } from './purchaseSession'
import { studentRoutes } from './studentRoutes'

/** Keep the existing purchase allowlist and the explicit placement entry only. */
export function safeAuthReturnTo(value: string | null): string | null {
  return value === studentRoutes.placement() ? value : safePurchaseReturnTo(value)
}

export function loginPathFor(returnTo: string | null): string {
  const target = safeAuthReturnTo(returnTo)
  return `/login${target ? `?returnTo=${encodeURIComponent(target)}` : ''}`
}
