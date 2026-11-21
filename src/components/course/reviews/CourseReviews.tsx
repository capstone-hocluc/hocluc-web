import { useCallback, useEffect, useState } from 'react'
import Avatar from '../../ui/Avatar'
import Button from '../../ui/Button'
import Progress from '../../ui/Progress'
import Skeleton from '../../ui/Skeleton'
import { formatDate } from '../../../lib/courseFormat'
import { getErrorMessage } from '../../../lib/errors'
import { showErrorToast } from '../../../lib/toastBus'
import {
  getReviews,
  type CourseReview,
  type CourseReviewSummary,
} from '../../../services/courseReviewService'
import { RatingStars } from './RatingStars'
import ReviewFormDialog from './ReviewFormDialog'
import { useCourseReviewSummary } from './use-course-review-summary'

const PAGE_SIZE = 10

const ratingText = (value: number) => value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function Distribution({ summary }: { summary: CourseReviewSummary }) {
  return (
    <ul className="m-0 grid list-none gap-1.5 p-0">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = summary.distribution[star - 1] ?? 0
        const percent = summary.reviewCount ? (count / summary.reviewCount) * 100 : 0
        return (
          <li key={star} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-sm text-(--muted)">
            <span>{star} sao</span>
            <Progress value={percent} size="sm" aria-label={`${star} sao: ${count} đánh giá`} />
            <span className="text-right tabular-nums">{count}</span>
          </li>
        )
      })}
    </ul>
  )
}

function ReviewItem({ review }: { review: CourseReview }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3 border-t border-(--line) py-4 first:border-t-0">
      <Avatar src={review.authorAvatarUrl ?? undefined} fallback={review.authorName.charAt(0).toUpperCase()} />
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-(--ink)">{review.authorName}</strong>
          <RatingStars value={review.rating} size={14} />
          <span className="text-sm text-(--muted)">{formatDate(review.createdAt)}</span>
        </div>
        {review.comment && <p className="m-0 whitespace-pre-line text-(--ink)">{review.comment}</p>}
      </div>
    </li>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="grid gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-3 w-full" />
          ))}
        </div>
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-[auto_1fr] gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The "Đánh giá" block of the public course page: summary, the caller's own review action and the list. */
function CourseReviews({ courseId }: { courseId: string }) {
  const { summary, failed, reload } = useCourseReviewSummary(courseId)
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [page, setPage] = useState(0)
  const [last, setLast] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const loadFirstPage = useCallback(() => {
    getReviews(courseId, 0, PAGE_SIZE)
      .then((data) => {
        setReviews(data.content)
        setPage(0)
        setLast(data.last ?? data.pageNumber + 1 >= data.totalPages)
      })
      .catch(() => setReviews([]))
  }, [courseId])

  useEffect(loadFirstPage, [loadFirstPage])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const data = await getReviews(courseId, page + 1, PAGE_SIZE)
      setReviews((current) => [...current, ...data.content])
      setPage(data.pageNumber)
      setLast(data.last ?? data.pageNumber + 1 >= data.totalPages)
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setLoadingMore(false)
    }
  }

  if (failed) return null

  const changed = () => {
    reload()
    loadFirstPage()
  }

  return (
    <section className="cd-block" aria-labelledby="cd-reviews-title">
      <h2 id="cd-reviews-title">Đánh giá</h2>
      {!summary ? (
        <ReviewsSkeleton />
      ) : (
        <div className="grid gap-6">
          <div className="grid items-start gap-6 sm:grid-cols-[auto_1fr]">
            <div className="grid justify-items-start gap-1">
              <strong className="text-4xl leading-none text-(--ink)">
                {summary.averageRating != null ? ratingText(summary.averageRating) : '–'}
              </strong>
              <RatingStars value={summary.averageRating ?? 0} />
              <span className="text-sm text-(--muted)">{summary.reviewCount} đánh giá</span>
            </div>
            <Distribution summary={summary} />
          </div>

          {summary.eligibility === 'CAN_REVIEW' && (
            <div>
              <Button type="button" size="sm" appearance={summary.mine ? 'outline' : 'fill'} onClick={() => setFormOpen(true)}>
                {summary.mine ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}
              </Button>
            </div>
          )}
          {summary.eligibility === 'NO_LESSON_COMPLETED' && (
            <p className="m-0 text-sm text-(--muted)">Hoàn thành 1 bài học để đánh giá khóa học này.</p>
          )}

          {reviews.length > 0 && (
            <ul className="m-0 list-none p-0">
              {reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}
          {!last && (
            <div>
              <Button type="button" size="sm" appearance="outline" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? 'Đang tải…' : 'Xem thêm đánh giá'}
              </Button>
            </div>
          )}
        </div>
      )}
      <ReviewFormDialog
        courseId={courseId}
        open={formOpen}
        mine={summary?.mine ?? null}
        onClose={() => setFormOpen(false)}
        onChanged={changed}
      />
    </section>
  )
}

export default CourseReviews
