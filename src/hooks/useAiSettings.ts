import { useCallback, useEffect, useRef, useState } from 'react'
import {
  aiSettingsService,
  type AiConnectionResult,
  type AiProvider,
  type AiSettings,
  type AiSettingsForm,
} from '../services/aiSettingsService'

function makeForm(provider: AiProvider, settings?: AiSettings): AiSettingsForm {
  return {
    provider,
    model: settings?.model ?? '',
    reviewModel: settings?.reviewModel ?? '',
    secondReviewModel: settings?.secondReviewModel ?? '',
    baseUrl: settings?.baseUrl ?? '',
    region: settings?.region ?? '',
    accountId: settings?.accountId ?? '',
    organization: settings?.organization ?? '',
    project: settings?.project ?? '',
    vision: settings?.vision ?? false,
    apiKey: '',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
  }
}
export function useAiSettings() {
  const [form, setForm] = useState(() => makeForm('anthropic'))
  const [active, setActive] = useState<AiSettings['provider']>('none')
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [secretSavingAvailable, setSecretSavingAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AiConnectionResult | null>(null)
  const sequence = useRef(0)
  const load = useCallback(async (provider?: AiProvider) => {
    const id = ++sequence.current
    setLoading(true)
    setError('')
    setMessage('')
    setResult(null)
    try {
      const data = await aiSettingsService.get(provider)
      if (id !== sequence.current) return
      const selected = provider ?? (data.provider === 'none' ? 'anthropic' : data.provider)
      setActive(data.provider)
      setSecretSavingAvailable(data.secretSavingAvailable)
      setForm(
        makeForm(selected, !provider || data.selectedProvider === provider ? data : undefined)
      )
      setSecrets(data.secrets ?? {})
    } catch (e) {
      if (id === sequence.current)
        setError(e instanceof Error ? e.message : 'Không thể tải cấu hình AI.')
    } finally {
      if (id === sequence.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    const currentSequence = sequence
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
      currentSequence.current++
    }
  }, [load])
  const update = <K extends keyof AiSettingsForm>(key: K, value: AiSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setResult(null)
    setMessage('')
  }
  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await aiSettingsService.save(form)
      setActive(data.provider)
      setSecrets(data.secrets ?? {})
      setForm(makeForm(form.provider, data))
      setMessage('Đã lưu cấu hình AI.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình AI.')
    } finally {
      setBusy(false)
    }
  }
  const test = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    setMessage('')
    try {
      setResult(await aiSettingsService.test(form))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể kiểm tra kết nối.')
    } finally {
      setBusy(false)
    }
  }
  return {
    form,
    active,
    secrets,
    secretSavingAvailable,
    loading,
    busy,
    error,
    message,
    result,
    load,
    update,
    save,
    test,
  }
}
