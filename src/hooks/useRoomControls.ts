import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { EmbeddedClient, Participant } from '@hocluc/zoom-meeting-sdk'
import { checkZoomControls, clickZoomControl } from '../components/live-room/zoom-dom'

type Client = typeof EmbeddedClient
export function useRoomControls(client: Client | null, root: RefObject<HTMLDivElement | null>, teacher: boolean) {
  const [self, setSelf] = useState<Participant | null>(null)
  const [custom, setCustom] = useState(false)
  const [view, setView] = useState<'gallery' | 'speaker'>(teacher ? 'gallery' : 'speaker')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!client) return
    const refresh = () => setSelf(client.getCurrentUser() || null)
    client.on('user-updated', refresh)
    refresh()
    const timer = setTimeout(() => {
      const available = !!root.current && checkZoomControls(root.current, !client.getCurrentUser()?.audio)
      if (!available) console.warn('Zoom controls changed; using the Zoom toolbar for this session.')
      setCustom(available)
    }, 1500)
    return () => { clearTimeout(timer); client.off('user-updated', refresh) }
  }, [client, root])
  const native = useCallback((control: 'audio' | 'camera' | 'share' | 'stopShare') => {
    if (!root.current || !clickZoomControl(root.current, control)) { setCustom(false); setNotice('Dùng điều khiển Zoom'); console.warn('Zoom control unavailable; using the Zoom toolbar for this session.') }
  }, [root])
  const mic = () => { if (!client || !self) return; if (!self.audio) native('audio'); else void client.mute(!self.muted).then((result) => { if (typeof result === 'object') setNotice(result.reason) }) }
  const toggleView = () => { const next = view === 'gallery' ? 'speaker' : 'gallery'; void client?.setViewType(next).then((result) => { if (typeof result === 'object') setNotice(result.reason); else setView(next) }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Không đổi được chế độ xem')) }
  return { self, custom, notice, mic, camera: () => native('camera'), share: () => native(self?.sharerOn ? 'stopShare' : 'share'), view, toggleView }
}
