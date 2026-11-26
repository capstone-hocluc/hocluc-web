import { Camera, CameraOff, LayoutGrid, LogOut, MessageCircle, Mic, MicOff, MonitorUp, Users, View } from 'lucide-react'
import Button from '../console/button'
import { useRoomControls } from '../../hooks/useRoomControls'

export default function RoomControls({ controls, teacher, unread, onChat, onParticipants, onLeave, onEnd }: { controls: ReturnType<typeof useRoomControls>; teacher: boolean; unread: number; onChat: () => void; onParticipants: () => void; onLeave: () => void; onEnd: () => void }) {
  const { self } = controls
  return <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-card-border bg-card-background p-2">
    {controls.custom && <><Button size="sm" appearance="ghost" onClick={controls.mic}>{self?.muted || !self?.audio ? <MicOff size={18} /> : <Mic size={18} />}{self?.audio ? self.muted ? 'Bật mic' : 'Tắt mic' : 'Kết nối âm thanh'}</Button><Button size="sm" appearance="ghost" onClick={controls.camera}>{self?.bVideoOn ? <Camera size={18} /> : <CameraOff size={18} />}{self?.bVideoOn ? 'Tắt camera' : 'Bật camera'}</Button><Button size="sm" appearance="ghost" onClick={controls.share}><MonitorUp size={18} />{self?.sharerOn ? 'Dừng chia sẻ' : 'Chia sẻ'}</Button></>}
    <Button size="sm" appearance="ghost" onClick={onChat}><MessageCircle size={18} />Trò chuyện{unread > 0 && ` (${unread})`}</Button>
    {teacher && <Button size="sm" appearance="ghost" onClick={onParticipants}><Users size={18} />Lớp học</Button>}
    <Button size="sm" appearance="ghost" onClick={controls.toggleView}>{controls.view === 'gallery' ? <View size={18} /> : <LayoutGrid size={18} />}{controls.view === 'gallery' ? 'Người nói' : 'Bộ sưu tập'}</Button>
    <Button size="sm" appearance="outline" onClick={onLeave}><LogOut size={18} />Rời lớp</Button>{teacher && <Button size="sm" variant="danger" onClick={onEnd}>Kết thúc buổi</Button>}
  </div>
}
