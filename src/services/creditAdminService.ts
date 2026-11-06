import { request } from '../lib/api'
import type { CreditBalance, CreditEntryType, CreditPack, PageResult } from './creditService'

export type CreditBucket = 'BONUS' | 'PAID'

/** A ledger row as staff see it: the bucket split and who made a manual change. */
export interface CreditAdminEntry {
  id: string
  type: CreditEntryType
  bonusDelta: number
  paidDelta: number
  heldDelta: number
  balanceAfter: number
  refType: string | null
  refId: string | null
  expiresAt: string | null
  note: string | null
  actorId: string | null
  createdAt: string
}

export interface CreditPackInput {
  code: string
  name: string
  credits: number
  price: number
  active: boolean
  displayOrder: number
}

export interface CreditAdjustInput {
  amount: number
  bucket: CreditBucket
  reason: string
  /** Generated once per form submit so a retry applies the change once. */
  requestId: string
}

const user = (id: string) => `/api/v1/admin/credits/users/${encodeURIComponent(id)}`

export const creditAdminService = {
  async packs(): Promise<CreditPack[]> {
    const response = await request<CreditPack[]>('/api/v1/admin/credit-packs', { auth: true })
    return response.data ?? []
  },

  async createPack(input: CreditPackInput): Promise<CreditPack> {
    const response = await request<CreditPack>('/api/v1/admin/credit-packs', { method: 'POST', auth: true, body: input })
    if (!response.data) throw new Error('Không tạo được gói.')
    return response.data
  },

  async updatePack(id: string, input: CreditPackInput): Promise<CreditPack> {
    const response = await request<CreditPack>(`/api/v1/admin/credit-packs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      auth: true,
      body: input,
    })
    if (!response.data) throw new Error('Không lưu được gói.')
    return response.data
  },

  async balance(userId: string): Promise<CreditBalance> {
    const response = await request<CreditBalance>(user(userId), { auth: true })
    if (!response.data) throw new Error('Không tải được số dư.')
    return response.data
  },

  async history(userId: string, page = 0, size = 20): Promise<PageResult<CreditAdminEntry>> {
    const response = await request<PageResult<CreditAdminEntry>>(`${user(userId)}/history?page=${page}&size=${size}`, {
      auth: true,
    })
    if (!response.data) throw new Error('Không tải được lịch sử.')
    return response.data
  },

  async adjust(userId: string, input: CreditAdjustInput): Promise<CreditBalance> {
    const response = await request<CreditBalance>(`${user(userId)}/adjust`, { method: 'POST', auth: true, body: input })
    if (!response.data) throw new Error('Không điều chỉnh được.')
    return response.data
  },

  /** One-time stars for students who could ask mentors through a bought course; safe to run again. */
  async grantChatAccessHolders(amount: number, validDays: number): Promise<{ granted: number; alreadyGranted: number }> {
    const response = await request<{ granted: number; alreadyGranted: number }>(
      '/api/v1/admin/credits/migrations/chat-access',
      { method: 'POST', auth: true, body: { amount, validDays }, timeoutMs: 60_000 }
    )
    if (!response.data) throw new Error('Không tặng được.')
    return response.data
  },
}
