import Button from '../../console/button'
import { fieldControlClass } from '../../console/form-field'
import { ArrowDown, ArrowUp, Trash2 } from '../../console/icons'

/** The name of an exam's part, with the controls that move or remove it. */
export default function ExamSectionFields({ title, position, questionCount, busy, canMoveUp, canMoveDown, onRename, onMove, onRemove }: {
  title: string
  /** Its place among the parts, from 1. */
  position: number
  questionCount: number
  busy: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onRename: (title: string) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-text-tertiary">
        <span>Phần {position} · {questionCount} câu</span>
        <input
          className={fieldControlClass}
          value={title}
          onChange={(event) => onRename(event.target.value)}
          placeholder="Tên phần thi, ví dụ: Tư duy định lượng"
          disabled={busy}
        />
      </label>
      <div className="flex shrink-0 gap-1">
        <Button appearance="outline" size="icon" aria-label="Đưa phần lên" disabled={busy || !canMoveUp} onClick={() => onMove(-1)}><ArrowUp size={15} /></Button>
        <Button appearance="outline" size="icon" aria-label="Đưa phần xuống" disabled={busy || !canMoveDown} onClick={() => onMove(1)}><ArrowDown size={15} /></Button>
        <Button variant="danger" appearance="ghost" size="icon" aria-label={`Xóa phần ${position}`} disabled={busy} onClick={onRemove}><Trash2 size={15} /></Button>
      </div>
    </div>
  )
}
