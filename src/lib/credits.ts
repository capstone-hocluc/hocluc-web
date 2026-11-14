import { useEffect, useSyncExternalStore } from 'react'
import { creditService, type CreditBalance, type CreditEntryType, type StreakView } from '../services/creditService'
import { AUTH_TOKENS_EVENT, accessTokenIdentity, accessTokenRole } from './api'

/** The unit's name on screen. The product has not settled on one; change it here only. */
export const CREDIT_UNIT = 'Sao'

export const CREDIT_ENTRY_LABELS: Record<CreditEntryType, string> = {
  EARN_STREAK: 'Học trong ngày',
  EARN_MILESTONE: 'Thưởng mốc chuỗi',
  PURCHASE: 'Mua gói',
  HOLD: 'Tạm giữ',
  CAPTURE: 'Đã dùng',
  RELEASE: 'Hoàn lại',
  SPEND: 'Đã dùng',
  ADMIN_ADJUST: 'Điều chỉnh',
  EXPIRE: 'Hết hạn',
  MIGRATION_GRANT: 'Quà tặng',
}

/** What a ledger row was for, in the student's words. */
export function creditEntryPurpose(refType: string | null): string | null {
  switch (refType) {
    case 'CHAT_QUESTION':
      return 'Hỏi mentor'
    case 'STUDENT_AI':
      return 'AI giải bài'
    case 'STREAK_FREEZE':
      return 'Đóng băng chuỗi'
    default:
      return null
  }
}

interface CreditState {
  balance: CreditBalance | null
  streak: StreakView | null
  loading: boolean
  balanceError: boolean
}

let state: CreditState = { balance: null, streak: null, loading: false, balanceError: false }
let loaded = false
/** Only the latest refresh for the current account can update the store. */
let generation = 0
const listeners = new Set<() => void>()

function set(next: Partial<CreditState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/**
 * Reloads the balance and the streak. Call it after anything that moves credits (a purchase, a question,
 * a photo, a freeze); every view of the balance updates together.
 */
export async function refreshCredits() {
  const started = ++generation
  set({ loading: true, balanceError: false })
  const [balance, streak] = await Promise.allSettled([creditService.balance(), creditService.streak()])
  if (started !== generation) return
  loaded = balance.status === 'fulfilled' && streak.status === 'fulfilled'
  set({
    balance: balance.status === 'fulfilled' ? balance.value : state.balance,
    streak: streak.status === 'fulfilled' ? streak.value : state.streak,
    balanceError: balance.status === 'rejected',
    loading: false,
  })
}

export function setStreak(streak: StreakView) {
  set({ streak })
}

/** The student's balance and streak, shared by the top bar, the dashboard and the wallet. Loads once. */
export function useCredits() {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state
  )
  useEffect(() => {
    if (!loaded && !state.loading) void refreshCredits()
  }, [])
  return snapshot
}

/** Forgets the balance and the streak, so the next account never sees the previous one's. */
export function resetCredits() {
  generation++
  loaded = false
  set({ balance: null, streak: null, loading: false, balanceError: false })
}

// Logout, an expired session, another account or another active role all start from an empty state.
if (typeof window !== 'undefined') {
  let owner = `${accessTokenIdentity()}|${accessTokenRole()}`
  window.addEventListener(AUTH_TOKENS_EVENT, () => {
    const next = `${accessTokenIdentity()}|${accessTokenRole()}`
    if (next === owner) return
    owner = next
    resetCredits()
  })
}
