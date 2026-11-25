import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import { ArrowDown, ArrowUp, Trash2 } from '../../console/icons'
import type { DraftSection } from './exam-draft'

export default function QuizSectionControls({ section, position, busy, canMoveUp, canMoveDown, onTitleChange, onMove, onRemove }: {
  section: DraftSection
  position: number
  busy: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onTitleChange: (title: string) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 pt-4 sm:px-6">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-text-tertiary">
        <span>Phần {position} · {section.questions.length} câu</span>
        <input className={fieldControlClass} value={section.title} onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Tên phần" disabled={busy} />
      </label>
      <div className="flex shrink-0 gap-1">
        <Button appearance="outline" size="icon" aria-label="Đưa phần lên" disabled={busy || !canMoveUp} onClick={() => onMove(-1)}><ArrowUp size={15} /></Button>
        <Button appearance="outline" size="icon" aria-label="Đưa phần xuống" disabled={busy || !canMoveDown} onClick={() => onMove(1)}><ArrowDown size={15} /></Button>
        <Button variant="danger" appearance="ghost" size="icon" aria-label={`Xóa phần ${position}`} disabled={busy} onClick={onRemove}><Trash2 size={15} /></Button>
      </div>
    </div>
  )
}
