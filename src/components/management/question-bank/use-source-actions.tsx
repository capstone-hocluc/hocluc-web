import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../../lib/errors'
import {
  getBankLabelling,
  labelBankSource,
  retryBankSource,
  type BankLabelling,
  type BankSource,
} from '../../../services/questionBankService'
import ConfirmDialog from '../../console/confirm-dialog'
import BankImportDialog from './BankImportDialog'

/**
 * What can be done to a loaded paper besides opening it: have Jev label it, or load it again (from its kept files, or
 * by uploading them again). Each asks first; `dialogs` must be rendered. `onChanged` runs once a paper is queued.
 * Whether Jev can label is only asked while `watchLabelling` (a page that shows no paper need not know).
 */
export function useSourceActions(
  onChanged: (source: BankSource) => void,
  { watchLabelling = true }: { watchLabelling?: boolean } = {}
) {
  const [labelling, setLabelling] = useState<BankLabelling | null>(null)
  const [labelTarget, setLabelTarget] = useState<BankSource | null>(null)
  const [labelBusy, setLabelBusy] = useState(false)
  const [retrying, setRetrying] = useState<BankSource | null>(null)
  const [retryBusy, setRetryBusy] = useState(false)
  const [reloading, setReloading] = useState<BankSource | null>(null)
  const [actionError, setActionError] = useState('')
  // read by callbacks made once (table row actions): the latest answer, not the one they were made with
  const labellingRef = useRef<BankLabelling | null>(null)
  useEffect(() => {
    labellingRef.current = labelling
  }, [labelling])
  const changed = useRef(onChanged)
  useEffect(() => {
    changed.current = onChanged
  })

  /** Whether Jev can label is asked again with each list refresh: importing Master Data elsewhere changes it. */
  const refreshLabelling = useCallback(() => {
    getBankLabelling()
      .then(setLabelling)
      .catch(() => undefined)
  }, [])
  useEffect(() => {
    if (watchLabelling) refreshLabelling()
  }, [watchLabelling, refreshLabelling])

  /** Jev labels what has no label yet, after a confirmation; when it cannot label now, the reason is shown instead. */
  const askLabelling = useCallback((source: BankSource) => {
    setActionError('')
    const now = labellingRef.current
    if (now && !now.ready) setActionError(now.reason ?? 'Jev chưa gán nhãn được.')
    else setLabelTarget(source)
  }, [])

  /** From the kept files after a confirmation; a paper whose files were not kept is uploaded again. */
  const loadAgain = useCallback((source: BankSource) => {
    setActionError('')
    if (source.retryable) setRetrying(source)
    else setReloading(source)
  }, [])

  async function confirmLabelling() {
    if (!labelTarget || labelBusy) return
    setLabelBusy(true)
    try {
      changed.current(await labelBankSource(labelTarget.id))
      setLabelTarget(null)
    } catch (reason) {
      setLabelTarget(null)
      setActionError(getErrorMessage(reason))
    } finally {
      setLabelBusy(false)
    }
  }

  async function confirmRetry() {
    if (!retrying || retryBusy) return
    setRetryBusy(true)
    try {
      changed.current(await retryBankSource(retrying.id))
      setRetrying(null)
    } catch (reason) {
      setRetrying(null)
      setActionError(getErrorMessage(reason))
    } finally {
      setRetryBusy(false)
    }
  }

  const dialogs = (
    <>
      {labelTarget && (
        <ConfirmDialog
          title={`Gán nhãn đề ${labelTarget.title}?`}
          description={`Jev gán nhãn ${labelTarget.unlabelledCount} câu chưa có nhãn theo khung đề thi đang dùng. Đề không bị đọc lại; Jev tốn ít token.`}
          cancelLabel="Hủy"
          confirmLabel="Gán nhãn"
          busy={labelBusy}
          busyLabel="Đang gửi..."
          onCancel={() => setLabelTarget(null)}
          onConfirm={confirmLabelling}
        />
      )}
      {retrying && (
        <ConfirmDialog
          title={`Nạp lại đề ${retrying.title}?`}
          description="AI đọc lại đề từ file đã lưu, tốn token cho phần chưa đọc được. Đề được xếp hàng và xử lý nền."
          cancelLabel="Hủy"
          confirmLabel="Nạp lại"
          busy={retryBusy}
          busyLabel="Đang gửi..."
          onCancel={() => setRetrying(null)}
          onConfirm={confirmRetry}
        />
      )}
      {reloading && (
        <BankImportDialog
          again={reloading}
          onClose={() => setReloading(null)}
          onQueued={(source) => {
            setReloading(null)
            changed.current(source)
          }}
        />
      )}
    </>
  )

  return { labelling, refreshLabelling, askLabelling, loadAgain, actionError, setActionError, dialogs }
}
