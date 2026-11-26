import { useCallback, useEffect, useState } from 'react'
import type { EmbeddedClient, Participant } from '@hocluc/zoom-meeting-sdk'

type Client = typeof EmbeddedClient

export function useClassParticipants(client: Client | null) {
  const [participants, setParticipants] = useState<Participant[]>([])
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
    client.on('user-added', refresh)
    client.on('user-removed', refresh)
    client.on('user-updated', refresh)
    refresh()
    return () => {
      client.off('user-added', refresh)
      client.off('user-removed', refresh)
      client.off('user-updated', refresh)
    }
  }, [client])
  const action = useCallback(async (operation: () => Promise<unknown>) => {
    try {
      setNotice('')
      const result = await operation()
      if (typeof result === 'object' && result !== null) throw result
      return true
    } catch {
      setNotice('Thao tác không thành công.')
      return false
    }
  }, [])
  const waiting = participants.filter((person) => person.isHold)
  const inClass = participants.filter((person) => !person.isHold)
  return { waiting, inClass, currentUserId, notice, locked, action, setLocked }
}
