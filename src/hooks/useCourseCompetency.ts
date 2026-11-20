import { useEffect, useState } from 'react'
import { usePageResource } from './usePageResource'
import { getCompetencyCourses, getCourseCompetency } from '../services/freeExamService'

export function useCourseCompetency() {
  const courses = usePageResource(getCompetencyCourses, [])
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('courseId') ?? '')
  const courseId = selected || courses.data?.[0]?.id || ''
  const resource = usePageResource(() => courseId ? getCourseCompetency(courseId) : Promise.resolve(null), [courseId])
  const data = resource.data?.courseId === courseId ? resource.data : null
  const { reload } = resource
  const status = resource.status === 'ready' && courseId && !data ? 'loading' as const : resource.status
  const changeCourse = (id: string) => {
    setSelected(id)
    resource.reload()
    const query = new URLSearchParams(window.location.search)
    query.set('courseId', id)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}`)
  }
  useEffect(() => {
    const onPopState = () => {
      setSelected(new URLSearchParams(window.location.search).get('courseId') ?? '')
      reload()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [reload])
  return { courses, courseId, ...resource, data, status, changeCourse }
}
