import type { Editor } from '@tiptap/react'
import Button from '../../../console/button'
import ConsoleDialog from '../../../console/dialog'
import { docTextStats } from '../doc-outline'

interface WordCountDialogProps {
  editor: Editor
  pages: number
  onClose: () => void
}

/** Page, word and character counts of the document. Mounted only while open. */
export default function WordCountDialog({ editor, pages, onClose }: WordCountDialogProps) {
  const { words, characters } = docTextStats(editor.state.doc)
  const rows = [
    { label: 'Trang', value: pages },
    { label: 'Từ', value: words },
    { label: 'Ký tự', value: characters },
  ]

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      title="Đếm từ"
      maxWidth={360}
      footer={
        <Button type="button" onClick={onClose} aria-label="Đóng" title="Đóng">
          Đóng
        </Button>
      }
    >
      <dl className="flex flex-col divide-y divide-card-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-text-secondary">{row.label}</dt>
            <dd className="text-sm font-semibold text-text-primary tabular-nums">
              {row.value.toLocaleString('vi-VN')}
            </dd>
          </div>
        ))}
      </dl>
    </ConsoleDialog>
  )
}
