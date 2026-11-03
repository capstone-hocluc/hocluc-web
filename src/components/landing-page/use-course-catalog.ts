import { useCallback, useEffect, useRef, useState } from 'react'
import { getCourseDetail, type Course, type CourseDetail } from '../../services/courseService'
import { groupSubjectCourses, type SubjectGroup } from './course-subjects'
import { useMainCourses } from './use-main-courses'

export type SubjectsStatus = 'idle' | 'loading' | 'ready'

const asDetail = (data: unknown): CourseDetail | null =>
  data && typeof data === 'object' && !Array.isArray(data) ? (data as CourseDetail) : null

// Roadmap details shared by the home catalog and the header's course menu, so opening the menu
// on the home page reuses what the catalog already loaded. A failed request is forgotten.
const roadmapDetails = new Map<string, Promise<CourseDetail | null>>()
function loadRoadmapDetail(id: string) {
  let pending = roadmapDetails.get(id)
  if (!pending) {
    pending = getCourseDetail(id).then(
      (response) => asDetail(response?.data),
      (error) => {
        roadmapDetails.delete(id)
        throw error
      }
    )
    roadmapDetails.set(id, pending)
  }
  return pending
}

/** The subject groups of these roadmaps; a roadmap whose detail fails adds nothing. */
export async function loadSubjectGroups(roadmaps: Course[]): Promise<SubjectGroup[]> {
  const results = await Promise.allSettled(roadmaps.map((course) => loadRoadmapDetail(course.id)))
  const details = results.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : []
  )
  return groupSubjectCourses(details)
}

// The home page catalog: the roadmaps (MAIN courses) plus the courses each roadmap is made of,
// grouped by subject. There is no public list of standalone courses, so the subjects come from
// the roadmaps' own details; a roadmap whose detail fails simply adds no subject courses.
export function useCourseCatalog(preview?: Course[]) {
  const { courses, status, retry } = useMainCourses(preview)
  const [loaded, setLoaded] = useState<{ source: Course[]; groups: SubjectGroup[] } | null>(null)
  const wantsSubjects = !preview && status === 'ready' && courses.length > 0

  useEffect(() => {
    if (!wantsSubjects) return
    let cancelled = false
    loadSubjectGroups(courses).then((groups) => {
      if (!cancelled) setLoaded({ source: courses, groups })
    })
    return () => {
      cancelled = true
    }
  }, [courses, wantsSubjects])

  const current = wantsSubjects && loaded?.source === courses
  const subjectsStatus: SubjectsStatus = !wantsSubjects ? 'idle' : current ? 'ready' : 'loading'
  return {
    courses,
    status,
    retry,
    groups: current ? loaded.groups : [],
    subjectsStatus,
  }
}

// Price, cover and ownership of the subject courses on screen. Each course page is fetched once per
// visit of the landing page (the cache lives with the page), and a failed request is forgotten so
// the next look retries it. `null` while the requested set is still loading.
export function useCourseDetails(ids: string[]) {
  const cache = useRef(new Map<string, Promise<CourseDetail | null>>())
  const [loaded, setLoaded] = useState<{ key: string; details: Map<string, CourseDetail | null> }>()
  const key = ids.join(',')

  const load = useCallback((id: string) => {
    let pending = cache.current.get(id)
    if (!pending) {
      pending = getCourseDetail(id)
        .then((response) => asDetail(response?.data))
        .catch(() => {
          cache.current.delete(id)
          return null
        })
      cache.current.set(id, pending)
    }
    return pending
  }, [])

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const list = key.split(',')
    Promise.all(list.map(load)).then((values) => {
      if (!cancelled) setLoaded({ key, details: new Map(list.map((id, index) => [id, values[index]])) })
    })
    return () => {
      cancelled = true
    }
  }, [key, load])

  // Warms the cache for a subject the visitor is about to open (tab hover or focus).
  const prefetch = useCallback((next: string[]) => next.forEach((id) => void load(id)), [load])

  return { details: loaded?.key === key ? loaded.details : null, prefetch }
}
