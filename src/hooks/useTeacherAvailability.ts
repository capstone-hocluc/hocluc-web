import { useMemo, useState } from 'react'
import { useCurrentUser } from './useCurrentUser'
import { useScheduleResource } from './useScheduleResource'
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getMyAvailability,
  replaceMyAvailability,
} from '../services/teacherAvailabilityService'
import { getLiveClassesInRange } from '../services/liveClassService'
import type { AvailabilitySlot, DayOfWeek } from '../types/scheduling'
import { addLocalDays, localDateTimeToInstant, localToday, startOfLocalWeek } from '../lib/scheduling'
import { formatMinutesClock, parseClockMinutes } from '../lib/liveScheduleFormat'
import { getErrorMessage } from '../lib/errors'

function mergeSlotsForDay(day: DayOfWeek, existing: AvailabilitySlot[], addedStartMin: number, addedEndMin: number): AvailabilitySlot[] {
  const dayRanges = existing
    .filter((s) => s.dayOfWeek === day)
    .map((s) => ({ start: parseClockMinutes(s.startTime), end: parseClockMinutes(s.endTime) }))
  dayRanges.push({ start: addedStartMin, end: addedEndMin })
  dayRanges.sort((a, b) => a.start - b.start)

  const merged: Array<{ start: number; end: number }> = []
  for (const r of dayRanges) {
    const last = merged[merged.length - 1]
    if (!last || r.start > last.end) {
      merged.push({ ...r })
    } else {
      last.end = Math.max(last.end, r.end)
    }
  }

  const others = existing.filter((s) => s.dayOfWeek !== day)
  return [
    ...others,
    ...merged.map((r) => ({
      dayOfWeek: day,
      startTime: formatMinutesClock(r.start),
      endTime: formatMinutesClock(r.end),
    })),
  ]
}

export function useTeacherAvailability() {
  const { profile } = useCurrentUser()
  const availabilityResource = useScheduleResource('teacher-my-availability', getMyAvailability)

  const weekRange = useMemo(() => {
    const weekStart = startOfLocalWeek(localToday())
    return {
      from: localDateTimeToInstant(weekStart, 0, 0),
      to: localDateTimeToInstant(addLocalDays(weekStart, 7), 0, 0),
      includeCancelled: false,
    }
  }, [])

  const classesResource = useScheduleResource(
    profile?.id ? `teacher-avail-classes:${profile.id}` : null,
    () => getLiveClassesInRange(weekRange)
  )

  const [draftOverride, setDraftOverride] = useState<AvailabilitySlot[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  const draftSlots = draftOverride ?? availabilityResource.data?.recurringSlots ?? []
  const dirty = draftOverride !== null

  const addSlotRange = (day: DayOfWeek, startMin: number, endMin: number) => {
    setDraftOverride((prev) => {
      const base = prev ?? availabilityResource.data?.recurringSlots ?? []
      return mergeSlotsForDay(day, base, startMin, endMin)
    })
    setNotice('')
    setErrorMessage('')
  }

  const removeSlot = (target: AvailabilitySlot) => {
    setDraftOverride((prev) => {
      const base = prev ?? availabilityResource.data?.recurringSlots ?? []
      return base.filter(
        (s) =>
          !(
            s.dayOfWeek === target.dayOfWeek &&
            s.startTime.slice(0, 5) === target.startTime.slice(0, 5) &&
            s.endTime.slice(0, 5) === target.endTime.slice(0, 5)
          )
      )
    })
    setNotice('')
    setErrorMessage('')
  }

  const undoChanges = () => {
    setDraftOverride(null)
    setErrorMessage('')
  }

  const save = async () => {
    setBusy(true)
    setErrorMessage('')
    setNotice('')
    try {
      const normalized = draftSlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
      }))
      await replaceMyAvailability({ slots: normalized })
      setDraftOverride(null)
      setNotice('Đã lưu giờ rảnh.')
      availabilityResource.reload()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const addBusyDay = async (exceptionDate: string, reason?: string) => {
    setBusy(true)
    setErrorMessage('')
    setNotice('')
    try {
      await createAvailabilityException({
        exceptionDate,
        isAvailable: false,
        reason: reason?.trim() || undefined,
      })
      setNotice('Đã thêm ngày bận.')
      availabilityResource.reload()
      return true
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      return false
    } finally {
      setBusy(false)
    }
  }

  const removeBusyDay = async (exceptionId: string) => {
    setBusy(true)
    setErrorMessage('')
    setNotice('')
    try {
      await deleteAvailabilityException(exceptionId)
      setNotice('Đã xóa ngày bận.')
      availabilityResource.reload()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const busyDays = useMemo(
    () => (availabilityResource.data?.exceptions ?? []).filter((e) => !e.isAvailable),
    [availabilityResource.data]
  )

  return {
    status: availabilityResource.status,
    resourceError: availabilityResource.errorMessage,
    reload: availabilityResource.reload,
    draftSlots,
    busyDays,
    weekClasses: classesResource.data ?? [],
    dirty,
    busy,
    errorMessage,
    notice,
    addSlotRange,
    removeSlot,
    undoChanges,
    save,
    addBusyDay,
    removeBusyDay,
  }
}
