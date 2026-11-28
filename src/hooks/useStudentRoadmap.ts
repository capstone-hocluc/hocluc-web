import { useCallback, useState } from 'react'
import { usePageResource } from './usePageResource'
import { getMyMastery, getMyRoadmap } from '../services/roadmapService'

export function useStudentRoadmap() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const resource = usePageResource(() => getMyRoadmap(selectedCourseId), [selectedCourseId])

  const selectCourse = useCallback((courseId: string) => {
    setSelectedCourseId(courseId)
  }, [])

  return {
    roadmap: resource.data,
    status: resource.status,
    errorMessage: resource.errorMessage,
    reload: resource.reload,
    selectedCourseId: selectedCourseId ?? resource.data?.selectedCourseId ?? null,
    selectCourse,
  }
}

export function useMySkillMastery() {
  return usePageResource(getMyMastery, [], { forbidden: false, notFound: false })
}
