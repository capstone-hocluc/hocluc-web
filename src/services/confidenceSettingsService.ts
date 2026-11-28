import { request } from '../lib/api'
export interface ConfidenceValues { reviewBelow: number; minLabelConfidence: number; chatSubjectMinConfidence: number }
export interface ConfidenceSettings { values: ConfidenceValues; source: 'environment' | 'database' }
const endpoint = '/api/v1/admin/system-settings/ai-confidence'
export const confidenceSettingsService = {
  async get() { const r = await request<ConfidenceSettings>(endpoint, { auth: true }); if (!r.data) throw new Error('Không thể tải cấu hình.'); return r.data },
  async save(values: ConfidenceValues) { const r = await request<ConfidenceSettings>(endpoint, { auth: true, method: 'PUT', body: values }); if (!r.data) throw new Error('Không thể lưu cấu hình.'); return r.data },
}
