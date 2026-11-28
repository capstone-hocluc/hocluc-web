import { useEffect, useState } from 'react'
import { composeSettingsService, type ComposeSettings, type ComposeValues } from '../services/composeSettingsService'
const empty: ComposeValues = { reuseRatio: 0, maxCellsPerCall: 1, minHardShare: 0, maxRepairAttempts: 0, maxAnswerRewrites: 0, consecutiveFailureLimit: 1, similarityThreshold: 0, parallelism: 1, maxTokensPerJob: 0, mathSandboxUrl: '' }
export function useComposeSettings() {
  const [form, setForm] = useState(empty)
  const [settings, setSettings] = useState<ComposeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  function apply(data: ComposeSettings) { setSettings(data); setForm({ ...data.values, mathSandboxUrl: data.values.mathSandboxUrl ?? '' }) }
  useEffect(() => { let active = true; composeSettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải thông số soạn đề.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  function update<K extends keyof ComposeValues>(key: K, value: ComposeValues[K]) { setForm(current => ({ ...current, [key]: value })); setMessage('') }
  async function save() { setBusy(true); setError(''); setMessage(''); try { apply(await composeSettingsService.save(form)); setMessage('Đã lưu thông số soạn đề.') } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu thông số soạn đề.') } finally { setBusy(false) } }
  return { form, settings, loading, busy, error, message, update, save }
}
