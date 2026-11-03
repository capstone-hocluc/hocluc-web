import { useEffect, useState } from 'react'
import { useEditor, type Editor, type JSONContent } from '@tiptap/react'
import { examDocExtensions } from '../editor-extensions'

const ignoreEdit = () => undefined

/**
 * A read-only editor showing one exam variant on the paged sheets. It is built once, from the document editor's own
 * extension list, and given each variant's content as it changes.
 */
export function useVariantEditor(
  content: JSONContent | null,
  label = 'Mã đề đang xem (chỉ đọc)'
): { editor: Editor | null; pages: number } {
  const [pages, setPages] = useState(1)
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: false,
      extensions: examDocExtensions({ onEditFormula: ignoreEdit, onPages: setPages }),
      editorProps: {
        attributes: { class: 'exam-doc-content', 'aria-label': label, spellcheck: 'false' },
      },
    },
    []
  )

  useEffect(() => {
    if (editor && !editor.isDestroyed && content) editor.commands.setContent(content, { emitUpdate: false })
  }, [editor, content])

  return { editor, pages }
}
