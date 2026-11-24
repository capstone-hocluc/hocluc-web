import { useMemo } from 'react'
import Button from '../../../console/button'
import { FileText } from '../../../console/icons'
import type { ExamPaper } from '../../ai-assistant/exam-format'
import DocSheet from '../../exam-doc/DocSheet'
import { draftToDoc } from '../../exam-doc/draft-to-doc'
import { ExamDocContext, type ExamDocContextValue } from '../../exam-doc/exam-doc-context'
import { downloadPdf, usePdfBusy } from '../../exam-doc/export'
import { useReadOnlyEditor } from '../../exam-doc/use-read-only-editor'

const noop = () => undefined

/**
 * A quiz on the A4 sheets of the exam workspace, read only: the same paper, fonts and page breaks the AI assistant
 * shows, and the PDF it downloads. Mount it only while it is seen: hidden sheets measure no pages.
 */
export default function QuizSheet({ paper, label }: { paper: ExamPaper; label: string }) {
  const doc = useMemo(() => draftToDoc(paper), [paper])
  const { editor, pages } = useReadOnlyEditor(doc, label)
  const pdfBusy = usePdfBusy()

  const context = useMemo<ExamDocContextValue>(
    () => ({
      editor,
      mode: 'FREE',
      setMode: noop,
      saveState: 'saved',
      saveError: null,
      loading: false,
      zoom: 1,
      setZoom: noop,
      showRuler: false,
      setShowRuler: noop,
      openFormula: noop,
      pages,
    }),
    [editor, pages]
  )

  return (
    <ExamDocContext.Provider value={context}>
      <div className="min-w-0 rounded-xl bg-background-gray-secondary">
        <div className="flex items-center justify-end gap-3 px-4 pt-3">
          <span className="text-xs text-text-tertiary tabular-nums">{pages.toLocaleString('vi-VN')} trang A4</span>
          <Button appearance="outline" disabled={!editor || pdfBusy} onClick={() => editor && void downloadPdf(editor)}>
            <FileText size={16} />
            {pdfBusy ? 'Đang tạo PDF…' : 'Tải PDF'}
          </Button>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <DocSheet />
        </div>
      </div>
    </ExamDocContext.Provider>
  )
}
