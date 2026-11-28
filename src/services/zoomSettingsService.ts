import { request } from '../lib/api'
export interface ZoomForm { enabled: boolean; accountId: string; clientId: string; clientSecret: string; webhookSecret: string; sdkKey: string; sdkSecret: string; oauthClientId: string; oauthClientSecret: string; redirectUri: string }
export interface ZoomSettings extends Omit<ZoomForm, 'clientSecret' | 'webhookSecret' | 'sdkSecret' | 'oauthClientSecret'> { secrets: Record<string, string>; source: 'environment' | 'database'; encryptionAvailable: boolean }
export interface ZoomCheck { status: 'valid' | 'invalid' | 'unknown'; message: string }
const endpoint = '/api/v1/admin/system-settings/zoom'
export const zoomSettingsService = {
  async get() { const r = await request<ZoomSettings>(endpoint, { auth: true }); if (!r.data) throw new Error('Không thể tải cấu hình.'); return r.data },
  async save(form: ZoomForm) { const r = await request<ZoomSettings>(endpoint, { auth: true, method: 'PUT', body: form }); if (!r.data) throw new Error('Không thể lưu cấu hình.'); return r.data },
  async test(form: ZoomForm) { const r = await request<ZoomCheck>(`${endpoint}/test`, { auth: true, method: 'POST', body: form }); if (!r.data) throw new Error('Không thể kiểm tra Zoom.'); return r.data },
}
