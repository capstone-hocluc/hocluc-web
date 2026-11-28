import DropdownField from '../../ui/DropdownField'
import type { RoadmapCourseOption } from '../../../services/roadmapService'

interface RoadmapCourseSelectorProps {
  courses: RoadmapCourseOption[]
  selectedCourseId: string | null
  onSelect: (courseId: string) => void
}

export default function RoadmapCourseSelector({
  courses,
  selectedCourseId,
  onSelect,
}: RoadmapCourseSelectorProps) {
  if (courses.length <= 1) return null
  const activeId =
    selectedCourseId ?? courses.find((course) => course.selected)?.courseId ?? courses[0]?.courseId ?? null

  return (
    <div className="w-full min-w-[260px] sm:w-80">
      <DropdownField
        ariaLabel="Chọn khóa học trong lộ trình"
        value={activeId}
        onChange={(value) => {
          if (value) onSelect(value)
        }}
        options={courses.map((course) => ({
          id: course.courseId,
          label: course.title,
        }))}
      />
    </div>
  )
}
