import { request } from '../lib/api'

export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'bedrock' | 'cloudflare' | 'compatible'
export interface AiSettings {
  provider: AiProvider | 'none'
  selectedProvider?: AiProvider
  source: 'environment' | 'database'
  secretSavingAvailable: boolean
  model?: string
  reviewModel?: string
  secondReviewModel?: string
  baseUrl?: string
  region?: string
  accountId?: string
  organization?: string
  project?: string
  vision?: boolean
  secrets?: Record<string, string>
}
export interface AiSettingsForm {
  provider: AiProvider
  model: string
  reviewModel: string
  secondReviewModel: string
  baseUrl: string
  region: string
  accountId: string
  organization: string
  project: string
  vision: boolean
  apiKey: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string
}
export interface AiConnectionResult {
  ok: boolean
  model: string
  latencyMs?: number
  error?: string
}
const endpoint = '/api/v1/admin/ai-settings'

export const aiSettingsService = {
  async get(provider?: AiProvider) {
    const response = await request<AiSettings>(
      `${endpoint}${provider ? `?provider=${encodeURIComponent(provider)}` : ''}`,
      { auth: true }
    )
    if (!response.data) throw new Error('Không thể tải cấu hình AI.')
    return response.data
  },
  async save(form: AiSettingsForm) {
    const response = await request<AiSettings>(endpoint, { auth: true, method: 'PUT', body: form })
    if (!response.data) throw new Error('Không thể lưu cấu hình AI.')
    return response.data
  },
  async test(form: AiSettingsForm) {
    const response = await request<AiConnectionResult>(`${endpoint}/test`, {
      auth: true,
      method: 'POST',
      body: form,
      timeoutMs: 330_000,
    })
    if (!response.data) throw new Error('Không thể kiểm tra kết nối.')
    return response.data
  },
}
