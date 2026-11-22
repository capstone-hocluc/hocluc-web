import { useCallback, useEffect, useState } from 'react'
import { getReviewSummary, type CourseReviewSummary } from '../../../services/courseReviewService'

/** The caller's rating summary of a course, reloadable after they write or delete their review. */
export function useCourseReviewSummary(courseId: string) {
  const [summary, setSummary] = useState<CourseReviewSummary | null>(null)
  const [failed, setFailed] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    getReviewSummary(courseId)
      .then((data) => {
        if (cancelled) return
        setSummary(data)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [courseId, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { summary, failed, reload }
}
