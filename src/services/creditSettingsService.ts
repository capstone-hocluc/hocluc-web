import { request } from '../lib/api'
export interface CreditValues {
  mentorQuestionPrice: number; liveClassPrice: number; defaultHoldTtlSeconds: number; holdSweepMs: number; holdSweepBatch: number; mentorReplyWindowSeconds: number
  dailyReward: number; milestones: Record<string, number>; monthlyCap: number; bonusTtlSeconds: number; freezePrice: number; maxFreezes: number; practicePassPercentage: number
  aiSolvePrice: number; maxImageBytes: number; aiSolveHoldTtlSeconds: number
}
export interface CreditSettings { values: CreditValues; source: 'environment' | 'database' }
const endpoint = '/api/v1/admin/system-settings/credits'
export const creditSettingsService = {
  async get() { const r = await request<CreditSettings>(endpoint, { auth: true }); if (!r.data) throw new Error('Không thể tải cấu hình.'); return r.data },
  async save(values: CreditValues) { const r = await request<CreditSettings>(endpoint, { auth: true, method: 'PUT', body: values }); if (!r.data) throw new Error('Không thể lưu cấu hình.'); return r.data },
}
