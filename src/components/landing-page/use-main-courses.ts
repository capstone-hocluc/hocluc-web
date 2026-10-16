import { useEffect, useState } from 'react'
import { getMainCourses, type Course } from '../../services/courseService'

export type MainCoursesStatus = 'loading' | 'ready' | 'error'

// The public MAIN courses, shared by the home courses section and the /courses page.
// `initial` lets the home page show its opt-in design preview without a request.
export function useMainCourses(initial?: Course[]) {
  const [courses, setCourses] = useState<Course[]>(initial ?? [])
  const [status, setStatus] = useState<MainCoursesStatus>(initial ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (initial) return
    let cancelled = false
    getMainCourses()
      .then((response) => {
        if (cancelled) return
        setCourses(response.data ?? [])
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt, initial])

  const retry = () => {
    setStatus('loading')
    setAttempt((value) => value + 1)
  }

  return { courses, status, retry }
}
