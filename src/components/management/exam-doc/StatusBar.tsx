import { useEditorState, type Editor } from '@tiptap/react'
import { docTextStats } from './doc-outline'
import { useExamDoc } from './exam-doc-context'

function selectWords(editor: Editor | null) {
  return editor && !editor.isDestroyed ? docTextStats(editor.state.doc).words : 0
}

/** Bottom bar: the page and word counts of the sheet. The structured mode shows no sheet, so it has no bar. */
export default function StatusBar() {
  const { editor, pages, mode } = useExamDoc()
  // Reads `editor` from the closure so a document loaded before any transaction is still counted.
  const words = useEditorState({ editor, selector: () => selectWords(editor) }) ?? 0
  if (mode === 'STRUCTURED') return null
  return (
    <div className="exam-doc-ui flex h-11 shrink-0 items-center border-t border-card-border px-2">
      <span className="ml-auto shrink-0 px-2 text-xs whitespace-nowrap text-text-tertiary tabular-nums">
        {pages.toLocaleString('vi-VN')} trang · {words.toLocaleString('vi-VN')} từ
      </span>
    </div>
  )
}
