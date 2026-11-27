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
  REFUND: 'Hoàn Sao',
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
    case 'LIVE_CLASS':
      return 'Buổi học trực tiếp'
    default:
      return null
  }
}

/**
 * A pack just paid for, on its way into the balance. The wallet shows it arriving, then lands it; the top bar holds
 * it back until then and counts it in.
 */
export interface CreditArrival {
  orderId: string
  amount: number
  /** The balance in the store already includes the pack (a reload started after the payment has come back). */
  ready: boolean
  landed: boolean
}

interface CreditState {
  balance: CreditBalance | null
  streak: StreakView | null
  loading: boolean
  balanceError: boolean
  arrival: CreditArrival | null
}

let state: CreditState = { balance: null, streak: null, loading: false, balanceError: false, arrival: null }
let loaded = false
/** Only the latest refresh for the current account can update the store. */
let generation = 0
/** Counts reloads, so an arrival is only ready once a reload that started after the payment has finished. */
let reloads = 0
let arrivalAfter = 0
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
  const reload = ++reloads
  set({ loading: true, balanceError: false })
  const [balance, streak] = await Promise.allSettled([creditService.balance(), creditService.streak()])
  if (started !== generation) return
  loaded = balance.status === 'fulfilled' && streak.status === 'fulfilled'
  const { arrival } = state
  set({
    arrival: balance.status === 'fulfilled' && arrival && !arrival.ready && reload > arrivalAfter ? { ...arrival, ready: true } : arrival,
    balance: balance.status === 'fulfilled' ? balance.value : state.balance,
    streak: streak.status === 'fulfilled' ? streak.value : state.streak,
    balanceError: balance.status === 'rejected',
    loading: false,
  })
}

export function setStreak(streak: StreakView) {
  set({ streak })
}

/** A pack order was just paid: reload the balance and let the wallet show the stars arriving. */
export function announcePurchase(orderId: string, amount: number) {
  if (amount <= 0) {
    void refreshCredits()
    return
  }
  arrivalAfter = reloads
  set({ arrival: { orderId, amount, ready: false, landed: false } })
  void refreshCredits()
}

/** The stars reached the top bar; it counts them in. */
export function landArrival(orderId: string) {
  const { arrival } = state
  if (arrival?.orderId === orderId && !arrival.landed) set({ arrival: { ...arrival, landed: true } })
}

/** The top bar has shown the new balance. */
export function clearArrival(orderId: string) {
  if (state.arrival?.orderId === orderId) set({ arrival: null })
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
  set({ balance: null, streak: null, loading: false, balanceError: false, arrival: null })
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
