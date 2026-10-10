import { useEffect, useRef, useState } from 'react'
import { Clock } from '../console/icons'
import { cn } from '../../lib/cn'

interface QuizTimerProps {
  deadlineAt: string
  onExpire: () => void
}

function computeRemaining(deadlineAt: string) {
  const deadline = new Date(deadlineAt).getTime()
  if (Number.isNaN(deadline)) return 0
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000))
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

// Countdown is driven by the backend-authoritative deadlineAt, not a naive
// local interval counter - it recalculates from wall-clock time on every
// tick and whenever the tab regains visibility, so background-tab throttling
// or sleep/wake never drifts the displayed time.
function QuizTimer({ deadlineAt, onExpire }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(deadlineAt))
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    expiredRef.current = false

    const tick = () => {
      const next = computeRemaining(deadlineAt)
      setRemaining(next)
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current()
      }
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [deadlineAt])

  return (
    <div
      role="timer"
      className={cn(
        'flex items-center justify-center gap-2 rounded-[14px] border p-3.5 text-xl font-extrabold tabular-nums',
        remaining <= 60
          ? 'border-danger bg-badge-danger-bg text-danger'
          : 'border-line bg-surface text-text-heading'
      )}
    >
      <Clock size={16} />
      <span>{formatCountdown(remaining)}</span>
    </div>
  )
}

export default QuizTimer
