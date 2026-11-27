import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

/**
 * The question a top-level block of the sheet belongs to: its own tag, else the nearest tagged block above it. A
 * shared passage or a heading belongs to the questions after it, so a click there picks the next question.
 */
export function questionAt(editor: Editor, index: number): string | null {
  const doc = editor.state.doc
  for (let at = index; at >= 0; at--) {
    const attrs = doc.child(at).attrs
    if (attrs.examItem) return String(attrs.examItem)
    if (attrs.examGroup || attrs.examPart || doc.child(at).type.name === 'heading') break
  }
  for (let at = index + 1; at < doc.childCount; at++) {
    const item = doc.child(at).attrs.examItem
    if (item) return String(item)
  }
  return null
}

/** A click anywhere on a question on the sheet (its text, picture or options) hands its id to `onPick`. */
export function useSheetPick(editor: Editor | null, onPick: ((questionId: string) => void) | undefined) {
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  }, [onPick])

  const picking = Boolean(onPick)
  useEffect(() => {
    if (!editor || !picking) return
    const dom = editor.view.dom
    const onClick = (event: MouseEvent) => {
      if (editor.isDestroyed) return
      const found = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
      if (!found) return
      const index = editor.state.doc.resolve(Math.min(found.pos, editor.state.doc.content.size)).index(0)
      const id = questionAt(editor, Math.min(index, editor.state.doc.childCount - 1))
      if (id) pick.current?.(id)
    }
    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, picking])
}
