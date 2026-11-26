import { useMemo, useState } from 'react'
import { useScheduleResource } from './useScheduleResource'
import {
  createLiveTimetable,
  getLiveClassesInRange,
  getTeachableSubjects,
  getTeacherZoomAccount,
  previewLiveTimetable,
  zoomErrorMessage,
  type LiveTimetablePreviewSession,
  type LiveTimetableSlot,
} from '../services/liveClassService'
import { getTeacherAvailability } from '../services/teacherAvailabilityService'
import type { Course } from '../services/courseService'
import type { UserSummary } from '../services/userService'
import type { WizardEditableSession } from '../components/console/schedule/wizard-step-preview'
import { addLocalDays, localDateTimeToInstant, localToday } from '../lib/scheduling'
import { getErrorMessage } from '../lib/errors'

interface Params {
  open: boolean
  courses: Course[]
  teachers: UserSummary[]
  initialCourseId?: string
  onCreated: () => void
}

function formatTeacherLabel(t?: UserSummary): string {
  if (!t) return ''
  return t.displayName || [t.firstName, t.lastName].filter(Boolean).join(' ') || t.email
}

export function useLiveTimetableWizard({
  open,
  courses,
  teachers,
  initialCourseId,
  onCreated,
}: Params) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [title, setTitle] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || courses[0]?.id || '')
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [startDate, setStartDate] = useState(localToday)
  const [endDate, setEndDate] = useState(() => addLocalDays(localToday(), 28))
  const [slots, setSlots] = useState<LiveTimetableSlot[]>([
    { dayOfWeek: 'MONDAY', startTime: '19:30', endTime: '21:30' },
  ])
  const [capacity, setCapacity] = useState('20')
  const [previewSessions, setPreviewSessions] = useState<WizardEditableSession[]>([])
  const [previewBlockingErrors, setPreviewBlockingErrors] = useState<string[]>([])
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const courseId = selectedCourseId || initialCourseId || courses[0]?.id || ''
  const teacherId = selectedTeacherId || teachers[0]?.id || ''

  const subjectsResource = useScheduleResource(
    open && courseId && teacherId ? `wizard-teachable:${courseId}:${teacherId}` : null,
    () => getTeachableSubjects(courseId, teacherId)
  )

  const availabilityResource = useScheduleResource(
    open && teacherId ? `wizard-availability:${teacherId}` : null,
    () => getTeacherAvailability(teacherId)
  )

  const zoomResource = useScheduleResource(
    open && teacherId ? `wizard-zoom:${teacherId}` : null,
    () => getTeacherZoomAccount(teacherId)
  )

  const loadRange = useMemo(() => {
    const today = localToday()
    return {
      from: localDateTimeToInstant(today, 0, 0),
      to: localDateTimeToInstant(addLocalDays(today, 7), 0, 0),
      teacherId,
      includeCancelled: false,
    }
  }, [teacherId])

  const teacherClassesResource = useScheduleResource(
    open && teacherId ? `wizard-load:${teacherId}` : null,
    () => getLiveClassesInRange(loadRange)
  )

  const subjects = subjectsResource.data ?? []
  const subjectId = subjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : subjects[0]?.id ?? ''

  const selectedTeacher = teachers.find((t) => t.id === teacherId)
  const teacherName = formatTeacherLabel(selectedTeacher)
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''
  const zoomMissing = Boolean(zoomResource.data?.zoomEnabled && !zoomResource.data?.connected)

  const teachingLoadLabel = useMemo(() => {
    const list = teacherClassesResource.data ?? []
    if (!list.length) return '0 buổi / tuần'
    const distinctCourses = new Set(list.map((c) => c.courseId || c.title)).size
    return `${distinctCourses} lớp, ${list.length} buổi / tuần`
  }, [teacherClassesResource.data])

  const goToStep2 = () => {
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên lớp.')
      return
    }
    if (!courseId || !teacherId) {
      setErrorMessage('Vui lòng chọn khóa học và giảng viên.')
      return
    }
    if (!subjectId) {
      setErrorMessage('Vui lòng chọn môn học giảng viên dạy được.')
      return
    }
    if (zoomMissing) {
      setErrorMessage('Giảng viên chưa kết nối Zoom.')
      return
    }
    setErrorMessage('')
    setStep(2)
  }

  const mapPreviewSessions = (
    sessions: LiveTimetablePreviewSession[],
    existing?: WizardEditableSession[]
  ): WizardEditableSession[] => {
    return sessions.map((session, idx) => ({
      ...session,
      rowKey: existing?.[idx]?.rowKey ?? `${idx}-${session.date}-${session.start}`,
      included: existing?.[idx]?.included ?? true,
    }))
  }

  const runPreview = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setErrorMessage('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    if (!slots.length || slots.some((s) => !s.startTime || !s.endTime || s.startTime >= s.endTime)) {
      setErrorMessage('Mỗi khung giờ cần có giờ kết thúc sau giờ bắt đầu.')
      return
    }
    setBusy(true)
    setErrorMessage('')
    try {
      const capNum = capacity.trim() ? Number(capacity.trim()) : undefined
      const res = await previewLiveTimetable({
        courseId,
        teacherId,
        subjectId,
        title: title.trim(),
        startDate,
        endDate,
        slots,
        ...(capNum && Number.isFinite(capNum) && capNum >= 1 ? { capacity: capNum } : {}),
      })
      setPreviewSessions(mapPreviewSessions(res.sessions))
      setPreviewBlockingErrors(res.blockingErrors)
      setPreviewWarnings(res.warnings ?? [])
      setStep(3)
    } catch (error) {
      setErrorMessage(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setBusy(false)
    }
  }

  const recheckSelectedSessions = async (nextList: WizardEditableSession[]) => {
    const active = nextList.filter((s) => s.included)
    if (!active.length) {
      setPreviewSessions(nextList)
      setPreviewBlockingErrors([])
      setPreviewWarnings([])
      return
    }
    setBusy(true)
    setErrorMessage('')
    try {
      const capNum = capacity.trim() ? Number(capacity.trim()) : undefined
      const res = await previewLiveTimetable({
        courseId,
        teacherId,
        subjectId,
        title: title.trim(),
        startDate,
        endDate,
        slots,
        ...(capNum && Number.isFinite(capNum) && capNum >= 1 ? { capacity: capNum } : {}),
        sessions: active.map((s) => ({
          date: s.date,
          start: s.start.slice(0, 5),
          end: s.end.slice(0, 5),
          phaseId: s.phaseId ?? undefined,
          title: s.title,
        })),
      })
      let cursor = 0
      const merged = nextList.map((row) => {
        if (!row.included) return row
        const updated = res.sessions[cursor++]
        return updated ? { ...row, ...updated } : row
      })
      setPreviewSessions(merged)
      setPreviewBlockingErrors(res.blockingErrors)
      setPreviewWarnings(res.warnings ?? [])
    } catch (error) {
      setErrorMessage(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setBusy(false)
    }
  }

  const toggleIncluded = (rowKey: string) => {
    const next = previewSessions.map((row) =>
      row.rowKey === rowKey ? { ...row, included: !row.included } : row
    )
    void recheckSelectedSessions(next)
  }

  const updateSessionTime = async (rowKey: string, date: string, start: string, end: string) => {
    const next = previewSessions.map((row) =>
      row.rowKey === rowKey ? { ...row, date, start, end, included: true } : row
    )
    await recheckSelectedSessions(next)
  }

  const includedCount = previewSessions.filter((s) => s.included).length

  const submitCreate = async () => {
    const chosen = previewSessions.filter((s) => s.included)
    if (!chosen.length) {
      setErrorMessage('Chọn ít nhất 1 buổi để tạo.')
      return
    }
    setBusy(true)
    setErrorMessage('')
    try {
      const capNum = capacity.trim() ? Number(capacity.trim()) : undefined
      let num = 0
      await createLiveTimetable(courseId, {
        teacherId,
        subjectId,
        title: title.trim(),
        startDate,
        endDate,
        slots,
        ...(capNum && Number.isFinite(capNum) && capNum >= 1 ? { capacity: capNum } : {}),
        sessions: chosen.map((s) => {
          num += 1
          return {
            date: s.date,
            start: s.start.slice(0, 5),
            end: s.end.slice(0, 5),
            phaseId: s.phaseId ?? undefined,
            title: `${subjectName || title.trim()} · Buổi ${num}`,
          }
        }),
      })
      onCreated()
    } catch (error) {
      setErrorMessage(zoomErrorMessage(error, getErrorMessage(error)))
    } finally {
      setBusy(false)
    }
  }

  return {
    step,
    setStep,
    title,
    setTitle,
    courseId,
    setCourseId: setSelectedCourseId,
    teacherId,
    setTeacherId: setSelectedTeacherId,
    teacherName,
    subjectId,
    setSubjectId: setSelectedSubjectId,
    subjectName,
    subjects,
    subjectsLoading: subjectsResource.status === 'loading',
    availability: availabilityResource.data,
    availabilityLoading: availabilityResource.status === 'loading',
    zoomAccount: zoomResource.data,
    zoomMissing,
    teachingLoadLabel,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    slots,
    setSlots,
    capacity,
    setCapacity,
    previewSessions,
    previewBlockingErrors,
    previewWarnings,
    includedCount,
    busy,
    errorMessage,
    setErrorMessage,
    goToStep2,
    runPreview,
    toggleIncluded,
    updateSessionTime,
    submitCreate,
  }
}
