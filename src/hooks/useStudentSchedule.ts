import { useEffect, useMemo, useState } from 'react'
import { useScheduleResource } from './useScheduleResource'
import {
  getLiveClassesInRange,
  getMyLiveAttendanceSummary,
  type ConsoleLiveClass,
} from '../services/liveClassService'
import { bookLiveClass } from '../services/courseService'
import { addLocalDays, localDateTimeToInstant, localToday } from '../lib/scheduling'
import { getErrorMessage } from '../lib/errors'
import { studentRoutes } from '../lib/studentRoutes'

export function useStudentSchedule() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [bookingBusyId, setBookingBusyId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const range = useMemo(() => {
    const today = localToday()
    return {
      from: localDateTimeToInstant(addLocalDays(today, -30), 0, 0),
      to: localDateTimeToInstant(addLocalDays(today, 8), 0, 0),
    }
  }, [])

  const classesResource = useScheduleResource(
    `student-live-classes:${range.from}:${range.to}`,
    () => getLiveClassesInRange(range)
  )
  const attendanceResource = useScheduleResource(
    'student-live-attendance-summary',
    getMyLiveAttendanceSummary
  )

  const classes = classesResource.data ?? []

  const upcoming7Days = useMemo(() => {
    const today = localToday()
    const endKey = addLocalDays(today, 7)
    const endInstant = Date.parse(localDateTimeToInstant(endKey, 23, 59))
    return classes
      .filter((c) => c.status !== 'CANCELLED' && c.status !== 'COMPLETED')
      .filter((c) => {
        const endMs = Date.parse(c.endTime)
        const startMs = Date.parse(c.startTime)
        return endMs >= nowMs && startMs <= endInstant
      })
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  }, [classes, nowMs])

  const pastClasses = useMemo(
    () =>
      classes
        .filter((c) => c.status === 'COMPLETED' || Date.parse(c.endTime) < nowMs)
        .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)),
    [classes, nowMs]
  )

  const nextClass = useMemo<ConsoleLiveClass | null>(() => {
    const futureBooked = classes
      .filter(
        (c) =>
          c.booked &&
          c.status !== 'CANCELLED' &&
          c.status !== 'COMPLETED' &&
          Date.parse(c.endTime) >= nowMs
      )
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    return futureBooked[0] ?? upcoming7Days[0] ?? null
  }, [classes, upcoming7Days, nowMs])

  const nextCanJoin = Boolean(
    nextClass &&
      nextClass.booked &&
      (nextClass.status === 'LIVE' ||
        (Date.parse(nextClass.startTime) - 15 * 60 * 1000 <= nowMs &&
          Date.parse(nextClass.endTime) >= nowMs))
  )

  const handleBook = async (liveClassId: string) => {
    setBookingBusyId(liveClassId)
    setErrorMessage('')
    setNotice('')
    try {
      await bookLiveClass(liveClassId)
      setNotice('Đã giữ chỗ thành công.')
      classesResource.reload()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBookingBusyId(null)
    }
  }

  return {
    tab,
    setTab,
    nowMs,
    status: classesResource.status,
    errorMessage: errorMessage || classesResource.errorMessage,
    notice,
    nextClass,
    nextCanJoin,
    joinUrl: nextClass ? studentRoutes.liveRoom(nextClass.id) : null,
    upcoming7Days,
    pastClasses,
    attendance: attendanceResource.data,
    attendanceStatus: attendanceResource.status,
    bookingBusyId,
    handleBook,
    reload: () => {
      classesResource.reload()
      attendanceResource.reload()
    },
  }
}
