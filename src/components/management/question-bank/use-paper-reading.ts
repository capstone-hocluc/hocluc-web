import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { BankStreamUnavailable, followBankReading } from '../../../services/bankReadingStream'
import { getBankReading, type BankIngestStatus, type BankReading } from '../../../services/questionBankService'
import { applyEvent, initialReading, type LiveReading } from './live-reading'

const POLL_MS = 4000
/** How soon after a part comes back the cleaned reading is asked for again. */
const REFRESH_MS = 800

export type ReadingStreamState = 'connecting' | 'open' | 'polling' | 'closed'

/** The reading as stored (pages, bands, finished questions), asked again when the stream says something changed. */
function useStoredReading(sourceId: string) {
  const [reading, setReading] = useState<BankReading | null>(null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    getBankReading(sourceId)
      .then((next) => {
        if (!cancelled) {
          setReading(next)
          setError('')
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof ApiError && reason.status === 403
              ? 'Bạn không có quyền xem đề này.'
              : getErrorMessage(reason)
          )
      })
    return () => {
      cancelled = true
    }
  }, [sourceId, tick])
  return { reading, error, refresh: () => setTick((t) => t + 1) }
}

/**
 * One paper's reading: what is stored of it, and what the AI is doing now, followed as server-sent events (or asked
 * every few seconds when the stream cannot be opened). `view` is the live state, with the stored status while polling.
 */
export function usePaperReading(sourceId: string, sourceStatus: BankIngestStatus) {
  const stored = useStoredReading(sourceId)
  const [live, setLive] = useState<LiveReading>(() => initialReading(sourceStatus))
  const [streaming, setStreaming] = useState<ReadingStreamState>('connecting')
  const refreshTimer = useRef<number | undefined>(undefined)
  const refreshStored = stored.refresh
  const refreshRef = useRef(refreshStored)
  useEffect(() => {
    refreshRef.current = refreshStored
  })

  useEffect(() => {
    const controller = new AbortController()
    const soon = () => {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = window.setTimeout(() => refreshRef.current(), REFRESH_MS)
    }
    followBankReading(
      sourceId,
      (event) => {
        setStreaming('open')
        setLive((state) => applyEvent(state, event))
        // a part read, or a check done: the stored reading has new questions or new review results
        if (event.type === 'end' || event.type === 'review' || (event.type === 'part' && event.data.status === 'DONE')) soon()
      },
      controller.signal
    )
      .then(() => setStreaming((current) => (current === 'polling' ? current : 'closed')))
      .catch((error) => {
        if (error instanceof BankStreamUnavailable) setStreaming('polling')
      })
    return () => {
      controller.abort()
      window.clearTimeout(refreshTimer.current)
    }
  }, [sourceId])

  // without the stream: asked now and then while the paper is busy
  const busy = sourceStatus === 'PENDING' || sourceStatus === 'RUNNING'
  useEffect(() => {
    if (streaming !== 'polling' || !busy) return
    const timer = window.setInterval(() => refreshRef.current(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [streaming, busy])

  const reading = stored.reading
  const view: LiveReading =
    streaming === 'polling' && reading
      ? { ...live, status: reading.status, stage: reading.stage, progress: reading.progress, error: reading.error }
      : live

  return { reading, error: stored.error, view, streaming, busy }
}
