import { useState } from 'react'
import type { EmbeddedClient, Participant } from '@hocluc/zoom-meeting-sdk'
import Button from '../console/button'
import ConfirmDialog from '../console/confirm-dialog'
import Notice from '../console/notice'
import { useClassParticipants } from '../../hooks/useClassParticipants'

type ClassState = ReturnType<typeof useClassParticipants>

export default function ClassPanel({ client, state }: { client: typeof EmbeddedClient; state: ClassState }) {
  const [expelling, setExpelling] = useState<Participant | null>(null)
  const { waiting, inClass, currentUserId, notice, locked, action, setLocked } = state
  return (
    <aside className="w-full shrink-0 overflow-y-auto border-l border-card-border bg-card-background p-3 md:w-80" aria-label="Lớp học">
      {notice && <Notice tone="danger" className="mb-3">{notice}</Notice>}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Phòng chờ ({waiting.length})</h2>
          <Button size="sm" appearance="outline" disabled={!waiting.length} onClick={() => void action(() => client.admitAll())}>Cho tất cả vào</Button>
        </div>
        {waiting.map((person) => <div key={person.userId} className="flex items-center justify-between gap-2"><span className="truncate">{person.userName}</span><Button size="sm" appearance="ghost" onClick={() => void action(() => client.admit(person.userId))}>Cho vào</Button></div>)}
      </section>
      <section className="mt-5 space-y-2">
        <h2 className="font-semibold">Trong lớp ({inClass.length})</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" appearance="outline" onClick={() => void action(() => client.muteAll(true))}>Tắt mic tất cả</Button>
          <Button size="sm" appearance="outline" onClick={() => void (async () => { if (await action(() => client.lockMeeting(!locked))) setLocked(!locked) })()}>{locked ? 'Mở khóa phòng' : 'Khóa phòng'}</Button>
        </div>
        {inClass.map((person) => <div key={person.userId} className="flex flex-wrap items-center justify-between gap-1 border-b border-card-border py-2">
          <span className="min-w-0 flex-1 truncate">{person.userName}</span>
          <Button size="sm" appearance="ghost" onClick={() => void action(() => client.mute(!person.muted, person.userId))}>{person.muted ? 'Bật mic' : 'Tắt mic'}</Button>
          {person.userId !== currentUserId && <Button size="sm" variant="danger" appearance="ghost" onClick={() => setExpelling(person)}>Mời ra</Button>}
        </div>)}
      </section>
      {expelling && <ConfirmDialog title="Mời ra khỏi lớp?" description={expelling.userName} cancelLabel="Quay lại" confirmLabel="Mời ra" variant="danger" onCancel={() => setExpelling(null)} onConfirm={() => { void action(() => client.expel(expelling.userId)); setExpelling(null) }} />}
    </aside>
  )
}
