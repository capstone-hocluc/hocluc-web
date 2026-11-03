import { useState } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import { cloneVersion, type MasterDataVersion } from '../../../services/masterDataService'
import { masterDataError, suggestVersionLabel } from './master-data-rules'

/**
 * Copies the version on screen into a new draft: the version in use stays as it is until the draft
 * is activated. An existing draft of the subject is offered first, so two drafts do not drift apart.
 */
export default function MasterDataCloneDialog({
  version,
  versions,
  onClose,
  onOpenDraft,
  onCloned,
}: {
  version: MasterDataVersion
  versions: MasterDataVersion[]
  onClose: () => void
  onOpenDraft: (id: string) => void
  onCloned: (draft: MasterDataVersion) => void
}) {
  const [label, setLabel] = useState(() => suggestVersionLabel(version.version, versions))
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const drafts = versions.filter((v) => v.status === 'DRAFT')

  async function submit() {
    const name = label.trim()
    if (!name) return setError('Nhập tên phiên bản.')
    if (versions.some((v) => v.version === name))
      return setError(`Môn này đã có phiên bản ${name}. Đặt tên khác.`)
    setBusy(true)
    setError('')
    try {
      onCloned(
        await cloneVersion(version.id, { version: name, description: description.trim() || null })
      )
    } catch (err) {
      setError(masterDataError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      title={`Tạo bản nháp từ v${version.version}`}
      onClose={onClose}
      dismissable={!busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang tạo...' : 'Tạo bản nháp'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {drafts.length > 0 && (
          <Notice tone="warning">
            <span className="flex flex-wrap items-center gap-2">
              Môn này đang có bản nháp {drafts.map((d) => `v${d.version}`).join(', ')}.
              {drafts.map((d) => (
                <Button key={d.id} size="sm" appearance="outline" onClick={() => onOpenDraft(d.id)}>
                  Sửa tiếp v{d.version}
                </Button>
              ))}
            </span>
          </Notice>
        )}
        <Field
          label="Tên phiên bản"
          hint="Bản nháp chỉ được dùng cho bài học và câu hỏi sau khi kích hoạt."
        >
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            maxLength={50}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Ghi chú">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            placeholder={`Sao chép từ v${version.version}`}
            className={textareaControlClass}
          />
        </Field>
      </fieldset>
    </ConsoleDialog>
  )
}
