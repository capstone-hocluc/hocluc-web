import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../console/button'
import Notice from '../console/notice'
import ConsoleDialog from '../console/dialog'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { chatError, chatIdentity } from '../../hooks/useChatWorkspace'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'
import { chatService } from '../../services/chatService'
import type { MentorWorkingHours } from '../../types/chat'

type Interval = MentorWorkingHours['intervals'][number]
export default function MentorHoursEditor({ onClose }: { isConsole?: boolean; onClose: () => void }) {
  const { profile } = useCurrentUser()
  const [intervals, setIntervals] = useState<Interval[]>([])
  const [baseline, setBaseline] = useState('[]')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const mounted = useRef(true)
  const loadEpoch = useRef(0)
  const scope = useRef(chatIdentity())
  const guard = useUnsavedActionGuard(JSON.stringify(intervals) !== baseline, busy)
  const field = 'min-w-0 w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-text-primary focus:outline-2 focus:outline-primary'
  const mentorId = profile?.id
  const load = useCallback(() => {
    if (!mentorId) return
    const epoch = ++loadEpoch.current
    const valid = () => mounted.current && scope.current === chatIdentity() && epoch === loadEpoch.current
    void chatService.getWorkingHours(mentorId).then(result => {
      if (!valid()) return
      const rows = result.data?.intervals ?? []
      setIntervals(rows); setBaseline(JSON.stringify(rows)); setLoadFailed(false)
    }).catch(cause => { if (valid()) { setError(chatError(cause)); setLoadFailed(true) } }).finally(() => { if (valid()) setLoading(false) })
  }, [mentorId])
  useEffect(() => {
    mounted.current = true
    // Loading starts before the first render; retry re-enables it in the click handler.
    if (mentorId) load()
    return () => { mounted.current = false }
  }, [load, mentorId])
  function retry() { setError(''); setSaved(false); setLoadFailed(false); setLoading(true); load() }
  async function save() {
    if (!mentorId || busy || loading || loadFailed) return
    const clock = /^([01]\d|2[0-3]):[0-5]\d$/
    if (intervals.some(row => !Number.isInteger(row.dayOfWeek) || row.dayOfWeek < 1 || row.dayOfWeek > 7 || !clock.test(row.startLocal) || !(clock.test(row.endLocal) || row.endLocal === '24:00'))) { setError('Giờ hỗ trợ không hợp lệ. 24:00 chỉ dùng cho giờ kết thúc cuối ngày.'); return }
    if (intervals.some(row => !row.startLocal || !row.endLocal || row.startLocal >= row.endLocal)) { setError('Giờ kết thúc phải sau giờ bắt đầu. Lịch qua nửa đêm cần tách thành hai dòng.'); return }
    const sorted = [...intervals].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startLocal.localeCompare(b.startLocal))
    if (sorted.some((row, index) => index > 0 && row.dayOfWeek === sorted[index - 1].dayOfWeek && row.startLocal < sorted[index - 1].endLocal)) { setError('Các khoảng giờ trong cùng ngày không được chồng lấn.'); return }
    setBusy(true); setError(''); setSaved(false)
    try {
      const result = await chatService.updateWorkingHours(mentorId, { timezone: 'Asia/Ho_Chi_Minh', intervals })
      if (!mounted.current || scope.current !== chatIdentity()) return
      if (!result.data) throw new Error('Máy chủ chưa xác nhận lịch hỗ trợ.')
      setIntervals(result.data.intervals); setBaseline(JSON.stringify(result.data.intervals)); setSaved(true)
    } catch (cause) { if (mounted.current && scope.current === chatIdentity()) setError(chatError(cause)) }
    finally { if (mounted.current && scope.current === chatIdentity()) setBusy(false) }
  }
  function update(index: number, patch: Partial<Interval>) { setSaved(false); setIntervals(previous => previous.map((row, current) => current === index ? { ...row, ...patch } : row)) }
  return <ConsoleDialog open title="Giờ hỗ trợ Mentor" onClose={() => guard.requestAction(onClose)} dismissable={!busy}><div className="space-y-4"><p className="text-sm text-text-tertiary">Giờ Việt Nam · Ngoài giờ học sinh vẫn có thể gửi yêu cầu.</p>{error && <Notice tone="danger">{error}</Notice>}{saved && <Notice tone="info">Đã lưu giờ hỗ trợ.</Notice>}{loading ? <p>Đang tải lịch…</p> : loadFailed ? <div className="space-y-3"><p className="text-sm text-text-tertiary">Chưa tải được lịch hiện tại nên thao tác lưu đang bị khóa để tránh ghi đè lịch cũ.</p><Button appearance="outline" onClick={retry}>Thử lại</Button></div> : <><div className="max-h-80 space-y-3 overflow-y-auto">{intervals.map((row, index) => <div key={index} className="grid grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"><select aria-label={`Ngày hỗ trợ ${index + 1}`} className={field} disabled={busy} value={row.dayOfWeek} onChange={event => update(index, { dayOfWeek: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map(day => <option key={day} value={day}>{day === 7 ? 'CN' : `Thứ ${day + 1}`}</option>)}</select><input aria-label={`Bắt đầu ${index + 1}`} type="time" className={field} disabled={busy} value={row.startLocal} onChange={event => update(index, { startLocal: event.target.value })} /><div className="min-w-0 space-y-1"><input aria-label={`Kết thúc ${index + 1}`} type={row.endLocal === '24:00' ? 'text' : 'time'} readOnly={row.endLocal === '24:00'} className={field} disabled={busy} value={row.endLocal} onChange={event => update(index, { endLocal: event.target.value })} /><label className="flex items-start gap-1 text-xs text-text-tertiary"><input aria-label={`Kết thúc cuối ngày ${index + 1}`} type="checkbox" disabled={busy} checked={row.endLocal === '24:00'} onChange={event => update(index, { endLocal: event.target.checked ? '24:00' : '' })} /><span>24:00 — cuối ngày</span></label></div><Button appearance="ghost" size="sm" disabled={busy} onClick={() => setIntervals(previous => previous.filter((_, current) => current !== index))}>Bỏ</Button></div>)}{!intervals.length && <p className="text-sm text-text-tertiary">Chưa thiết lập lịch hỗ trợ.</p>}</div><Button appearance="outline" disabled={busy} onClick={() => setIntervals(previous => [...previous, { dayOfWeek: 1, startLocal: '09:00', endLocal: '17:00' }])}>Thêm khoảng giờ</Button></>}<div className="flex justify-end gap-3"><Button appearance="outline" disabled={busy} onClick={() => guard.requestAction(onClose)}>Đóng</Button><Button disabled={busy || loading || loadFailed} onClick={() => void save()}>{busy ? 'Đang lưu…' : 'Lưu lịch'}</Button></div>{guard.hasPendingAction && <Notice tone="warning"><span>Lịch chưa lưu.</span><Button size="sm" appearance="outline" onClick={guard.cancelDiscard}>Tiếp tục sửa</Button><Button size="sm" onClick={guard.confirmDiscard}>Bỏ thay đổi</Button></Notice>}</div></ConsoleDialog>
}
