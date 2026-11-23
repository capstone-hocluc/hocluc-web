import { useState } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import { setQuestionLabel } from '../../../services/quizLabelService'
import { fieldControlClass } from '../../console/form-field'
import Button from '../../console/button'
import StatusBadge from '../../console/status'
import { Skeleton } from '../../tailgrids/core/skeleton'
import type { QuizLabelResource } from './useQuizLabels'

export default function QuizQuestionSkill({ quizId, questionId, resource }: {
  quizId: string
  questionId: string
  resource: QuizLabelResource
}) {
  const [editing, setEditing] = useState(false)
  const [pattern, setPattern] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const label = resource.data?.labels.find(item => item.questionId === questionId)
  const patterns = resource.data?.patterns ?? []
  const skill = label?.microSkillCode ?? label?.primarySkillCode
  const description = label?.state === 'STALE' ? 'Cần gắn lại kỹ năng' :
    skill ? `${skill}${label?.counts ? '' : ' · Chờ duyệt'}` :
      label ? 'Không tìm được kỹ năng' : 'Chưa gắn kỹ năng'

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const changed = await setQuestionLabel(quizId, questionId, pattern || null)
      resource.setData(current => current && {
        ...current,
        labels: [...current.labels.filter(item => item.questionId !== questionId), changed],
      })
      setEditing(false)
    } catch (failure) {
      setError(getErrorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  if (resource.status === 'loading' && !resource.data) return <Skeleton className="h-6 w-28" aria-label="Đang tải nhãn kỹ năng" />
  if (!resource.data) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <StatusBadge tone={label?.counts ? 'success' : 'warning'}>{description}</StatusBadge>
      {editing ? (
        <>
          <select aria-label="Dạng câu để gắn kỹ năng" className={fieldControlClass} value={pattern} disabled={busy}
            onChange={event => setPattern(event.target.value)}>
            <option value="">Bỏ nhãn</option>
            {patterns.map(item => <option key={item.code} value={item.code}>{item.subject} · {item.name}</option>)}
          </select>
          <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>Lưu nhãn</Button>
          <Button type="button" size="sm" appearance="ghost" disabled={busy} onClick={() => setEditing(false)}>Hủy</Button>
        </>
      ) : (patterns.length > 0 || label) && (
        <Button type="button" size="sm" appearance="ghost" onClick={() => {
          setPattern(patterns.some(item => item.code === label?.patternCode) ? label?.patternCode ?? '' : '')
          setError('')
          setEditing(true)
        }}>Sửa nhãn</Button>
      )}
      {error && <span className="text-xs text-badge-error-text" role="alert">{error}</span>}
    </div>
  )
}
