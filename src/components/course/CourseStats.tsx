import { Clock, Layers, ListTree, HelpCircle, BookOpen, Rows3 } from '../console/icons'
import type { CourseDetail } from '../../services/courseService'
import { formatDuration } from '../../lib/courseFormat'

interface CourseStatsProps {
  course: CourseDetail
}

function CourseStats({ course }: CourseStatsProps) {
  const items = [
    { icon: Layers, label: 'Giai đoạn', value: course.phaseCount },
    { icon: Rows3, label: 'Phần học', value: course.sectionCount },
    { icon: ListTree, label: 'Chương', value: course.chapterCount },
    { icon: BookOpen, label: 'Bài học', value: course.lessonCount },
    { icon: HelpCircle, label: 'Bài quiz', value: course.quizCount },
    { icon: Clock, label: 'Thời lượng', value: formatDuration(course.totalDurationSeconds) },
  ].filter((item) => item.value !== undefined && item.value !== null)

  if (items.length === 0) return null

  return (
    <div className="hl-cd-stats">
      {items.map((item) => (
        <div className="hl-cd-stat" key={item.label}>
          <item.icon size={18} />
          <div>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CourseStats
