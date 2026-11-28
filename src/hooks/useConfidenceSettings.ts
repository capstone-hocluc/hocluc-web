import { useEffect, useState } from 'react'
import { confidenceSettingsService, type ConfidenceSettings, type ConfidenceValues } from '../services/confidenceSettingsService'
const empty: ConfidenceValues = { reviewBelow: 0, minLabelConfidence: 0, chatSubjectMinConfidence: 0 }
export function useConfidenceSettings() {
  const [form, setForm] = useState(empty)
  const [settings, setSettings] = useState<ConfidenceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  function apply(data: ConfidenceSettings) { setSettings(data); setForm(data.values) }
  useEffect(() => { let active = true; confidenceSettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải cấu hình.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  function update(key: keyof ConfidenceValues, value: number) { setForm(current => ({ ...current, [key]: value })); setMessage('') }
  async function save() { setBusy(true); setError(''); setMessage(''); try { apply(await confidenceSettingsService.save(form)); setMessage('Đã lưu cấu hình.') } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.') } finally { setBusy(false) } }
  return { form, settings, loading, busy, error, message, update, save }
}
