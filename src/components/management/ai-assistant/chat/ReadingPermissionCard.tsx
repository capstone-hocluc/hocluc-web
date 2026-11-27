import { useId } from 'react'
import type { DataMessagePartProps } from '@assistant-ui/react'
import Button from '../../../console/button'
import { useChatActions } from './chat-actions'
import type { ReadingPermissionPart } from './reading-permission'

export default function ReadingPermissionCard({ data }: DataMessagePartProps<ReadingPermissionPart>) {
  const titleId = useId()
  const { onAnswerReadingPermission } = useChatActions()
  const { messageId, parts, state } = data
  const decision = state === 'ALLOWED' ? 'Đã cho phép' : state === 'DECLINED' ? 'Đã bỏ phần đọc hiểu' : null
  const disabled = state !== 'actionable' || !onAnswerReadingPermission

  return (
    <section aria-labelledby={titleId} className="mt-3 flex min-w-0 flex-col gap-2 rounded-xl border border-card-border bg-card-background p-3">
      <h3 id={titleId} className="m-0 text-sm font-semibold text-text-primary">Cho phép soạn câu đọc hiểu?</h3>
      {parts.length > 0 && (
        <ul className="m-0 list-disc space-y-1 pl-4 text-sm text-text-secondary">
          {parts.map((part, index) => <li key={index} className="wrap-break-word">{part}</li>)}
        </ul>
      )}
      {decision ? <p role="status" className="m-0 text-sm font-medium text-text-primary">{decision}</p> : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={disabled} onClick={() => onAnswerReadingPermission?.(messageId, true)}>Cho phép</Button>
          <Button type="button" size="sm" appearance="outline" disabled={disabled} onClick={() => onAnswerReadingPermission?.(messageId, false)}>Bỏ phần đọc hiểu</Button>
        </div>
      )}
    </section>
  )
}
