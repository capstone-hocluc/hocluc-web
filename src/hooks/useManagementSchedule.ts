import { useMemo, useState } from 'react'
import { useScheduleResource } from './useScheduleResource'
import { getMainCourses, type Course } from '../services/courseService'
import { getUsers, type UserSummary } from '../services/userService'
import {
  cancelLiveClass,
  getLiveClassBookings,
  getLiveClassesInRange,
  updateLiveClass,
  zoomErrorMessage,
  type ConsoleLiveClass,
} from '../services/liveClassService'
import { addLocalDays, localDateTimeToInstant, localToday, startOfLocalWeek } from '../lib/scheduling'
import { getErrorMessage } from '../lib/errors'

async function loadMainCourses(): Promise<Course[]> {
  const res = await getMainCourses()
  return res.data ?? []
}

async function loadTeachers(): Promise<UserSummary[]> {
  const query = { role: 'TEACHER' as const, status: 'ACTIVE' as const, size: 100 }
  const firstPage = await getUsers({ ...query, page: 0 })
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, idx) =>
      getUsers({ ...query, page: idx + 1 })
    )
  )
  return [firstPage, ...rest].flatMap((p) => p.content)
}

export function useManagementSchedule() {
  const [anchorDate, setAnchorDate] = useState(localToday)
  const [courseFilter, setCourseFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<ConsoleLiveClass | null>(null)
  const [changeTeacherTarget, setChangeTeacherTarget] = useState<ConsoleLiveClass | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ConsoleLiveClass | null>(null)
  const [mutationBusy, setMutationBusy] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')

  const weekStart = startOfLocalWeek(anchorDate)
  const range = useMemo(
    () => ({
      from: localDateTimeToInstant(weekStart, 0, 0),
      to: localDateTimeToInstant(addLocalDays(weekStart, 7), 0, 0),
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      includeCancelled: true,
    }),
    [weekStart, courseFilter, teacherFilter]
  )

  const coursesResource = useScheduleResource('management-main-courses', loadMainCourses)
  const teachersResource = useScheduleResource('management-teachers', loadTeachers)
  const classesResource = useScheduleResource(
    `management-live-classes:${weekStart}:${courseFilter || 'all'}:${teacherFilter || 'all'}`,
    () => getLiveClassesInRange(range)
  )

  const allClasses = classesResource.data ?? []
  const attentionClasses = useMemo(
    () => allClasses.filter((c) => c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && c.needsAttention),
    [allClasses]
  )
  const displayedClasses = useMemo(
    () => (attentionOnly ? attentionClasses : allClasses),
    [attentionOnly, attentionClasses, allClasses]
  )

  const selectedClass = useMemo(
    () => allClasses.find((c) => c.id === selectedId) ?? null,
    [allClasses, selectedId]
  )

  const bookingsResource = useScheduleResource(
    selectedClass ? `live-class-bookings:${selectedClass.id}` : null,
    () => getLiveClassBookings(selectedClass!.id)
  )

  const goPrevWeek = () => {
    setAnchorDate(addLocalDays(weekStart, -7))
    setSelectedId(null)
  }

  const goNextWeek = () => {
    setAnchorDate(addLocalDays(weekStart, 7))
    setSelectedId(null)
  }

  const goThisWeek = () => {
    setAnchorDate(localToday())
    setSelectedId(null)
  }

  const runReschedule = async (startTime: string, endTime: string) => {
    if (!rescheduleTarget) return
    setMutationBusy(true)
    setMutationError('')
    try {
      await updateLiveClass(rescheduleTarget.id, { startTime, endTime })
      setRescheduleTarget(null)
      setNotice('Đã dời giờ buổi học.')
      classesResource.reload()
    } catch (error) {
      setMutationError(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setMutationBusy(false)
    }
  }

  const runChangeTeacher = async (teacherId: string) => {
    if (!changeTeacherTarget) return
    setMutationBusy(true)
    setMutationError('')
    try {
      await updateLiveClass(changeTeacherTarget.id, { teacherId })
      setChangeTeacherTarget(null)
      setNotice('Đã đổi giảng viên dạy thay.')
      classesResource.reload()
    } catch (error) {
      setMutationError(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setMutationBusy(false)
    }
  }

  const runCancel = async () => {
    if (!cancelTarget) return
    setMutationBusy(true)
    setMutationError('')
    try {
      await cancelLiveClass(cancelTarget.id)
      setCancelTarget(null)
      setNotice('Đã hủy buổi học và thông báo tới học viên.')
      classesResource.reload()
    } catch (error) {
      setMutationError(getErrorMessage(error))
    } finally {
      setMutationBusy(false)
    }
  }

  return {
    weekStart,
    courses: coursesResource.data ?? [],
    coursesStatus: coursesResource.status,
    teachers: teachersResource.data ?? [],
    teachersStatus: teachersResource.status,
    courseFilter,
    setCourseFilter,
    teacherFilter,
    setTeacherFilter,
    viewMode,
    setViewMode,
    attentionOnly,
    setAttentionOnly,
    attentionClasses,
    displayedClasses,
    classesStatus: classesResource.status,
    classesError: classesResource.errorMessage,
    reloadClasses: classesResource.reload,
    selectedClass,
    setSelectedId,
    bookings: bookingsResource.data ?? [],
    bookingsLoading: bookingsResource.status === 'loading',
    wizardOpen,
    setWizardOpen,
    rescheduleTarget,
    setRescheduleTarget,
    changeTeacherTarget,
    setChangeTeacherTarget,
    cancelTarget,
    setCancelTarget,
    mutationBusy,
    mutationError,
    setMutationError,
    notice,
    setNotice,
    goPrevWeek,
    goNextWeek,
    goThisWeek,
    runReschedule,
    runChangeTeacher,
    runCancel,
  }
}
