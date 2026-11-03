import type { Editor, JSONContent } from '@tiptap/core'
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model'
import { outlineOf } from '../doc-outline'
import { selectionInsertRange } from '../nodes/insert-position'
import type { ExamSnippet } from './snippets'

/** Drag data type of a snippet card; the value is the snippet id. */
export const SNIPPET_MIME = 'application/x-hocluc-snippet'

const QUESTION_NUMBER = /^câu\s+(\d+)/iu

/** The number after the last "Câu k" line of the document (as the outline reads them), 1 when there is none. */
export function nextQuestionNumber(doc: ProseMirrorNode): number {
  const items = outlineOf(doc)
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const match = items[index].level === 4 ? QUESTION_NUMBER.exec(items[index].text) : null
    if (match) return Number(match[1]) + 1
  }
  return 1
}

/** The snippet's blocks, its question line numbered after the document's last question. */
export function snippetContent(snippet: ExamSnippet, doc: ProseMirrorNode): JSONContent[] {
  return snippet.build({ nextQuestion: nextQuestionNumber(doc) })
}

/** The blocks as a closed slice of `schema`, or null when they do not fit it. */
export function contentSlice(schema: Schema, content: JSONContent[]): Slice | null {
  try {
    return new Slice(Fragment.fromArray(content.map((json) => schema.nodeFromJSON(json))), 0, 0)
  } catch {
    return null
  }
}

/** Inserts the snippet at the caret, between blocks (see `blockInsertRange`), as one undo step. */
export function insertSnippet(editor: Editor, snippet: ExamSnippet): boolean {
  if (editor.isDestroyed || !editor.isEditable) return false
  const content = snippetContent(snippet, editor.state.doc)
  return editor
    .chain()
    .focus()
    .insertContentAt(selectionInsertRange(editor.state.selection), content)
    .scrollIntoView()
    .run()
}

const snippetDrags = new WeakSet<Slice>()

/**
 * While a snippet is dragged the editor holds its blocks as the dragged slice, so the drop cursor shows the line
 * between blocks where the drop will land (the drop itself is handled by `SnippetDrop`).
 */
export function beginSnippetDrag(editor: Editor, snippet: ExamSnippet) {
  if (editor.isDestroyed) return
  const slice = contentSlice(editor.schema, snippetContent(snippet, editor.state.doc))
  if (!slice) return
  snippetDrags.add(slice)
  editor.view.dragging = { slice, move: false }
}

/** Forgets the dragged snippet when the drag ends anywhere, dropped or not. */
export function endSnippetDrag(editor: Editor) {
  if (editor.isDestroyed) return
  const { dragging } = editor.view
  if (dragging && snippetDrags.has(dragging.slice)) editor.view.dragging = null
}
