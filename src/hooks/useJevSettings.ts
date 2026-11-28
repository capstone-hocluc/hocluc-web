import { useEffect, useState } from 'react'
import { jevSettingsService, type JevInput, type JevResult } from '../services/jevSettingsService'

export function useJevSettings() {
  const [form, setForm] = useState<JevInput>({ baseUrl: '', model: '', apiKey: '' })
  const [masked, setMasked] = useState('')
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<JevResult | null>(null)
  useEffect(() => {
    let cancelled = false
    jevSettingsService
      .get()
      .then((data) => {
        if (cancelled) return
        setForm({ baseUrl: data.baseUrl, model: data.model, apiKey: '' })
        setMasked(data.maskedApiKey)
        setAvailable(data.secretSavingAvailable)
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : 'Không thể tải cấu hình gán nhãn.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  const update = (key: keyof JevInput, value: string) => {
    setForm((old) => ({ ...old, [key]: value }))
    setResult(null)
    setMessage('')
  }
  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await jevSettingsService.save(form)
      setForm({ baseUrl: data.baseUrl, model: data.model, apiKey: '' })
      setMasked(data.maskedApiKey)
      setMessage('Đã lưu cấu hình gán nhãn.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu cấu hình gán nhãn.')
    } finally {
      setBusy(false)
    }
  }
  const test = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    setResult(null)
    try {
      setResult(await jevSettingsService.test(form))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể kiểm tra kết nối.')
    } finally {
      setBusy(false)
    }
  }
  return { form, masked, available, loading, busy, error, message, result, update, save, test }
}
