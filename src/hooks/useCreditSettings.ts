import { useEffect, useState } from 'react'
import { creditSettingsService, type CreditValues, type CreditSettings } from '../services/creditSettingsService'
const empty: CreditValues = { mentorQuestionPrice: 0, liveClassPrice: 0, defaultHoldTtlSeconds: 0, holdSweepMs: 300000, holdSweepBatch: 200, mentorReplyWindowSeconds: 0, dailyReward: 0, milestones: {}, monthlyCap: 0, bonusTtlSeconds: 0, freezePrice: 0, maxFreezes: 0, practicePassPercentage: 0, aiSolvePrice: 0, maxImageBytes: 1, aiSolveHoldTtlSeconds: 0 }
export function useCreditSettings() {
  const [form, setForm] = useState(empty)
  const [milestones, setMilestones] = useState('')
  const [settings, setSettings] = useState<CreditSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  function apply(data: CreditSettings) { setSettings(data); setForm(data.values); setMilestones(Object.entries(data.values.milestones).map(([days, reward]) => `${days}:${reward}`).join(', ')) }
  useEffect(() => { let active = true; creditSettingsService.get().then(data => { if (active) apply(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải cấu hình.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  function update(key: Exclude<keyof CreditValues, 'milestones'>, value: number) { setForm(current => ({ ...current, [key]: value })); setMessage('') }
  async function save() {
    setBusy(true); setError(''); setMessage('')
    try {
      const parsed: Record<string, number> = {}
      if (milestones.trim()) for (const item of milestones.split(',')) {
        const match = item.trim().match(/^(\d+)\s*:\s*(\d+)$/)
        if (!match || Number(match[1]) < 1 || Number(match[1]) > 3650 || Number(match[2]) > 1000000 || Object.hasOwn(parsed, match[1])) throw new Error('Mốc thưởng phải có dạng ngày:sao, cách nhau bằng dấu phẩy.')
        parsed[match[1]] = Number(match[2])
      }
      apply(await creditSettingsService.save({ ...form, milestones: parsed })); setMessage('Đã lưu cấu hình.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.') } finally { setBusy(false) }
  }
  return { form, milestones, setMilestones, settings, loading, busy, error, message, update, save }
}
