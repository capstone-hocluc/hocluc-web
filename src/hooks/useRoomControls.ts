import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { EmbeddedClient, Participant } from '@hocluc/zoom-meeting-sdk'
import { checkZoomControls, clickZoomControl } from '../components/live-room/zoom-dom'
import type { RoomView } from './useZoomMeeting'

type Client = typeof EmbeddedClient
export function useRoomControls(client: Client | null, root: RefObject<HTMLDivElement | null>, teacher: boolean, onView: (view: RoomView) => void) {
  const [self, setSelf] = useState<Participant | null>(null)
  const [custom, setCustom] = useState(false)
  const [view, setView] = useState<RoomView>(teacher ? 'gallery' : 'speaker')
  const [notice, setNotice] = useState('')
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    if (!client) return
    let done = false
    let poll: ReturnType<typeof setInterval> | undefined
    const stopPolling = () => { clearInterval(poll); poll = undefined }
    const refresh = () => {
      const user = client.getCurrentUser()
      setSelf(user || null)
      if (done || !user || user.isHold || poll) return
      // Zoom renders its toolbar shortly after joining; switch to the HocLuc controls as soon as it is there.
      const started = Date.now()
      poll = setInterval(() => {
        const current = client.getCurrentUser()
        if (current?.isHold) { stopPolling(); return }
        const available = !!root.current && checkZoomControls(root.current, !current?.audio)
        if (!available && Date.now() - started < 8000) return
        stopPolling()
        done = true
        if (!available) console.warn('Zoom controls changed; using the Zoom toolbar for this session.')
        setCustom(available)
        setChecked(true)
      }, 150)
    }
    client.on('user-updated', refresh)
    client.on('user-added', refresh)
    refresh()
    return () => { stopPolling(); client.off('user-updated', refresh); client.off('user-added', refresh) }
  }, [client, root])
  const native = useCallback((control: 'audio' | 'camera' | 'share' | 'stopShare') => {
    if (!root.current || !clickZoomControl(root.current, control)) { setCustom(false); setNotice('Dùng điều khiển Zoom'); console.warn('Zoom control unavailable; using the Zoom toolbar for this session.') }
  }, [root])
  const mic = () => { if (!client || !self) return; if (!self.audio) native('audio'); else void client.mute(!self.muted).then((result) => { if (typeof result === 'object') setNotice(result.reason) }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Không đổi được trạng thái mic')) }
  const toggleView = () => { const next = view === 'gallery' ? 'speaker' : 'gallery'; void client?.setViewType(next).then((result) => { if (typeof result === 'object') setNotice(result.reason); else { setView(next); onView(next) } }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Không đổi được chế độ xem')) }
  // Until the check settles the room shows a loading state, so Zoom's own toolbar never flashes first.
  const pending = Boolean(client) && !checked && !self?.isHold
  const zoomToolbar = checked && !custom
  return { self, custom, pending, zoomToolbar, notice, mic, camera: () => native('camera'), share: () => native(self?.sharerOn ? 'stopShare' : 'share'), view, toggleView }
}
