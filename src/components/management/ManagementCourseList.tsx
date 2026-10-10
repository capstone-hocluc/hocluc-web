import CourseManagement from './crud/course-management'

// Preserve the existing entry point; manager callers remain read-only by default.
export default function ManagementCourseList({ readOnly = true }: { readOnly?: boolean }) {
  return <CourseManagement readOnly={readOnly} />
}
