import { useEffect, useMemo, useState } from 'react'
import { useScheduleResource } from './useScheduleResource'
import {
  getLiveClassesInRange,
  getMyLiveAttendanceSummary,
  type ConsoleLiveClass,
} from '../services/liveClassService'
import { addLocalDays, localDateTimeToInstant, localToday } from '../lib/scheduling'

export function useStudentSchedule() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [nowMs, setNowMs] = useState(() => Date.now())

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

  const classes = useMemo(() => classesResource.data ?? [], [classesResource.data])

  const upcoming7Days = useMemo(() => {
    const today = localToday()
    const endKey = addLocalDays(today, 7)
    const endInstant = Date.parse(localDateTimeToInstant(endKey, 23, 59))
    return classes
      .filter((c) => c.status !== 'CANCELLED' && c.status !== 'COMPLETED')
      .filter((c) => {
        const endMs = Date.parse(c.endTime)
        const startMs = Date.parse(c.startTime)
        return c.status === 'LIVE' || (endMs >= nowMs && startMs <= endInstant)
      })
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  }, [classes, nowMs])

  const pastClasses = useMemo(
    () =>
      classes
        .filter((c) => c.status === 'COMPLETED' || (c.status !== 'LIVE' && Date.parse(c.endTime) < nowMs))
        .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)),
    [classes, nowMs]
  )

  const nextClass = useMemo<ConsoleLiveClass | null>(() => {
    const live = upcoming7Days.find((c) => c.status === 'LIVE')
    return live ?? upcoming7Days[0] ?? null
  }, [upcoming7Days])

  return {
    tab,
    setTab,
    nowMs,
    status: classesResource.status,
    errorMessage: classesResource.errorMessage,
    nextClass,
    upcoming7Days,
    pastClasses,
    attendance: attendanceResource.data,
    attendanceStatus: attendanceResource.status,
    reload: () => {
      classesResource.reload()
      attendanceResource.reload()
    },
  }
}
