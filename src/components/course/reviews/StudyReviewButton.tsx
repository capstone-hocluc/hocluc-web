import { useState } from 'react'
import Button from '../../ui/Button'
import { Star } from '../../console/icons'
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
        <Star aria-hidden="true" className={summary.mine ? 'fill-accent text-accent' : undefined} />
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
