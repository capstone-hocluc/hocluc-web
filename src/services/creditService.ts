import { request } from '../lib/api'
import type { OrderPaymentData } from './orderService'

/** What the student can spend now; `held` is set aside for questions and photos still being answered. */
export interface CreditBalance {
  available: number
  bonus: number
  paid: number
  held: number
}

export type CreditEntryType =
  | 'EARN_STREAK'
  | 'EARN_MILESTONE'
  | 'PURCHASE'
  | 'HOLD'
  | 'CAPTURE'
  | 'RELEASE'
  | 'SPEND'
  | 'ADMIN_ADJUST'
  | 'EXPIRE'
  | 'MIGRATION_GRANT'

export interface CreditEntry {
  id: string
  type: CreditEntryType
  /** Change to the spendable balance: negative when credits were set aside or spent. */
  amount: number
  balanceAfter: number
  refType: string | null
  refId: string | null
  expiresAt: string | null
  note: string | null
  createdAt: string
}

export interface PageResult<T> {
  content: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  isLast: boolean
}

export interface CreditPack {
  id: string
  code: string
  name: string
  credits: number
  price: number
  active: boolean
  displayOrder: number
}

export interface StreakDay {
  date: string
  qualified: boolean
  frozen: boolean
  lessonsCompleted: number
  quizzesPassed: number
}

export interface StreakView {
  current: number
  longest: number
  doneToday: boolean
  freezesAvailable: number
  maxFreezes: number
  freezePrice: number
  today: string
  days: StreakDay[]
}

export type HoldStatus = 'HELD' | 'CAPTURED' | 'RELEASED'

export interface ProblemSolution {
  problem: string | null
  steps: string[] | null
  answer: string | null
  subject: string | null
  readable: boolean | null
}

export interface SolveRequest {
  id: string
  status: 'QUEUED' | 'DONE' | 'FAILED'
  note: string | null
  creditCost: number
  creditStatus: HoldStatus | null
  solution: ProblemSolution | null
  error: string | null
  imageUrl: string | null
  createdAt: string
  finishedAt: string | null
}

function need<T>(data: T | undefined, message: string): T {
  if (data === undefined || data === null) throw new Error(message)
  return data
}

export const creditService = {
  async balance(): Promise<CreditBalance> {
    const response = await request<CreditBalance>('/api/v1/credits/me', { auth: true })
    return need(response.data, 'Không tải được số dư.')
  },

  async history(page = 0, size = 20): Promise<PageResult<CreditEntry>> {
    const response = await request<PageResult<CreditEntry>>(
      `/api/v1/credits/me/history?page=${page}&size=${size}`,
      { auth: true }
    )
    return need(response.data, 'Không tải được lịch sử.')
  },

  async packs(): Promise<CreditPack[]> {
    const response = await request<CreditPack[]>('/api/v1/credits/packs', { auth: true })
    return response.data ?? []
  },

  /** Opens (or reuses) the SePay QR order for one pack; pay it on /orders/{id}/payment. */
  async checkoutPack(packId: string, idempotencyKey: string): Promise<OrderPaymentData> {
    const response = await request<OrderPaymentData>(
      `/api/v1/credits/packs/${encodeURIComponent(packId)}/checkout`,
      { method: 'POST', auth: true, headers: { 'Idempotency-Key': idempotencyKey }, timeoutMs: 20_000 }
    )
    return need(response.data, 'Không tạo được đơn mua.')
  },

  async streak(): Promise<StreakView> {
    const response = await request<StreakView>('/api/v1/credits/streak', { auth: true })
    return need(response.data, 'Không tải được chuỗi học tập.')
  },

  async buyFreeze(requestId: string): Promise<StreakView> {
    const response = await request<StreakView>('/api/v1/credits/streak/freeze', {
      method: 'POST',
      auth: true,
      body: { requestId },
    })
    return need(response.data, 'Không mua được.')
  },

  async solve(image: File, note: string): Promise<SolveRequest> {
    const form = new FormData()
    form.append('image', image)
    if (note.trim()) form.append('note', note.trim())
    const response = await request<SolveRequest>('/api/v1/student/ai/solve', {
      method: 'POST',
      auth: true,
      body: form,
      timeoutMs: 60_000,
    })
    return need(response.data, 'Không gửi được ảnh.')
  },

  async solveRequest(id: string): Promise<SolveRequest> {
    const response = await request<SolveRequest>(`/api/v1/student/ai/requests/${encodeURIComponent(id)}`, {
      auth: true,
    })
    return need(response.data, 'Không tải được kết quả.')
  },

  async solveHistory(page = 0, size = 20): Promise<PageResult<SolveRequest>> {
    const response = await request<PageResult<SolveRequest>>(
      `/api/v1/student/ai/requests?page=${page}&size=${size}`,
      { auth: true }
    )
    return need(response.data, 'Không tải được lịch sử.')
  },
}
