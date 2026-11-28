import { request } from '../lib/api'

export interface SePayForm {
  enabled: boolean
  bankCode: string
  accountNumber: string
  accountName: string
  webhookSecret: string
  webhookMaxAgeSeconds: number
  paymentExpireMinutes: number
}
export interface SePaySettings extends Omit<SePayForm, 'webhookSecret'> {
  maskedWebhookSecret: string
  source: 'environment' | 'database'
  encryptionAvailable: boolean
}
export interface SePayCheck { ok: boolean; message: string }
const endpoint = '/api/v1/admin/system-settings/sepay'
export const sePaySettingsService = {
  async get() {
    const result = await request<SePaySettings>(endpoint, { auth: true })
    if (!result.data) throw new Error('Không thể tải cấu hình.')
    return result.data
  },
  async save(form: SePayForm) {
    const result = await request<SePaySettings>(endpoint, { auth: true, method: 'PUT', body: form })
    if (!result.data) throw new Error('Không thể lưu cấu hình.')
    return result.data
  },
  async test(form: SePayForm) {
    const result = await request<SePayCheck>(`${endpoint}/test`, { auth: true, method: 'POST', body: form })
    if (!result.data) throw new Error('Không thể kiểm tra cấu hình.')
    return result.data
  },
}
