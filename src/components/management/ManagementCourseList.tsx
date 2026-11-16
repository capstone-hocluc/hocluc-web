import type { ReactNode } from 'react'
import CourseManagement from './crud/course-management'

// Preserve the existing entry point; manager callers remain read-only by default.
export default function ManagementCourseList({
  readOnly = true,
  title = 'Khóa học',
  navigation,
}: {
  readOnly?: boolean
  title?: string
  /** Tab row of the page group, shown under the heading. */
  navigation?: ReactNode
}) {
  return <CourseManagement readOnly={readOnly} title={title} navigation={navigation} />
}
