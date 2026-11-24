import Button from '../../console/button'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import ConsoleSheet from '../../console/sheet'
import ExamRuleFields from './ExamRuleFields'
import ExamScheduleFields from './ExamScheduleFields'
import type { ExamSettings } from './exam-settings'

/**
 * Every setting of an exam being edited, in a side panel over its questions. Changes stay in the editor's form until
 * it is saved.
 */
export default function ExamSettingsSheet({
  open, onClose, docked, placement, settings, onChange, courseName, error, nameDisabled, rulesDisabled, locked, published, fromRequired, untilRequired,
}: {
  open: boolean
  onClose: () => void
  /** A card beside the questions instead of a drawer over them. */
  docked?: boolean
  /** Why the last save stopped, shown here too since the panel covers the editor's own message. */
  error: string
  placement: boolean
  settings: ExamSettings
  onChange: <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => void
  courseName: string
  nameDisabled: boolean
  rulesDisabled: boolean
  /** Learners have sat the exam: only its name and description may change. */
  locked: boolean
  /** Published or archived: shown read-only. */
  published: boolean
  fromRequired: boolean
  untilRequired: boolean
}) {
  return (
    <ConsoleSheet open={open} onClose={onClose} docked={docked} title={placement ? 'Thiết lập bài đánh giá' : 'Thiết lập đề thi'}>
      <div className="flex flex-col gap-4">
        {error && <Notice tone="danger" role="alert">{error}</Notice>}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          {placement ? 'Tên bài đánh giá đầu vào' : 'Tên đề thi thử'}
          <input className={fieldControlClass} value={settings.title} maxLength={500} disabled={nameDisabled}
            onChange={(event) => onChange('title', event.target.value)} />
        </label>
        {placement ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Mô tả
              <textarea className={textareaControlClass} value={settings.description} disabled={nameDisabled} aria-describedby="placement-description-note"
                onChange={(event) => onChange('description', event.target.value)} />
            </label>
            <span id="placement-description-note" className="text-xs text-text-tertiary">Không gắn khóa học. Học viên được xem đáp án sau khi bài đã chấm; kết quả được phân loại theo môn.</span>
          </div>
        ) : (
          <p className="m-0 text-sm">
            <span className="block text-xs font-medium text-text-tertiary">Khóa học</span>
            <strong className="text-text-primary">{courseName}</strong>
          </p>
        )}
        <ExamRuleFields settings={settings} onChange={onChange} placement={placement} disabled={rulesDisabled} />
        {!placement && (
          <ExamScheduleFields settings={settings} onChange={onChange} disabled={rulesDisabled}
            fromRequired={fromRequired} untilRequired={untilRequired} />
        )}
        {locked && <Notice tone="warning">Đề đã có lượt thi. Các quy định và câu hỏi được khóa; bạn vẫn có thể đổi tên đề.</Notice>}
        {published && <Notice tone="info">Đề đã xuất bản hoặc lưu trữ được mở chỉ xem. Hãy tạo bản nháp để chỉnh sửa nhằm giữ nguyên đề gốc.</Notice>}
        <Button className="self-end" onClick={onClose}>Xong</Button>
      </div>
    </ConsoleSheet>
  )
}
