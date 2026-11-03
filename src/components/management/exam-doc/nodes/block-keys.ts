import { Selection, type EditorState, type Transaction } from '@tiptap/pm/state'

/** A ProseMirror-style key handler: true when it handled the key (and dispatched any change). */
export type KeyCommand = (state: EditorState, dispatch: (tr: Transaction) => void) => boolean

/**
 * Backspace at the start of the line right after a block of `typeName`: the caret goes back to the end of the
 * block's last line and an empty line is removed. The line's text is never pulled into the block.
 */
export function backIntoBlock(typeName: string): KeyCommand {
  return (state, dispatch) => {
    const { selection } = state
    const { $from } = selection
    if (!selection.empty || !$from.parent.isTextblock || $from.parentOffset !== 0 || $from.depth < 1) return false
    const depth = $from.depth
    const index = $from.index(depth - 1)
    if (index === 0 || $from.node(depth - 1).child(index - 1).type.name !== typeName) return false

    const linePos = $from.before(depth)
    const tr = state.tr
    if ($from.parent.content.size === 0) tr.delete(linePos, linePos + $from.parent.nodeSize)
    tr.setSelection(Selection.near(tr.doc.resolve(linePos - 1), -1))
    dispatch(tr)
    return true
  }
}
