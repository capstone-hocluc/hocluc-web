import { useState } from 'react'
import Card, { CardTitle } from '../../console/card'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import type { ExamFileDraft } from './exam-file-draft'

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Lets the PDF be chosen while the exam is still being created, so it is stored (and read) together with the draft. */
export default function ExamFileOnCreate({ value, onChange, disabled }: {
  value: ExamFileDraft
  onChange: (next: ExamFileDraft) => void
  disabled: boolean
}) {
  const [fileError, setFileError] = useState('')
  const patch = (next: Partial<ExamFileDraft>) => onChange({ ...value, ...next })

  return (
    <Card as="section" padding="lg" aria-labelledby="exam-file-create-title">
      <div className="mb-4">
        <CardTitle id="exam-file-create-title" className="mb-0 text-base">Đưa đề PDF thành câu hỏi</CardTitle>
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
          Đề thi dạng PDF
          <input type="file" accept="application/pdf,.pdf" disabled={disabled}
            className="w-full rounded-xl border border-card-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-background-gray-secondary file:px-3 file:py-2 file:text-text-primary"
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null
              setFileError('')
              if (!chosen) { patch({ file: null }); return }
              if (!/\.pdf$/i.test(chosen.name)) { setFileError('AI chỉ đọc file .pdf.'); patch({ file: null }); return }
              if (chosen.size === 0) { setFileError('File đang trống.'); patch({ file: null }); return }
              patch({ file: chosen })
            }} />
        </label>
        {fileError && <p role="alert" className="m-0 text-sm text-badge-danger-text">{fileError}</p>}
        {value.file && <p className="m-0 text-sm text-text-tertiary">{value.file.name} · {formatSize(value.file.size)}. File được lưu cùng bản nháp khi bạn bấm lưu.</p>}
        {value.file && (
          <>
            <Checkbox isSelected={value.read} isDisabled={disabled} onChange={(checked) => patch({ read: checked })} className="text-sm text-text-primary">
              Cho AI đọc ngay sau khi lưu
            </Checkbox>
            {value.read && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                    Từ trang
                    <input inputMode="numeric" className={fieldControlClass} value={value.fromPage} placeholder="1" disabled={disabled}
                      onChange={(event) => patch({ fromPage: event.target.value.replace(/\D/g, '') })} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                    Đến trang
                    <input inputMode="numeric" className={fieldControlClass} value={value.toPage} placeholder="Trang cuối" disabled={disabled}
                      onChange={(event) => patch({ toPage: event.target.value.replace(/\D/g, '') })} />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                  Gợi ý cho AI (không bắt buộc)
                  <textarea className={textareaControlClass} rows={3} value={value.hints} disabled={disabled} maxLength={1000}
                    placeholder="Ví dụ: 120 câu, 3 phần; đáp án ở trang cuối"
                    onChange={(event) => patch({ hints: event.target.value })} />
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
