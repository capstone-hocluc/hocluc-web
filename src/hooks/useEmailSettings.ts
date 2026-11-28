import { useEffect, useState } from 'react'
import { emailSettingsService, type EmailForm, type EmailSettings, type EmailCheck } from '../services/emailSettingsService'
const empty: EmailForm = { host: '', port: 587, username: '', password: '', tls: true, ssl: false, from: '', fromName: '' }
export function useEmailSettings() {
  const [form, setForm] = useState(empty)
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<EmailCheck | null>(null)
  function apply(data: EmailSettings) { setSettings(data); setForm({ host: data.host ?? '', port: data.port, username: data.username ?? '', password: '', tls: data.tls, ssl: data.ssl, from: data.from ?? '', fromName: data.fromName ?? '' }) }
  useEffect(() => {
    let active = true
    emailSettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải cấu hình.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function update<K extends keyof EmailForm>(key: K, value: EmailForm[K]) { setForm(current => ({ ...current, [key]: value })); setResult(null); setMessage('') }
  async function save() {
    setBusy(true); setError(''); setMessage(''); setResult(null)
    try { apply(await emailSettingsService.save(form)); setMessage('Đã lưu cấu hình.') } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.') } finally { setBusy(false) }
  }
  async function test() {
    setBusy(true); setError(''); setMessage(''); setResult(null)
    try { setResult(await emailSettingsService.test(form)) } catch (e) { setError(e instanceof Error ? e.message : 'Không thể gửi email thử.') } finally { setBusy(false) }
  }
  return { form, settings, loading, busy, error, message, result, update, save, test }
}
