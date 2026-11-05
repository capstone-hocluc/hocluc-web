import { useEffect, useSyncExternalStore } from 'react'
import { creditService, type CreditBalance, type CreditEntryType, type StreakView } from '../services/creditService'

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
}

let state: CreditState = { balance: null, streak: null, loading: false }
let loaded = false
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
  set({ loading: true })
  try {
    const [balance, streak] = await Promise.all([creditService.balance(), creditService.streak()])
    loaded = true
    set({ balance, streak, loading: false })
  } catch {
    set({ loading: false })
  }
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
