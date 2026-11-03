import { useState } from 'react'
import ConfirmDialog from '../../console/confirm-dialog'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Notice from '../../console/notice'
import { deleteLabel, type MasterDataContent } from '../../../services/masterDataService'
import {
  deleteBlockers,
  KIND_NOUNS,
  masterDataError,
  SEGMENTS,
  type EditKind,
} from './master-data-rules'

export interface DeleteTarget {
  kind: EditKind
  id: string
  code: string
  name: string
}

/**
 * Removes one label of a draft. A label something else still uses cannot go, so the dialog lists
 * those users instead of offering the delete the server would refuse.
 */
export default function MasterDataDeleteDialog({
  target,
  versionId,
  content,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget
  versionId: string
  content: MasterDataContent
  onClose: () => void
  onDeleted: (notice: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const noun = KIND_NOUNS[target.kind]
  const blockers =
    target.kind === 'mappings' ? [] : deleteBlockers(target.kind, target.code, content)

  if (blockers.length) {
    return (
      <ConsoleDialog
        open
        title={`Chưa xóa được ${noun} "${target.name}"`}
        onClose={onClose}
        footer={
          <Button appearance="outline" onClick={onClose}>
            Đóng
          </Button>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-text-primary">
            Các mục sau vẫn đang dùng {noun} này. Đổi hoặc xóa chúng trước.
          </p>
          {blockers.map((blocker) => (
            <div key={blocker.label}>
              <p className="text-xs font-medium text-text-tertiary">{blocker.label}</p>
              <ul className="mt-1 list-disc pl-5 text-text-primary">
                {blocker.names.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ConsoleDialog>
    )
  }

  const mapping =
    target.kind === 'mappings' ? content.mappings.find((m) => m.id === target.id) : undefined
  const patternLinks =
    target.kind === 'patterns'
      ? content.mappings.filter((m) => m.patternCode === target.code).length
      : 0

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await deleteLabel(versionId, SEGMENTS[target.kind], target.id)
      onDeleted(`Đã xóa ${noun} "${target.name}".`)
    } catch (err) {
      setError(masterDataError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      title={`Xóa ${noun} "${target.name}"?`}
      description={
        <span className="flex flex-col gap-3">
          {patternLinks > 0 && (
            <span>{patternLinks} liên kết kỹ năng của dạng câu này cũng bị xóa theo.</span>
          )}
          {mapping?.role === 'PRIMARY' && (
            <span>
              Đây là kỹ năng chính của dạng câu. Sau khi xóa, phiên bản chỉ kích hoạt được khi dạng
              câu có lại một kỹ năng chính.
            </span>
          )}
          <span>Chỉ bản nháp này thay đổi; phiên bản đang dùng giữ nguyên.</span>
          {error && (
            <Notice tone="danger">
              <span role="alert">{error}</span>
            </Notice>
          )}
        </span>
      }
      cancelLabel="Hủy"
      confirmLabel="Xóa"
      busyLabel="Đang xóa..."
      variant="danger"
      busy={busy}
      onCancel={onClose}
      onConfirm={() => void confirm()}
    />
  )
}
