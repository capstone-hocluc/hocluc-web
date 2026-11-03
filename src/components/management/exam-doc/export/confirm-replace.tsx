import { createRoot } from 'react-dom/client'
import ConfirmDialog from '../../../console/confirm-dialog'

/**
 * Asks before an opened file replaces the document. The menu that started the import has closed by now, so the
 * dialog gets a root of its own and goes away with its answer.
 */
export function confirmReplace(fileName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    let answered = false
    const answer = (replace: boolean) => {
      if (answered) return
      answered = true
      resolve(replace)
      // Unmounted after the click that answered has finished.
      window.setTimeout(() => {
        root.unmount()
        host.remove()
      }, 0)
    }
    root.render(
      <ConfirmDialog
        title="Thay nội dung hiện tại?"
        description={fileName}
        cancelLabel="Huỷ"
        confirmLabel="Thay nội dung"
        onCancel={() => answer(false)}
        onConfirm={() => answer(true)}
      />
    )
  })
}
