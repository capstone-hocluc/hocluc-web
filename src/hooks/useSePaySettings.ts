import { useEffect, useState } from 'react'
import { sePaySettingsService, type SePayCheck, type SePayForm, type SePaySettings } from '../services/sePaySettingsService'

const empty: SePayForm = { enabled: false, bankCode: '', accountNumber: '', accountName: '', webhookSecret: '', webhookMaxAgeSeconds: 300, paymentExpireMinutes: 15 }
export function useSePaySettings() {
  const [form, setForm] = useState(empty)
  const [settings, setSettings] = useState<SePaySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<SePayCheck | null>(null)
  function apply(data: SePaySettings) {
    setSettings(data)
    setForm({ enabled: data.enabled, bankCode: data.bankCode ?? '', accountNumber: data.accountNumber ?? '', accountName: data.accountName ?? '', webhookSecret: '', webhookMaxAgeSeconds: data.webhookMaxAgeSeconds, paymentExpireMinutes: data.paymentExpireMinutes })
  }
  useEffect(() => {
    let active = true
    sePaySettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải cấu hình.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function update<K extends keyof SePayForm>(key: K, value: SePayForm[K]) {
    setForm(current => ({ ...current, [key]: value }))
    setResult(null); setMessage('')
  }
  async function save() {
    setBusy(true); setError(''); setMessage(''); setResult(null)
    try { apply(await sePaySettingsService.save(form)); setMessage('Đã lưu cấu hình.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.') }
    finally { setBusy(false) }
  }
  async function test() {
    setBusy(true); setError(''); setMessage(''); setResult(null)
    try { setResult(await sePaySettingsService.test(form)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể kiểm tra cấu hình.') }
    finally { setBusy(false) }
  }
  return { form, settings, loading, busy, error, message, result, update, save, test }
}
