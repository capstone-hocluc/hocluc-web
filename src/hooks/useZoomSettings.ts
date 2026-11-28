import { useEffect, useState } from 'react'
import { zoomSettingsService, type ZoomForm, type ZoomSettings, type ZoomCheck } from '../services/zoomSettingsService'
const empty: ZoomForm = { enabled: false, accountId: '', clientId: '', clientSecret: '', webhookSecret: '', sdkKey: '', sdkSecret: '', oauthClientId: '', oauthClientSecret: '', redirectUri: '' }
export function useZoomSettings() {
  const [form, setForm] = useState(empty)
  const [settings, setSettings] = useState<ZoomSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ZoomCheck | null>(null)
  function apply(data: ZoomSettings) { setSettings(data); setForm({ enabled: data.enabled, accountId: data.accountId ?? '', clientId: data.clientId ?? '', clientSecret: '', webhookSecret: '', sdkKey: data.sdkKey ?? '', sdkSecret: '', oauthClientId: data.oauthClientId ?? '', oauthClientSecret: '', redirectUri: data.redirectUri ?? '' }) }
  useEffect(() => { let active = true; zoomSettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải cấu hình.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  function update<K extends keyof ZoomForm>(key: K, value: ZoomForm[K]) { setForm(current => ({ ...current, [key]: value })); setResult(null); setMessage('') }
  async function save() { setBusy(true); setError(''); setMessage(''); setResult(null); try { apply(await zoomSettingsService.save(form)); setMessage('Đã lưu cấu hình.') } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.') } finally { setBusy(false) } }
  async function test() { setBusy(true); setError(''); setMessage(''); setResult(null); try { setResult(await zoomSettingsService.test(form)) } catch (e) { setError(e instanceof Error ? e.message : 'Không thể kiểm tra Zoom.') } finally { setBusy(false) } }
  return { form, settings, loading, busy, error, message, result, update, save, test }
}
