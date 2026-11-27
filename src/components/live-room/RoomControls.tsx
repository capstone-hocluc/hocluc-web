import { Camera, CameraOff, Headphones, LayoutGrid, LogOut, Maximize, MessageCircle, Mic, MicOff, Minimize, MonitorUp, Users, View } from 'lucide-react'
import Button from '../console/button'
import ControlButton from './ControlButton'
import { useRoomControls } from '../../hooks/useRoomControls'

interface RoomControlsProps {
  controls: ReturnType<typeof useRoomControls>
  teacher: boolean
  panel: 'class' | 'chat' | null
  unread: number
  /** The current user is talking: the mic lights up green. */
  speaking: boolean
  fullscreen: boolean
  onFullscreen: () => void
  onChat: () => void
  onParticipants: () => void
  onLeave: () => void
  onEnd: () => void
}

export default function RoomControls({ controls, teacher, panel, unread, speaking, fullscreen, onFullscreen, onChat, onParticipants, onLeave, onEnd }: RoomControlsProps) {
  const { self } = controls
  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-card-border bg-card-background px-4 py-2 lg:grid lg:grid-cols-[1fr_auto_1fr]">
      <div className="hidden lg:block" />
      <div className="flex flex-wrap items-center justify-center gap-1">
        {controls.custom && (
          <>
            {!self?.audio
              ? <ControlButton label="Kết nối âm thanh" icon={Headphones} onClick={controls.mic} />
              : self.muted
                ? <ControlButton label="Bật mic" icon={MicOff} tone="off" onClick={controls.mic} />
                : <ControlButton label="Tắt mic" icon={Mic} tone={speaking ? 'speaking' : 'default'} onClick={controls.mic} />}
            {self?.bVideoOn
              ? <ControlButton label="Tắt camera" icon={Camera} onClick={controls.camera} />
              : <ControlButton label="Bật camera" icon={CameraOff} tone="off" onClick={controls.camera} />}
            <ControlButton label={self?.sharerOn ? 'Dừng chia sẻ' : 'Chia sẻ'} icon={MonitorUp} tone={self?.sharerOn ? 'active' : 'default'} onClick={controls.share} />
            <span className="mx-2 h-9 w-px bg-card-border" aria-hidden="true" />
          </>
        )}
        <ControlButton label="Trò chuyện" icon={MessageCircle} tone={panel === 'chat' ? 'active' : 'default'} badge={unread} onClick={onChat} />
        {teacher && <ControlButton label="Lớp học" icon={Users} tone={panel === 'class' ? 'active' : 'default'} onClick={onParticipants} />}
        <ControlButton label={controls.view === 'gallery' ? 'Người nói' : 'Bộ sưu tập'} icon={controls.view === 'gallery' ? View : LayoutGrid} onClick={controls.toggleView} />
        <ControlButton label={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'} icon={fullscreen ? Minimize : Maximize} onClick={onFullscreen} />
      </div>
      <div className="flex items-center gap-2 lg:justify-self-end">
        <Button size="sm" shape="pill" variant="danger" appearance="outline" onClick={onLeave}><LogOut size={16} />Rời lớp</Button>
        {teacher && <Button size="sm" shape="pill" variant="danger" onClick={onEnd}>Kết thúc buổi</Button>}
      </div>
    </footer>
  )
}
