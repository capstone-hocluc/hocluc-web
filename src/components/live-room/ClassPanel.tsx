import { useState } from 'react'
import { Mic, MicOff, UserX } from 'lucide-react'
import type { EmbeddedClient, Participant } from '@hocluc/zoom-meeting-sdk'
import Button from '../console/button'
import ConfirmDialog from '../console/confirm-dialog'
import { IconAction } from '../console/icon-action'
import Notice from '../console/notice'
import ParticipantRow from './ParticipantRow'
import { useClassParticipants } from '../../hooks/useClassParticipants'

type ClassState = ReturnType<typeof useClassParticipants>

function micDetail(person: Participant, self: boolean) {
  const mic = !person.audio ? 'Chưa có âm thanh' : person.muted ? 'Đã tắt mic' : 'Đang bật mic'
  return self ? `Bạn · ${mic}` : mic
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return <h3 className="text-sm font-semibold text-text-primary">{title} <span className="font-normal text-text-tertiary">{count}</span></h3>
}

export default function ClassPanel({ client, state, speaking }: { client: typeof EmbeddedClient; state: ClassState; speaking: ReadonlySet<number> }) {
  const [expelling, setExpelling] = useState<Participant | null>(null)
  const { waiting, inClass, currentUserId, notice, locked, action, setLocked } = state
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {notice && <Notice tone="danger" className="mb-3">{notice}</Notice>}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <SectionTitle title="Phòng chờ" count={waiting.length} />
          <Button size="sm" shape="pill" disabled={!waiting.length} onClick={() => void action(() => client.admitAll())}>Cho tất cả vào</Button>
        </div>
        {waiting.length === 0
          ? <p className="px-2 text-sm text-text-tertiary">Không có ai đang chờ</p>
          : waiting.map((person) => (
            <ParticipantRow key={person.userId} name={person.userName}>
              <Button size="sm" appearance="ghost" onClick={() => void action(() => client.admit(person.userId))}>Cho vào</Button>
            </ParticipantRow>
          ))}
      </section>
      <section className="mt-5 space-y-2 border-t border-card-border pt-4">
        <div className="px-2"><SectionTitle title="Trong lớp" count={inClass.length} /></div>
        <div className="grid grid-cols-2 gap-2 px-2">
          <Button size="sm" appearance="outline" onClick={() => void action(() => client.muteAll(true))}>Tắt mic tất cả</Button>
          <Button size="sm" appearance="outline" onClick={() => void (async () => { if (await action(() => client.lockMeeting(!locked))) setLocked(!locked) })()}>{locked ? 'Mở khóa phòng' : 'Khóa phòng'}</Button>
        </div>
        {inClass.map((person) => {
          const self = person.userId === currentUserId
          return (
            <ParticipantRow key={person.userId} name={person.userName} detail={speaking.has(person.userId) && !person.muted ? (self ? 'Bạn · Đang nói' : 'Đang nói') : micDetail(person, self)} speaking={speaking.has(person.userId) && !person.muted}>
              <IconAction
                label={!person.audio ? 'Chưa kết nối âm thanh' : person.muted ? 'Bật mic' : 'Tắt mic'}
                icon={person.muted || !person.audio ? MicOff : Mic}
                disabled={!person.audio}
                onClick={() => void action(() => self ? client.mute(!person.muted) : client.mute(!person.muted, person.userId))}
              />
              {!self && <IconAction label="Mời ra" icon={UserX} variant="danger" onClick={() => setExpelling(person)} />}
            </ParticipantRow>
          )
        })}
      </section>
      {expelling && <ConfirmDialog title="Mời ra khỏi lớp?" description={expelling.userName} cancelLabel="Quay lại" confirmLabel="Mời ra" variant="danger" onCancel={() => setExpelling(null)} onConfirm={() => { void action(() => client.expel(expelling.userId)); setExpelling(null) }} />}
    </div>
  )
}
