import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import {
  getExtractionJob,
  isAiDisabledError,
  isTerminalExtractionStatus,
  type ExtractionJob,
} from '../services/aiExtractionService'

const POLL_MS = 2500
const SLOW_POLL_MS = 6000
const SLOW_AFTER_POLLS = 20
const MAX_CONSECUTIVE_FAILURES = 4

/**
 * Follows one AI job: polls it while it is pending or running, and fetches the full preview once when the job
 * the editor handed over (which comes without its result) is already finished. Polling pauses while the tab is hidden
 * and stops on unmount.
 */
export function useExtractionJob(quizId: string | null, initialJob: ExtractionJob | null) {
  const [job, setJob] = useState<ExtractionJob | null>(initialJob)
  const [error, setError] = useState('')
  const [aiDisabled, setAiDisabled] = useState(false)
  const resultRequested = useRef<string | null>(null)

  const jobId = job?.id ?? null
  const running = job !== null && !isTerminalExtractionStatus(job.status)
  const needsResult = job !== null && (job.status === 'DONE' || job.status === 'APPLIED') && !job.result

  useEffect(() => {
    if (!quizId || !jobId) return
    if (!running) {
      if (!needsResult || resultRequested.current === jobId) return
      resultRequested.current = jobId
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let polls = 0
    let failures = 0

    const tick = async () => {
      if (cancelled) return
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(() => void tick(), POLL_MS)
        return
      }
      try {
        const next = await getExtractionJob(quizId, jobId)
        if (cancelled) return
        failures = 0
        setError('')
        setJob(next)
        if (!isTerminalExtractionStatus(next.status)) {
          polls += 1
          timer = setTimeout(() => void tick(), polls > SLOW_AFTER_POLLS ? SLOW_POLL_MS : POLL_MS)
        }
      } catch (cause) {
        if (cancelled) return
        failures += 1
        if (isAiDisabledError(cause)) setAiDisabled(true)
        const definite = cause instanceof ApiError && cause.status >= 400 && cause.status < 500
        if (definite || failures >= MAX_CONSECUTIVE_FAILURES) {
          setError(getErrorMessage(cause))
          return
        }
        timer = setTimeout(() => void tick(), POLL_MS * failures)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [quizId, jobId, running, needsResult])

  return {
    job,
    /** Shows a job the caller just started or changed (a started run, or one that was just applied). */
    track: (next: ExtractionJob | null) => {
      setError('')
      setJob(next)
    },
    /** Set when the last poll failed for good; the job on screen may be out of date. */
    error,
    clearError: () => setError(''),
    aiDisabled,
    markAiDisabled: () => setAiDisabled(true),
  }
}
