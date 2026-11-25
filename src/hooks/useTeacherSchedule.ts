import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { useScheduleResource } from './useScheduleResource'
import {
  endLiveClass,
  getLiveClassesInRange,
  startLiveClass,
  type ConsoleLiveClass,
} from '../services/liveClassService'
import { addLocalDays, localDateTimeToInstant, localToday, startOfLocalWeek } from '../lib/scheduling'
import { getErrorMessage } from '../lib/errors'

export interface TeacherTodoItem {
  kind: 'attendance' | 'content'
  liveClass: ConsoleLiveClass
}

export function useTeacherSchedule() {
  const { profile } = useCurrentUser()
  const [anchorDate, setAnchorDate] = useState(localToday)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [selectedClass, setSelectedClass] = useState<ConsoleLiveClass | null>(null)
  const [contentTarget, setContentTarget] = useState<ConsoleLiveClass | null>(null)
  const [attendanceTarget, setAttendanceTarget] = useState<ConsoleLiveClass | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const weekStart = startOfLocalWeek(anchorDate)
  const weekRange = useMemo(
    () => ({
      from: localDateTimeToInstant(weekStart, 0, 0),
      to: localDateTimeToInstant(addLocalDays(weekStart, 7), 0, 0),
      includeCancelled: false,
    }),
    [weekStart]
  )

  const upcomingWindow = useMemo(() => {
    const today = localToday()
    return {
      from: localDateTimeToInstant(addLocalDays(today, -14), 0, 0),
      to: localDateTimeToInstant(addLocalDays(today, 30), 0, 0),
      includeCancelled: false,
    }
  }, [])

  const weekResource = useScheduleResource(
    profile?.id ? `teacher-live-week:${profile.id}:${weekStart}` : null,
    () => getLiveClassesInRange(weekRange)
  )

  const summaryResource = useScheduleResource(
    profile?.id ? `teacher-live-summary:${profile.id}` : null,
    () => getLiveClassesInRange(upcomingWindow)
  )

  const summaryClasses = summaryResource.data ?? []

  const nextClass = useMemo(() => {
    const candidates = summaryClasses.filter((c) => {
      if (c.status === 'CANCELLED' || c.status === 'COMPLETED') return false
      return c.status === 'LIVE' || Date.parse(c.endTime) >= nowMs
    })
    candidates.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    return candidates[0] ?? null
  }, [summaryClasses, nowMs])

  const todos = useMemo<TeacherTodoItem[]>(() => {
    const list: TeacherTodoItem[] = []
    for (const item of summaryClasses) {
      if (item.status === 'COMPLETED' && !item.attendanceTaken) {
        list.push({ kind: 'attendance', liveClass: item })
      }
    }
    for (const item of summaryClasses) {
      if (
        (item.status === 'SCHEDULED' || item.status === 'LIVE') &&
        Date.parse(item.endTime) >= nowMs &&
        !item.detailsFilled
      ) {
        list.push({ kind: 'content', liveClass: item })
      }
    }
    return list
  }, [summaryClasses, nowMs])

  const reloadAll = () => {
    weekResource.reload()
    summaryResource.reload()
  }

  const handleStart = async (liveClass: ConsoleLiveClass) => {
    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer')
    setBusy(true)
    setErrorMessage('')
    try {
      const started = await startLiveClass(liveClass.id)
      const url = started.startUrl || started.meetingUrl
      if (url && popup) {
        popup.location.href = url
      } else {
        popup?.close()
      }
      setNotice('Đã mở phòng dạy.')
      reloadAll()
    } catch (error) {
      popup?.close()
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleEnd = async (liveClass: ConsoleLiveClass) => {
    setBusy(true)
    setErrorMessage('')
    try {
      await endLiveClass(liveClass.id)
      setSelectedClass(null)
      setNotice('Đã kết thúc buổi học.')
      reloadAll()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return {
    weekStart,
    nowMs,
    weekClasses: weekResource.data ?? [],
    status: weekResource.status === 'loading' || summaryResource.status === 'loading' ? 'loading' : weekResource.status,
    errorMessage: errorMessage || weekResource.errorMessage,
    notice,
    nextClass,
    todos,
    selectedClass,
    setSelectedClass,
    contentTarget,
    setContentTarget,
    attendanceTarget,
    setAttendanceTarget,
    busy,
    goPrevWeek: () => {
      setAnchorDate(addLocalDays(weekStart, -7))
      setSelectedClass(null)
    },
    goNextWeek: () => {
      setAnchorDate(addLocalDays(weekStart, 7))
      setSelectedClass(null)
    },
    goThisWeek: () => {
      setAnchorDate(localToday())
      setSelectedClass(null)
    },
    handleStart,
    handleEnd,
    reloadAll,
  }
}
