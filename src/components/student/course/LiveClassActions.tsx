import { useEffect, useState } from 'react'
import Button from '../../ui/Button'
import { ApiError } from '../../../lib/api'
import { safeExternalUrl } from '../../../lib/scheduling'
import {
  bookLiveClass,
  cancelLiveClassBooking,
  getLiveClassJoinLink,
  getLiveClassRecordings,
  type CourseStudyLiveClass,
} from '../../../services/courseService'

interface LiveClassActionsProps {
  liveClass: CourseStudyLiveClass
  size?: 'sm' | 'md'
  joinLabel?: string
}

function bookingError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 'LIVE_CLASS_FULL') return 'Lớp đã hết chỗ.'
    if (error.code === 'LIVE_CLASS_BOOKING_CLOSED') return 'Lớp đã đóng giữ chỗ.'
    if (error.code === 'COURSE_NOT_PURCHASED') return 'Bạn chưa mua khóa học này.'
  }
  return fallback
}

/**
 * A student's actions on one live class: book or give back a seat before it starts, join with
 * their own link once it opens, replay it after it ends. Only a booked student joins or replays.
 */
function LiveClassActions({ liveClass, size = 'sm', joinLabel = 'Tham gia' }: LiveClassActionsProps) {
  const [booked, setBooked] = useState(Boolean(liveClass.booked))
  const [seatsLeft, setSeatsLeft] = useState(liveClass.seatsLeft ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)

  const [loadedAt] = useState(() => Date.now())
  const notStarted = liveClass.status === 'SCHEDULED' && new Date(liveClass.startTime).getTime() > loadedAt
  const canJoin = booked && liveClass.joinable
  // anyone studying the course replays a class held, booked or not
  const canReplay = liveClass.status === 'COMPLETED'

  // The link is fetched up front so "Tham gia" is a real link: opening a tab after an await gets blocked.
  useEffect(() => {
    if (!canJoin) return
    let alive = true
    getLiveClassJoinLink(liveClass.id)
      .then((url) => alive && setJoinUrl(safeExternalUrl(url)))
      .catch(() => alive && setError('Chưa lấy được đường dẫn vào lớp.'))
    return () => { alive = false }
  }, [canJoin, liveClass.id])

  useEffect(() => {
    if (!canReplay) return
    let alive = true
    getLiveClassRecordings(liveClass.id)
      .then((recordings) => {
        const ready = recordings.find((recording) => recording.status !== 'PROCESSING' && recording.recordingUrl)
        if (alive) setRecordingUrl(safeExternalUrl(ready?.recordingUrl))
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [canReplay, liveClass.id])

  const run = async (action: () => Promise<{ seatsLeft?: number | null }>, nextBooked: boolean, fallback: string) => {
    setBusy(true)
    setError('')
    try {
      const result = await action()
      setBooked(nextBooked)
      setSeatsLeft(result.seatsLeft ?? null)
    } catch (caught) {
      setError(bookingError(caught, fallback))
    } finally {
      setBusy(false)
    }
  }

  const full = !booked && seatsLeft === 0
  const showBook = !booked && notStarted
  const showCancel = booked && notStarted && !liveClass.joinable

  if (!canJoin && !(canReplay && recordingUrl) && !showBook && !showCancel && !error) return null

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {canJoin && (
          joinUrl ? (
            <Button asChild size={size}>
              <a href={joinUrl} target="_blank" rel="noreferrer">{joinLabel}</a>
            </Button>
          ) : (
            <Button size={size} disabled>{joinLabel}</Button>
          )
        )}
        {canReplay && recordingUrl && (
          <Button asChild size={size} appearance="outline">
            <a href={recordingUrl} target="_blank" rel="noreferrer">Xem bản ghi</a>
          </Button>
        )}
        {showBook && (
          <Button
            size={size}
            disabled={busy || full}
            onClick={() => void run(() => bookLiveClass(liveClass.id), true, 'Không giữ được chỗ. Hãy thử lại.')}
          >
            {full ? 'Hết chỗ' : 'Giữ chỗ'}
          </Button>
        )}
        {showCancel && (
          <Button
            size={size}
            appearance="outline"
            disabled={busy}
            onClick={() => void run(() => cancelLiveClassBooking(liveClass.id), false, 'Không hủy được chỗ. Hãy thử lại.')}
          >
            Hủy giữ chỗ
          </Button>
        )}
        {booked && notStarted && <span className="text-sm font-semibold text-text-secondary">Đã giữ chỗ</span>}
        {showBook && !full && seatsLeft !== null && (
          <span className="text-sm text-text-secondary">Còn {seatsLeft} chỗ</span>
        )}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  )
}

export default LiveClassActions
