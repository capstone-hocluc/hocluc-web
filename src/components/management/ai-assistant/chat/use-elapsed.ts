import { useEffect, useState } from 'react'

export interface StepTiming {
  startedAt: number
  completedAt?: number
}

/**
 * How long a step took, in milliseconds: fixed once it finished, counting up each second while it goes on.
 * Undefined for a step not seen starting, or one that stopped without a recorded end.
 */
export function useElapsed(timing: StepTiming | undefined, running: boolean) {
  const open = timing !== undefined && timing.completedAt === undefined && running
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!open) return
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const every = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [open])
  if (!timing) return undefined
  if (timing.completedAt !== undefined) return Math.max(0, timing.completedAt - timing.startedAt)
  if (!open || now === null) return undefined
  return Math.max(0, now - timing.startedAt)
}
