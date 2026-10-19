import Button from '../../console/button'
import {
  ArrowLeft,
  BookOpen,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Send,
  Trash2,
} from '../../console/icons'
import { RowActions } from '../../console/icon-action'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../tailgrids/core/dropdown'
import type { CourseAdmin } from '../../../services/courseAdminService'
import type { ReviewAction } from './course-review-actions'

export interface CourseRowHandlers {
  onContent: (course: CourseAdmin) => void
  onEdit: (course: CourseAdmin) => void
  onReview: (course: CourseAdmin, action: ReviewAction) => void
  onReject: (course: CourseAdmin) => void
  onDelete: (course: CourseAdmin) => void
}

// The one step a person can take on this course right now: send it, approve it, or put it on sale.
function nextStep(course: CourseAdmin, canReview: boolean, readOnly: boolean) {
  if (course.status === 'PUBLISHED') return null
  if (course.reviewState === 'PENDING') {
    return canReview ? { action: 'approve' as const, label: 'Duyệt và bán' } : null
  }
  if (canReview) return { action: 'sell' as const, label: 'Bán khóa' }
  return readOnly ? null : { action: 'submit' as const, label: 'Gửi duyệt' }
}

const itemClass = 'cursor-pointer px-3 py-2'

// Row actions of the course list: the next review step beside a "more" menu for everything else.
export default function CourseRowActions({
  course,
  canReview,
  readOnly,
  busy,
  handlers,
}: {
  course: CourseAdmin
  canReview: boolean
  readOnly: boolean
  busy: boolean
  handlers: CourseRowHandlers
}) {
  const step = nextStep(course, canReview, readOnly)
  const rejectable = canReview && course.reviewState === 'PENDING'
  const archivable = course.status === 'PUBLISHED' && (!readOnly || canReview)
  const deletable = !readOnly && course.status === 'DRAFT'
  const hasMenu = !readOnly || rejectable || archivable
  return (
    <RowActions>
      {step && (
        <Button size="sm" disabled={busy} onClick={() => handlers.onReview(course, step.action)}>
          {step.action === 'submit' && <Send size={14} />}
          {step.label}
        </Button>
      )}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Thao tác khác với ${course.title}`}
            isDisabled={busy}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-icon-tertiary hover:bg-background-gray-primary hover:text-icon-primary focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent placement="bottom end" className="min-w-48 p-1.5">
            {!readOnly && (
              <DropdownMenuItem className={itemClass} onAction={() => handlers.onContent(course)}>
                <BookOpen size={16} />
                Soạn nội dung
              </DropdownMenuItem>
            )}
            {!readOnly && (
              <DropdownMenuItem className={itemClass} onAction={() => handlers.onEdit(course)}>
                <Pencil size={16} />
                Sửa thông tin
              </DropdownMenuItem>
            )}
            {rejectable && (
              <DropdownMenuItem className={itemClass} onAction={() => handlers.onReject(course)}>
                <ArrowLeft size={16} />
                Trả lại
              </DropdownMenuItem>
            )}
            {archivable && (
              <DropdownMenuItem
                className={itemClass}
                onAction={() => handlers.onReview(course, 'archive')}
              >
                <PackageOpen size={16} />
                Lưu trữ
              </DropdownMenuItem>
            )}
            {deletable && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  className={`${itemClass} text-danger focus:text-danger`}
                  onAction={() => handlers.onDelete(course)}
                >
                  <Trash2 size={16} />
                  Xóa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </RowActions>
  )
}
