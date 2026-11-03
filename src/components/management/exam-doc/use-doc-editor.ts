import { useEffect } from 'react'
import { useEditor, type Editor, type JSONContent } from '@tiptap/react'
import { examDocExtensions } from './editor-extensions'
import type { MathOptions } from './extensions'

const ignorePages = () => undefined

/** The document each editor instance was built from, recorded while the instance is constructed. */
const builtFrom = new WeakMap<Editor, JSONContent | null>()

interface DocEditorOptions {
  /** Null while the document loads; the editor is rebuilt when a different document is loaded. */
  content: JSONContent | null
  onChange: (content: JSONContent) => void
  /** Must be stable (it is fixed into the editor's math extension when the editor is built). */
  onEditFormula: MathOptions['onEdit']
  /** Page count of the A4 print layout, reported when it changes. Must be stable, like `onEditFormula`. */
  onPages?: (pages: number) => void
}

/**
 * The Tiptap editor of the exam document, with the marks and nodes the toolbar and menus drive.
 *
 * `useEditor` swaps instances in an effect: in the commit where `content` changes it destroys the previous editor
 * and creates the next one, but this render still holds the previous one. Handing that out would let effects of
 * the same commit read or dispatch on a destroyed editor - its empty document would then reach the saver of the
 * newly loaded one and be saved over it. So an editor is only returned for the content it was built from (null for
 * that one commit).
 */
export function useDocEditor({ content, onChange, onEditFormula, onPages = ignorePages }: DocEditorOptions): Editor | null {
  const instance = useEditor(
    {
      immediatelyRender: false,
      editable: content !== null,
      content: content ?? undefined,
      extensions: examDocExtensions({ onEditFormula, onPages }),
      editorProps: {
        attributes: { class: 'exam-doc-content', 'aria-label': 'Nội dung đề', spellcheck: 'false' },
      },
      // Synchronous, inside the constructor: the instance is tagged before anything can use it.
      onBeforeCreate: ({ editor: created }) => {
        builtFrom.set(created, content)
      },
    },
    [content]
  )
  const editor = instance && builtFrom.get(instance) === content ? instance : null

  // Every change is handed over; the document hook debounces the saving, so nothing is lost on a switch.
  useEffect(() => {
    if (!editor) return
    const update = ({ editor: changed }: { editor: Editor }) => {
      if (changed === editor) onChange(changed.getJSON())
    }
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor, onChange])

  return editor
}
