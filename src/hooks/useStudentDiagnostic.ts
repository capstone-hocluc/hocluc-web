import { useCallback, useState } from 'react'
import { useScheduleResource } from './useScheduleResource'
import { getStudentMastery, getStudentRoadmap } from '../services/roadmapService'

export function useStudentDiagnostic(studentId: string | null, active = true) {
  const [courseSelection, setCourseSelection] = useState<{
    studentId: string | null
    courseId: string | null
  }>({ studentId: null, courseId: null })
  const [activatedFor, setActivatedFor] = useState<string | null>(null)

  if (active && studentId && activatedFor !== studentId) {
    setActivatedFor(studentId)
  }

  const courseId = courseSelection.studentId === studentId ? courseSelection.courseId : null
  const enabled = Boolean(studentId) && (active || activatedFor === studentId)

  const mastery = useScheduleResource(
    enabled && studentId ? `student-mastery:${studentId}` : null,
    () => getStudentMastery(studentId!)
  )

  const roadmap = useScheduleResource(
    enabled && studentId ? `student-roadmap:${studentId}:${courseId ?? 'default'}` : null,
    () => getStudentRoadmap(studentId!, courseId)
  )

  const selectCourse = useCallback(
    (nextCourseId: string) => {
      setCourseSelection({ studentId, courseId: nextCourseId })
    },
    [studentId]
  )

  const reloadAll = useCallback(() => {
    mastery.reload()
    roadmap.reload()
  }, [mastery, roadmap])

  return {
    mastery,
    roadmap,
    courseId: courseId ?? roadmap.data?.selectedCourseId ?? null,
    selectCourse,
    reloadAll,
  }
}
