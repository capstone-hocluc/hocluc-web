import { useState } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { cancelQuizLabelling, runQuizLabelling } from '../../../services/quizLabelService'
import Button from '../../console/button'
import { Skeleton } from '../../tailgrids/core/skeleton'
import type { QuizLabelResource } from './useQuizLabels'

export default function QuizLabelRun({ quizId, resource }: { quizId: string; resource: QuizLabelResource }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const status = resource.data?.status
  const active = status === 'PENDING' || status === 'RUNNING'
  const message = status === 'PENDING' ? 'Đang chờ gắn kỹ năng' :
    status === 'RUNNING' ? 'Đang gắn kỹ năng' :
      status === 'FAILED' ? 'Gắn kỹ năng thất bại' :
        status === 'CANCELLED' ? 'Đã dừng gắn kỹ năng' :
          status ? 'Đã gắn kỹ năng' : null

  const act = async () => {
    setBusy(true)
    setError('')
    try {
      if (active) await cancelQuizLabelling(quizId)
      else await runQuizLabelling(quizId)
      resource.reload()
    } catch (failure) {
      setError(getErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  if (resource.status === 'loading') return <Skeleton className="h-9 w-32" aria-label="Đang tải trạng thái gắn kỹ năng" />
  if (resource.status !== 'ready') {
    return <Button type="button" appearance="outline" onClick={resource.reload}>Tải lại nhãn kỹ năng</Button>
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" appearance="outline" disabled={busy} onClick={() => void act()}>
        {active ? 'Dừng gắn kỹ năng' : 'Gắn kỹ năng'}
      </Button>
      {message && <span className="text-xs text-text-tertiary" role="status">{message} {active && resource.data?.progress}</span>}
      {error && <span className="text-xs text-badge-error-text" role="alert">{error}</span>}
    </div>
  )
}
