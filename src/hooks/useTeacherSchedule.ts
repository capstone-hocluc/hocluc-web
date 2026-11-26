import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { useScheduleResource } from './useScheduleResource'
import {
  connectMyTeacherZoom,
  disconnectMyTeacherZoom,
  endLiveClass,
  getLiveClassesInRange,
  getMyTeacherZoom,
  startLiveClass,
  zoomCallbackErrorMessage,
  zoomErrorMessage,
  type ConsoleLiveClass,
} from '../services/liveClassService'
import { addLocalDays, localDateTimeToInstant, localToday, startOfLocalWeek } from '../lib/scheduling'
import { getErrorMessage } from '../lib/errors'
import { ApiError } from '../lib/api'
import { teacherLiveRoomPath } from '../lib/console-routes'

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
  const [zoomBusy, setZoomBusy] = useState(false)
  const [initialZoomFeedback] = useState(() => {
    if (typeof window === 'undefined') return { notice: '', error: '' }
    const params = new URLSearchParams(window.location.search)
    const status = params.get('zoom')
    if (status === 'connected') return { notice: 'Đã kết nối tài khoản Zoom.', error: '' }
    if (status === 'error') {
      return { notice: '', error: zoomCallbackErrorMessage(params.get('reason')) }
    }
    return { notice: '', error: '' }
  })
  const [errorMessage, setErrorMessage] = useState(initialZoomFeedback.error)
  const [notice, setNotice] = useState(initialZoomFeedback.notice)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('zoom') && !url.searchParams.has('reason')) return
    url.searchParams.delete('zoom')
    url.searchParams.delete('reason')
    const cleaned = `${url.pathname}${url.search ? url.search : ''}${url.hash}`
    window.history.replaceState({}, '', cleaned)
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

  const zoomResource = useScheduleResource(
    profile?.id ? `teacher-my-zoom:${profile.id}` : null,
    () => getMyTeacherZoom()
  )

  useEffect(() => {
    if (window.location.hash === '#teacher-zoom-card') {
      document.getElementById('teacher-zoom-card')?.scrollIntoView({ block: 'center' })
    }
  }, [weekResource.status, summaryResource.status, zoomResource.status])

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
    zoomResource.reload()
  }

  const handleConnectZoom = async () => {
    if (zoomBusy) return
    setZoomBusy(true)
    setErrorMessage('')
    try {
      const res = await connectMyTeacherZoom()
      window.location.assign(res.authorizeUrl)
    } catch (error) {
      setErrorMessage(zoomErrorMessage(error, getErrorMessage(error)))
      setZoomBusy(false)
    }
  }

  const handleDisconnectZoom = async () => {
    if (zoomBusy) return
    setZoomBusy(true)
    setErrorMessage('')
    try {
      await disconnectMyTeacherZoom()
      setNotice('Đã ngắt kết nối tài khoản Zoom.')
      zoomResource.reload()
    } catch (error) {
      setErrorMessage(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setZoomBusy(false)
    }
  }

  const handleStart = async (liveClass: ConsoleLiveClass) => {
    setBusy(true)
    setErrorMessage('')
    try {
      await startLiveClass(liveClass.id)
      window.dispatchEvent(new CustomEvent('hl-navigate', { detail: { path: teacherLiveRoomPath(liveClass.id) } }))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ZOOM_RECONNECT_REQUIRED') {
        setSelectedClass(null)
        setErrorMessage('Kết nối Zoom đã hết hạn. Hãy kết nối lại ở mục Tài khoản Zoom.')
        zoomResource.reload()
        document.getElementById('teacher-zoom-card')?.scrollIntoView({ block: 'center' })
      } else {
        setErrorMessage(getErrorMessage(error))
      }
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
    status: weekResource.status === 'loading' || summaryResource.status === 'loading' ? ('loading' as const) : weekResource.status,
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
    zoomAccount: zoomResource.data,
    zoomLoading: zoomResource.status === 'loading' || zoomResource.status === 'idle',
    zoomBusy,
    handleConnectZoom,
    handleDisconnectZoom,
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
