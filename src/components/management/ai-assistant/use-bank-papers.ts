import { useCallback, useEffect, useState } from 'react'
import { getBankSources, type BankSource } from '../../../services/questionBankService'

const POLL_MS = 4000
const busy = (source: BankSource) => source.status === 'PENDING' || source.status === 'RUNNING'

/**
 * The papers loaded into the bank, for the workspace's list; asked again every few seconds while one is queued or
 * being read. A viewer who may not see them gets an empty list.
 */
export function useBankPapers(enabled: boolean) {
  const [papers, setPapers] = useState<BankSource[]>([])
  const [loading, setLoading] = useState(enabled)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    getBankSources()
      .then((next) => {
        if (!cancelled) setPapers(next)
      })
      .catch(() => {
        if (!cancelled) setPapers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, tick])

  const polling = papers.some(busy)
  useEffect(() => {
    if (!polling) return
    const timer = window.setInterval(() => setTick((current) => current + 1), POLL_MS)
    return () => window.clearInterval(timer)
  }, [polling])

  const refresh = useCallback(() => setTick((current) => current + 1), [])
  return { papers, loading: enabled && loading, refresh }
}
