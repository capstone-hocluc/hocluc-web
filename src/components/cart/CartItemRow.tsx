import { useState } from 'react'
import { GraduationCap, Trash2 } from '../console/icons'
import { cartItemIssue, type CartItem } from '../../services/cartService'
import { formatCoursePrice, formatDate, prettifyEnum } from '../../lib/courseFormat'

interface Props {
  item: CartItem
  onRemove: (id: string) => void
  removing: boolean
  disabled?: boolean
}
export default function CartItemRow({ item, onRemove, removing, disabled }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const issue = cartItemIssue(item)
  return (
    <article className={'purchase-course' + (issue ? ' is-ineligible' : '')}>
      <a
        className="purchase-cover"
        href={'/courses/' + encodeURIComponent(item.courseId)}
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.thumbnailUrl && !imageFailed ? (
          <img src={item.thumbnailUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <GraduationCap size={32} />
        )}
      </a>
      <div className="purchase-course-body">
        <h2>
          <a href={'/courses/' + encodeURIComponent(item.courseId)}>{item.title}</a>
        </h2>
        <p className="purchase-muted">
          {prettifyEnum(item.track)}
          {item.endDate && (
            <>
              {item.track ? ' · ' : ''}Đến {formatDate(item.endDate)}
            </>
          )}
        </p>
        {issue && <p className="purchase-line-error">{issue}</p>}
      </div>
      <div className="purchase-course-side">
        <strong>{formatCoursePrice(item.price)}</strong>
        <button
          type="button"
          className="purchase-remove"
          onClick={() => onRemove(item.courseId)}
          disabled={disabled || removing}
          aria-label={'Xóa ' + item.title}
        >
          <Trash2 size={17} />
          {removing ? 'Đang xóa…' : 'Xóa'}
        </button>
      </div>
    </article>
  )
}
