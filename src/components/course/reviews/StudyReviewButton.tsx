import { useState } from 'react'
import Button from '../../ui/Button'
import { Star3D } from './RatingStars'
import { useCourseReviewSummary } from './use-course-review-summary'
import ReviewFormDialog from './ReviewFormDialog'

/** "Đánh giá khóa học" on the study page, shown once the student may review the course. */
function StudyReviewButton({ courseId }: { courseId: string }) {
  const { summary, reload } = useCourseReviewSummary(courseId)
  const [open, setOpen] = useState(false)
  if (summary?.eligibility !== 'CAN_REVIEW') return null
  return (
    <>
      <Button type="button" size="sm" appearance="outline" onClick={() => setOpen(true)}>
        <Star3D size={16} />
        {summary.mine ? 'Sửa đánh giá' : 'Đánh giá khóa học'}
      </Button>
      <ReviewFormDialog
        courseId={courseId}
        open={open}
        mine={summary.mine}
        onClose={() => setOpen(false)}
        onChanged={reload}
      />
    </>
  )
}

export default StudyReviewButton
