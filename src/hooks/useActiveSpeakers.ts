import { useEffect, useState } from 'react'
import type { EmbeddedClient } from '@hocluc/zoom-meeting-sdk'

// Zoom reports talkers while they speak; a talker who has not been reported for this long has stopped.
const QUIET_AFTER_MS = 1200

/** The user ids that are talking right now, from Zoom's active-speaker events. */
export function useActiveSpeakers(client: typeof EmbeddedClient | null) {
  const [speaking, setSpeaking] = useState<ReadonlySet<number>>(new Set())
  useEffect(() => {
    if (!client) return
    const lastHeard = new Map<number, number>()
    const prune = () => {
      const now = Date.now()
      for (const [userId, time] of lastHeard) if (now - time > QUIET_AFTER_MS) lastHeard.delete(userId)
      setSpeaking((previous) => {
        const next = new Set(lastHeard.keys())
        return next.size === previous.size && [...next].every((userId) => previous.has(userId)) ? previous : next
      })
    }
    const heard = (speakers: { userId: number }[]) => {
      const now = Date.now()
      for (const { userId } of speakers) lastHeard.set(userId, now)
      prune()
    }
    const timer = window.setInterval(prune, 400)
    client.on('active-speaker', heard)
    return () => { window.clearInterval(timer); client.off('active-speaker', heard); setSpeaking(new Set()) }
  }, [client])
  return speaking
}
