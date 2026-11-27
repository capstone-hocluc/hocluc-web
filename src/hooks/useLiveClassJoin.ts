import { useState } from 'react'
import { ApiError } from '../lib/api'
import { CREDIT_UNIT, refreshCredits } from '../lib/credits'
import { getErrorMessage } from '../lib/errors'
import { dateKeyOfInstant, formatClockFromInstant, formatDdMm } from '../lib/liveScheduleFormat'
import { localToday } from '../lib/scheduling'
import { studentRoutes } from '../lib/studentRoutes'
import { joinLiveClass } from '../services/liveClassService'

export interface JoinableLiveClass {
  id: string
  title: string
  startTime: string
  status: string
  joinable?: boolean
  joinPrice?: number
  admitted?: boolean
}

function navigateStudentPath(path: string) {
  window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path } }))
}

function joinErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'COURSE_NOT_PURCHASED') return 'Bạn chưa mua khóa học này.'
    if (error.code === 'LIVE_CLASS_NOT_STARTED') return 'Buổi học chưa bắt đầu.'
    if (error.code === 'LIVE_CLASS_NOT_FOUND') return 'Không tìm thấy buổi học.'
  }
  return getErrorMessage(error)
}

export function useLiveClassJoin(liveClass: JoinableLiveClass, onJoined?: () => void) {
  const [joinedId, setJoinedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [insufficientOpen, setInsufficientOpen] = useState(false)
  const [error, setError] = useState('')

  const admitted = Boolean(liveClass.admitted) || joinedId === liveClass.id

  const isClosed = liveClass.status === 'COMPLETED' || liveClass.status === 'CANCELLED'
  const isLive = !isClosed && liveClass.status === 'LIVE' && liveClass.joinable !== false
  const isUpcoming = !isClosed && !isLive
  const price = Math.max(0, liveClass.joinPrice ?? 0)

  const label = (() => {
    if (isClosed) return null
    if (isUpcoming) {
      const dateKey = dateKeyOfInstant(liveClass.startTime)
      const clock = formatClockFromInstant(liveClass.startTime)
      return dateKey === localToday()
        ? `Bắt đầu ${clock}`
        : `Bắt đầu ${clock} · ${formatDdMm(dateKey)}`
    }
    if (!admitted && price > 0) return `Tham gia · ${price} ${CREDIT_UNIT}`
    return 'Tham gia'
  })()

  const executeJoin = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await joinLiveClass(liveClass.id)
      setJoinedId(liveClass.id)
      setConfirmOpen(false)
      void refreshCredits()
      onJoined?.()
      navigateStudentPath(studentRoutes.liveRoom(liveClass.id))
    } catch (caught) {
      setConfirmOpen(false)
      if (caught instanceof ApiError && caught.code === 'INSUFFICIENT_CREDITS') {
        setInsufficientOpen(true)
      } else {
        setError(joinErrorMessage(caught))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleJoinClick = () => {
    if (!isLive || busy) return
    setError('')
    if (admitted) {
      navigateStudentPath(studentRoutes.liveRoom(liveClass.id))
      return
    }
    if (price > 0) {
      setConfirmOpen(true)
      return
    }
    void executeJoin()
  }

  const goToBuyCredits = () => {
    setInsufficientOpen(false)
    navigateStudentPath(studentRoutes.wallet())
  }

  return {
    visible: !isClosed && label !== null,
    isLive,
    isUpcoming,
    admitted,
    price,
    label: label ?? '',
    busy,
    error,
    confirmOpen,
    setConfirmOpen,
    insufficientOpen,
    setInsufficientOpen,
    handleJoinClick,
    executeJoin,
    goToBuyCredits,
  }
}
