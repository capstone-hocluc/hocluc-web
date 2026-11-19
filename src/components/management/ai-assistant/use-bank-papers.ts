import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { readSessionCache, writeSessionCache } from '../../../lib/session-cache'
import { getBankSources, type BankSource } from '../../../services/questionBankService'

const POLL_MS = 4000
const CACHE = 'question-bank.sources'
const busy = (source: BankSource) => source.status === 'PENDING' || source.status === 'RUNNING'

/**
 * The papers loaded into the bank, for the workspace's list and the mock exam's paper picker; asked again every few
 * seconds while one is queued or being read. After a reload this tab's last list shows until the server's comes in.
 * A viewer who may not see them gets an empty list and the reason.
 */
export function useBankPapers(enabled: boolean) {
  const [cached] = useState(() => (enabled ? readSessionCache<BankSource[]>(CACHE) : null))
  const [papers, setPapers] = useState<BankSource[]>(cached ?? [])
  const [loading, setLoading] = useState(enabled && cached === null)
  const [error, setError] = useState<string | null>(null)
  // The server has answered once: a paper missing from the list is then really not there (not just not cached).
  const [settled, setSettled] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    getBankSources()
      .then((next) => {
        if (cancelled) return
        setPapers(next)
        setError(null)
        writeSessionCache(CACHE, next)
      })
      .catch((failure: unknown) => {
        if (cancelled) return
        setPapers([])
        setError(getErrorMessage(failure))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
        setSettled(true)
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
  return { papers, loading: enabled && loading, settled: !enabled || settled, error: enabled ? error : null, refresh }
}
