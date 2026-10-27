import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import {
  importMasterData,
  reportOf,
  type MasterDataImportResult,
  type MasterDataReport,
} from '../../../services/masterDataService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'

const MAX_SHOWN = 50

export default function MasterDataImportDialog({
  categoryId,
  onClose,
  onImported,
}: {
  categoryId: string
  onClose: () => void
  onImported: (result: MasterDataImportResult) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<MasterDataReport | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError('')
    setReport(null)
    try {
      onImported(await importMasterData(categoryId, file))
    } catch (reason) {
      setReport(reportOf(reason))
      setError(getErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Nhập Master Data"
      maxWidth={640}
      dismissable={!busy}
      onSubmit={submit}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={!file || busy}>
            {busy ? 'Đang nhập...' : 'Nhập'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="File Excel">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            className={fieldControlClass}
            disabled={busy}
            onChange={event => {
              setFile(event.target.files?.[0] ?? null)
              setError('')
              setReport(null)
            }}
          />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        {report && report.errors.length > 0 && (
          <ul className="m-0 flex max-h-72 list-none flex-col gap-2 overflow-y-auto p-0 text-sm" aria-label="Lỗi trong file">
            {report.errors.slice(0, MAX_SHOWN).map((issue, index) => (
              <li key={index} className="rounded-lg border border-card-border px-3 py-2 text-text-primary">
                <span className="text-xs text-text-tertiary">
                  {issue.sheetName}
                  {issue.rowNumber > 0 ? ` · dòng ${issue.rowNumber}` : ''}
                  {issue.columnName ? ` · ${issue.columnName}` : ''}
                </span>
                <span className="mt-1 block break-words">{issue.message}</span>
              </li>
            ))}
            {report.errors.length > MAX_SHOWN && (
              <li className="text-xs text-text-tertiary">và {report.errors.length - MAX_SHOWN} lỗi khác</li>
            )}
          </ul>
        )}
      </div>
    </ConsoleDialog>
  )
}
