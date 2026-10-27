import { useState } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Field from '../../console/form-field'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'
import {
  importWorkbook,
  MasterDataImportRejected,
  type ImportResult,
  type ValidationItem,
} from '../../../services/masterDataService'
import { crudError } from '../crud/crud-errors'
import { TABLE_TABS } from './master-data-labels'

function ReportTable({ items, tone }: { items: ValidationItem[]; tone: 'danger' | 'warning' }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-card-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-background-gray-secondary text-xs text-text-tertiary">
          <tr>
            <th className="px-3 py-2 font-medium">Sheet</th>
            <th className="px-3 py-2 font-medium">Dòng</th>
            <th className="px-3 py-2 font-medium">Cột</th>
            <th className="px-3 py-2 font-medium">Nội dung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {items.map((item, index) => (
            <tr key={index} className={tone === 'danger' ? 'text-danger' : 'text-text-primary'}>
              <td className="px-3 py-2 whitespace-nowrap">{item.sheetName}</td>
              <td className="px-3 py-2">{item.rowNumber || '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{item.columnName || '—'}</td>
              <td className="px-3 py-2">{item.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Upload one subject's workbook; it becomes a DRAFT, or comes back with the backend's report. */
export default function MasterDataImportDialog({
  categories,
  initialCategoryId,
  onClose,
  onImported,
}: {
  categories: { id: string; name: string }[]
  initialCategoryId: string | null
  onClose: () => void
  onImported: (categoryId: string, result: ImportResult) => void
}) {
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? 'NONE')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rejected, setRejected] = useState<MasterDataImportRejected | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function submit() {
    if (!file || categoryId === 'NONE' || busy) return
    setBusy(true)
    setError('')
    setRejected(null)
    try {
      setResult(await importWorkbook(categoryId, file))
    } catch (err) {
      if (err instanceof MasterDataImportRejected) setRejected(err)
      else setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  const footer = result ? (
    <>
      <Button appearance="outline" onClick={onClose}>
        Đóng
      </Button>
      <Button onClick={() => onImported(categoryId, result)}>Xem bản nháp</Button>
    </>
  ) : (
    <>
      <Button appearance="outline" onClick={onClose} disabled={busy}>
        Hủy
      </Button>
      <Button onClick={() => void submit()} disabled={busy || !file || categoryId === 'NONE'}>
        {busy ? 'Đang kiểm tra...' : 'Nhập file'}
      </Button>
    </>
  )

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      maxWidth={720}
      title="Nhập master data từ Excel"
      description="File được kiểm tra đủ 7 sheet trước khi lưu. File hợp lệ thành bản nháp, chưa ảnh hưởng bài học và câu hỏi cho tới khi kích hoạt."
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        {result ? (
          <>
            <Notice tone="info">
              <span role="status">
                Đã nhập phiên bản {result.version} thành bản nháp.
              </span>
            </Notice>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {TABLE_TABS.map((tab) => (
                <div key={tab.id}>
                  <dt className="text-xs text-text-tertiary">{tab.label}</dt>
                  <dd className="mt-1 font-medium text-text-primary">{result.summary?.[tab.sheet] ?? '—'}</dd>
                </div>
              ))}
            </dl>
            {result.warnings?.length > 0 && (
              <>
                <p className="text-sm font-medium text-text-primary">{result.warnings.length} cảnh báo</p>
                <ReportTable items={result.warnings} tone="warning" />
              </>
            )}
          </>
        ) : (
          <>
            <Field label="Môn học">
              <SelectField
                ariaLabel="Môn học"
                value={categoryId}
                onChange={setCategoryId}
                disabled={busy}
                options={[
                  { id: 'NONE', label: 'Chọn môn' },
                  ...categories.map((category) => ({ id: category.id, label: category.name })),
                ]}
              />
            </Field>
            <Field label="File Excel" hint="Workbook 7 sheet: Domains, Courses_Modules, Question_Types, Skills, Micro_Skills, Mappings, Error_Codes.">
              <input
                type="file"
                accept=".xlsx"
                disabled={busy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setRejected(null)
                  setError('')
                }}
                className="w-full rounded-xl border border-card-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-background-gray-secondary file:px-3 file:py-2 file:text-text-primary"
              />
            </Field>
            {error && (
              <Notice tone="danger">
                <span role="alert">{error}</span>
              </Notice>
            )}
            {rejected && (
              <>
                <Notice tone="danger">
                  <span role="alert">
                    File chưa được nhập: {rejected.report.errors.length} lỗi
                    {rejected.report.warnings.length ? `, ${rejected.report.warnings.length} cảnh báo` : ''}. Sửa trong
                    Excel rồi nhập lại.
                  </span>
                </Notice>
                <ReportTable items={rejected.report.errors} tone="danger" />
                {rejected.report.warnings.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-text-primary">Cảnh báo</p>
                    <ReportTable items={rejected.report.warnings} tone="warning" />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ConsoleDialog>
  )
}
