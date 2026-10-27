import { request } from '../lib/api'

/** A skill of the subject's active label set that measures an outcome. */
export interface CourseOutcomeSkill {
  code: string
  name: string | null
}
/** A course learning outcome (CLO): what a student can do after the course. */
export interface CourseOutcome {
  id: string
  code: string
  description: string
  sequence: number
  skills: CourseOutcomeSkill[]
}
export interface CourseOutcomeInput {
  /** Left out: "CLO{n}" by its place in the list. */
  code?: string | null
  description: string
  skillCodes: string[]
}

const path = (courseId: string) => `/api/v1/admin/courses/${encodeURIComponent(courseId)}/outcomes`

export async function getCourseOutcomes(courseId: string): Promise<CourseOutcome[]> {
  return (await request<CourseOutcome[]>(path(courseId), { auth: true })).data ?? []
}
/** Replaces the whole list, in order. */
export async function replaceCourseOutcomes(
  courseId: string,
  outcomes: CourseOutcomeInput[]
): Promise<CourseOutcome[]> {
  return (
    (
      await request<CourseOutcome[]>(path(courseId), {
        auth: true,
        method: 'PUT',
        body: { outcomes },
      })
    ).data ?? []
  )
}
