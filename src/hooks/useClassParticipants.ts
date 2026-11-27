import { useCallback, useEffect, useState } from 'react'
import type { EmbeddedClient, Participant, ParticipantPropertiesPayload } from '@hocluc/zoom-meeting-sdk'

type Client = typeof EmbeddedClient

export function useClassParticipants(client: Client | null) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [held, setHeld] = useState<Map<number, { userId: number; userName: string }>>(new Map())
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const [currentUserId, setCurrentUserId] = useState<number | undefined>()
  useEffect(() => {
    if (!client) return
    const refresh = () => {
      try {
        setParticipants(client.getAttendeeslist())
        setCurrentUserId(client.getCurrentUser()?.userId)
      } catch { setNotice('Không tải được danh sách lớp.') }
    }
    const update = (events: ParticipantPropertiesPayload[]) => {
      setHeld((previous) => {
        const next = new Map(previous)
        for (const person of events) {
          if (person.bHold) next.set(person.userId, { userId: person.userId, userName: person.displayName || next.get(person.userId)?.userName || 'Học viên' })
          else if (person.bHold === false || person.source === 'on hold') next.delete(person.userId)
        }
        return next
      })
      refresh()
    }
    const remove = (events: ParticipantPropertiesPayload[]) => {
      setHeld((previous) => { const next = new Map(previous); for (const person of events) next.delete(person.userId); return next })
      refresh()
    }
    client.on('user-added', update)
    client.on('user-removed', remove)
    client.on('user-updated', update)
    refresh()
    return () => {
      client.off('user-added', update)
      client.off('user-removed', remove)
      client.off('user-updated', update)
    }
  }, [client])
  const action = useCallback(async (operation: () => Promise<unknown>) => {
    try {
      setNotice('')
      const result = await operation()
      if (typeof result === 'object' && result !== null) throw result
      return true
    } catch (error) {
      const reason = typeof error === 'object' && error !== null && 'reason' in error ? String(error.reason) : error instanceof Error ? error.message : ''
      setNotice(reason || 'Thao tác không thành công.')
      return false
    }
  }, [])
  const waiting = [...new Map([...participants.filter((person) => person.isHold), ...held.values()].map((person) => [person.userId, person])).values()]
  const inClass = [...new Map(participants.filter((person) => !person.isHold && !held.has(person.userId)).map((person) => [person.userId, person])).values()]
  return { waiting, inClass, currentUserId, notice, locked, action, setLocked }
}
