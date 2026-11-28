import { request } from '../lib/api'
export interface EmailForm { host: string; port: number; username: string; password: string; tls: boolean; ssl: boolean; from: string; fromName: string }
export interface EmailSettings extends Omit<EmailForm, 'password'> { maskedPassword: string; source: 'environment' | 'database'; encryptionAvailable: boolean }
export interface EmailCheck { ok: boolean; message: string }
const endpoint = '/api/v1/admin/system-settings/email'
export const emailSettingsService = {
  async get() { const r = await request<EmailSettings>(endpoint, { auth: true }); if (!r.data) throw new Error('Không thể tải cấu hình.'); return r.data },
  async save(form: EmailForm) { const r = await request<EmailSettings>(endpoint, { auth: true, method: 'PUT', body: form }); if (!r.data) throw new Error('Không thể lưu cấu hình.'); return r.data },
  async test(form: EmailForm) { const r = await request<EmailCheck>(`${endpoint}/test`, { auth: true, method: 'POST', body: form }); if (!r.data) throw new Error('Không thể gửi email thử.'); return r.data },
}
