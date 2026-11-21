import { useState, type FormEvent } from 'react'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import Notice from '../../ui/Notice'
import { getErrorMessage } from '../../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import { deleteMyReview, saveMyReview, type MyCourseReview } from '../../../services/courseReviewService'
import { StarInput } from './RatingStars'

const MAX_COMMENT = 2000

interface ReviewFormDialogProps {
  courseId: string
  open: boolean
  mine: MyCourseReview | null
  onClose: () => void
  /** Called after the review is saved or deleted, so the caller reloads its summary. */
  onChanged: () => void
}

type FormProps = Omit<ReviewFormDialogProps, 'open'> & { busy: Busy; setBusy: (busy: Busy) => void }
type Busy = 'save' | 'delete' | null

// Mounted only while the dialog is open, so every opening starts from the saved review.
function ReviewForm({ courseId, mine, onClose, onChanged, busy, setBusy }: FormProps) {
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [comment, setComment] = useState(mine?.comment ?? '')

  const run = async (kind: 'save' | 'delete') => {
    if (busy) return
    setBusy(kind)
    try {
      if (kind === 'save') {
        await saveMyReview(courseId, rating, comment)
        showSuccessToast(mine ? 'Đã cập nhật đánh giá.' : 'Cảm ơn bạn đã đánh giá.')
      } else {
        await deleteMyReview(courseId)
        showSuccessToast('Đã xóa đánh giá.')
      }
      onChanged()
      onClose()
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (rating) void run('save')
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {mine?.hidden && (
        <Notice tone="warning">
          Đánh giá này đang bị ẩn{mine.hiddenReason ? `: ${mine.hiddenReason}` : '.'}
        </Notice>
      )}
      <StarInput value={rating} onChange={setRating} disabled={busy !== null} />
      <label>
        Nhận xét
        <textarea
          value={comment}
          maxLength={MAX_COMMENT}
          rows={5}
          disabled={busy !== null}
          onChange={(event) => setComment(event.target.value)}
          className="resize-y rounded-[9px] border border-border-primary bg-surface-input px-[11px] py-2.5 text-sm font-normal text-text-strong outline-0 focus:border-focus-ring focus:ring-[3px] focus:ring-primary/10"
        />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {mine && (
          <Button
            type="button"
            variant="danger"
            appearance="ghost"
            size="sm"
            className="mr-auto"
            disabled={busy !== null}
            onClick={() => void run('delete')}
          >
            {busy === 'delete' ? 'Đang xóa…' : 'Xóa đánh giá'}
          </Button>
        )}
        <Button type="button" appearance="outline" size="sm" disabled={busy !== null} onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={!rating || busy !== null}>
          {busy === 'save' ? 'Đang lưu…' : 'Gửi đánh giá'}
        </Button>
      </div>
    </form>
  )
}

function ReviewFormDialog({ open, onClose, ...props }: ReviewFormDialogProps) {
  const [busy, setBusy] = useState<Busy>(null)
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={props.mine ? 'Sửa đánh giá' : 'Đánh giá khóa học'} maxWidth={520}>
      {open && <ReviewForm {...props} onClose={onClose} busy={busy} setBusy={setBusy} />}
    </Modal>
  )
}

export default ReviewFormDialog
