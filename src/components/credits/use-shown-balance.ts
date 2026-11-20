import { useEffect, useState } from 'react'
import { clearArrival, landArrival, useCredits } from '../../lib/credits'
import { prefersReducedMotion } from '../../lib/lottie'

const COUNT_MS = 900
/** How long the "+N" stays over the balance. */
const GAIN_MS = 1800
/** A held pack always reaches the bar, even when nothing plays it in (the wallet was left, the effect broke). */
const LAND_BY_MS = 6000

/**
 * The balance the top bar shows. A pack just bought is held back while the wallet shows it arriving; once it lands
 * the number counts up to the real balance and a "+N" floats over it.
 */
export function useShownBalance(available: number | null) {
  const { arrival } = useCredits()
  const [counting, setCounting] = useState<number | null>(null)
  const [gain, setGain] = useState<{ orderId: string; amount: number } | null>(null)

  const waiting = arrival && !arrival.landed ? arrival.orderId : null
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(() => landArrival(waiting), LAND_BY_MS)
    return () => window.clearTimeout(timer)
  }, [waiting])

  const landed = arrival?.landed && available !== null ? arrival : null
  useEffect(() => {
    if (!landed || available === null) return
    const { orderId, amount } = landed
    if (!landed.ready || prefersReducedMotion()) {
      clearArrival(orderId)
      return
    }
    const from = Math.max(0, available - amount)
    let start = 0
    let frame = requestAnimationFrame(function step(now) {
      if (!start) {
        start = now
        setGain({ orderId, amount })
      }
      const t = Math.min(1, (now - start) / COUNT_MS)
      setCounting(Math.round(from + (available - from) * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(step)
      else {
        setCounting(null)
        clearArrival(orderId)
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      setCounting(null)
    }
  }, [landed, available])

  useEffect(() => {
    if (!gain) return
    const timer = window.setTimeout(() => setGain(null), GAIN_MS)
    return () => window.clearTimeout(timer)
  }, [gain])

  const held = arrival?.ready && !arrival.landed ? arrival.amount : 0
  const value = counting ?? (available === null ? null : Math.max(0, available - held))
  return { value, gain, counting: counting !== null }
}
