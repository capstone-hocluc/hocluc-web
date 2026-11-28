import { request } from '../lib/api'

export interface JevSettings {
  baseUrl: string
  model: string
  maskedApiKey: string
  secretSavingAvailable: boolean
  source: string
}
export interface JevInput {
  baseUrl: string
  model: string
  apiKey: string
}
export interface JevResult {
  ok: boolean
  model: string
  latencyMs: number
  error?: string
}
const endpoint = '/api/v1/admin/ai-settings/jev'
export const jevSettingsService = {
  async get() {
    const result = await request<JevSettings>(endpoint, { auth: true })
    if (!result.data) throw new Error('Không thể tải cấu hình gán nhãn.')
    return result.data
  },
  async save(input: JevInput) {
    const result = await request<JevSettings>(endpoint, { auth: true, method: 'PUT', body: input })
    if (!result.data) throw new Error('Không thể lưu cấu hình gán nhãn.')
    return result.data
  },
  async test(input: JevInput) {
    const result = await request<JevResult>(`${endpoint}/test`, {
      auth: true,
      method: 'POST',
      body: input,
      timeoutMs: 200_000,
    })
    if (!result.data) throw new Error('Không thể kiểm tra kết nối.')
    return result.data
  },
}
