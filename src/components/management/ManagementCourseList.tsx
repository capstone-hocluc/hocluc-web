import CourseManagement from './crud/course-management'

// Preserve the existing entry point; manager callers remain read-only by default.
export default function ManagementCourseList({
  readOnly = true,
  title = 'Khóa học',
}: {
  readOnly?: boolean
  title?: string
}) {
  return <CourseManagement readOnly={readOnly} title={title} />
}
