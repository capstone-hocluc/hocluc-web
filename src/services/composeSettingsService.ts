import { request } from '../lib/api'
export interface ComposeValues { reuseRatio: number; maxCellsPerCall: number; minHardShare: number; maxRepairAttempts: number; maxAnswerRewrites: number; consecutiveFailureLimit: number; similarityThreshold: number; parallelism: number; maxTokensPerJob: number; mathSandboxUrl: string }
export interface ComposeSettings { values: ComposeValues; source: 'environment' | 'database' }
const endpoint = '/api/v1/admin/ai-settings/compose'
export const composeSettingsService = {
  async get() { const r = await request<ComposeSettings>(endpoint, { auth: true }); if (!r.data) throw new Error('Không thể tải thông số soạn đề.'); return r.data },
  async save(values: ComposeValues) { const r = await request<ComposeSettings>(endpoint, { auth: true, method: 'PUT', body: values }); if (!r.data) throw new Error('Không thể lưu thông số soạn đề.'); return r.data },
}
