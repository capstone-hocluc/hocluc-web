// The header's "Xuất bản": the exam goes out as a course quiz or mock exam, or as a Word or PDF file. What goes out
// this way moves the exam to the published ones of the list; a file downloaded from the File menu does not.
import * as Menu from '@radix-ui/react-dropdown-menu'
import { FileFormatPdf, FileText } from '@tailgrids/icons'
import Button from '../../console/button'
import { ChevronDown, ClipboardList, Send } from '../../console/icons'
import { useExamDoc } from '../exam-doc/exam-doc-context'
import { downloadDocument, downloadPdf, usePdfJob } from '../exam-doc/export'
import { MenuContent, MenuItem, MenuSeparator } from '../exam-doc/menubar/menu-ui'
import { FREE_MODE_ONLY } from '../exam-doc/menubar/menus'

interface PublishMenuProps {
  /** Given when the exam can become a quiz: opens the export dialog. */
  onQuiz?: () => void
  onPublished: (as: 'DOCX' | 'PDF') => void
}

export default function PublishMenu({ onQuiz, onPublished }: PublishMenuProps) {
  const { editor, mode } = useExamDoc()
  const pdfJob = usePdfJob()
  // Files are written from the free document; the structured mode shows only the questions.
  const structured = mode === 'STRUCTURED'
  const title = structured ? FREE_MODE_ONLY : undefined
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <Button size="sm" aria-label="Xuất bản" title="Xuất bản">
          <Send size={15} />
          <span className="hidden lg:inline">Xuất bản</span>
          <ChevronDown size={14} />
        </Button>
      </Menu.Trigger>
      <MenuContent align="end">
        {onQuiz && (
          <>
            <MenuItem label="Thành quiz / đề thi…" icon={ClipboardList} onSelect={onQuiz} />
            <MenuSeparator />
          </>
        )}
        <MenuItem
          label="Word (.docx)"
          icon={FileText}
          disabled={structured || !editor}
          title={title}
          onSelect={() => {
            if (editor) void downloadDocument(editor, 'docx').then((made) => made && onPublished('DOCX'))
          }}
        />
        <MenuItem
          label={pdfJob === 'full' ? 'Đang tạo PDF…' : 'PDF (.pdf)'}
          icon={FileFormatPdf}
          disabled={structured || !editor || pdfJob !== null}
          title={title}
          onSelect={(event) => {
            // The menu stays open while the file is made, so the item can show it.
            event.preventDefault()
            if (editor) void downloadPdf(editor).then((made) => made && onPublished('PDF'))
          }}
        />
      </MenuContent>
    </Menu.Root>
  )
}
