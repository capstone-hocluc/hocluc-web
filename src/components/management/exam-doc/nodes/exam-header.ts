import { Node, mergeAttributes, type JSONContent } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Selection, TextSelection, type EditorState } from '@tiptap/pm/state'
import { backIntoBlock, type KeyCommand } from './block-keys'
import { selectionInsertRange } from './insert-position'
import './exam-nodes.css'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    examHeader: {
      /** The two-column head of the paper next to the current line; `examCode` adds the boxed "Mã đề" line. */
      insertExamHeader: (options?: { examCode?: boolean }) => ReturnType
    }
  }
}

type HeaderMark = 'bold' | 'italic' | 'boxed'

/** A centred header line. Header lines carry their alignment: the sheet's default (justify) is an inline style. */
const centred = (text: string, ...marks: HeaderMark[]): JSONContent => ({
  type: 'paragraph',
  attrs: { textAlign: 'center' },
  content: [{ type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) }],
})

/** JSON for the exam header: issuing school on the left, exam, year, subject and time on the right. */
export function examHeaderContent({ examCode = true }: { examCode?: boolean } = {}): JSONContent {
  return {
    type: 'examHeader',
    content: [
      {
        type: 'headerColumn',
        content: [
          centred('SỞ GD&ĐT ………………', 'bold'),
          centred('TRƯỜNG ………………', 'bold'),
          centred('(Đề có … trang)', 'italic'),
        ],
      },
      {
        type: 'headerColumn',
        content: [
          centred('ĐỀ KIỂM TRA ………………', 'bold'),
          centred('NĂM HỌC 20… – 20…', 'bold'),
          centred('Môn: ……………… – Lớp: …', 'bold'),
          centred('Thời gian làm bài: … phút, không kể thời gian giao đề', 'italic'),
          ...(examCode ? [centred('Mã đề …', 'bold', 'boxed')] : []),
        ],
      },
    ],
  }
}

interface ColumnContext {
  header: ProseMirrorNode
  headerPos: number
  /** 0 = left column, 1 = right column. */
  column: number
  columnPos: number
  columnNode: ProseMirrorNode
  /** Index of the caret's line in its column. */
  line: number
}

function columnContext(state: EditorState): ColumnContext | null {
  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 2; depth -= 1) {
    if ($from.node(depth).type.name !== 'headerColumn') continue
    return {
      header: $from.node(depth - 1),
      headerPos: $from.before(depth - 1),
      column: $from.index(depth - 1),
      columnPos: $from.before(depth),
      columnNode: $from.node(depth),
      line: $from.index(depth),
    }
  }
  return null
}

function isBlank(node: ProseMirrorNode): boolean {
  let blank = true
  node.descendants((child) => {
    if (child.isTextblock && child.content.size > 0) blank = false
    return blank && !child.isTextblock
  })
  return blank
}

/**
 * Backspace at the start of a column: a blank header (caret in the left column) turns into an empty line, the
 * right column sends the caret to the end of the left one, otherwise nothing happens. Columns never merge.
 */
const backspaceInColumn: KeyCommand = (state, dispatch) => {
  const { selection } = state
  const context = columnContext(state)
  if (!context || !selection.empty || selection.$from.parentOffset > 0 || context.line > 0) return false
  if (context.column === 1) {
    dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(context.columnPos - 1), -1)))
    return true
  }
  if (!isBlank(context.header)) return true
  const tr = state.tr.replaceWith(
    context.headerPos,
    context.headerPos + context.header.nodeSize,
    state.schema.nodes.paragraph.create()
  )
  tr.setSelection(TextSelection.create(tr.doc, context.headerPos + 1))
  dispatch(tr)
  return true
}

/** Delete at the end of a column does nothing, so the columns never merge. */
const deleteInColumn: KeyCommand = (state) => {
  const context = columnContext(state)
  if (!context || !state.selection.empty) return false
  const { $from } = state.selection
  return context.line === context.columnNode.childCount - 1 && $from.parentOffset === $from.parent.content.size
}

/** One column of the exam header: centred lines. */
export const HeaderColumn = Node.create({
  name: 'headerColumn',
  content: 'paragraph+',
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-header-column]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-header-column': '', class: 'exam-header-column' }), 0]
  },
})

/** The two-column, borderless head of a Vietnamese exam paper. */
export const ExamHeader = Node.create({
  name: 'examHeader',
  group: 'block',
  content: 'headerColumn headerColumn',
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-exam-header]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-exam-header': '', class: 'exam-header' }), 0]
  },

  addCommands() {
    return {
      insertExamHeader:
        (options = {}) =>
        ({ state, tr, commands, dispatch }) => {
          if (!commands.insertContentAt(selectionInsertRange(state.selection), examHeaderContent(options))) return false
          if (dispatch) {
            // The caret goes to the header's first line (the insertion leaves it on the last one).
            const $end = tr.selection.$from
            for (let depth = $end.depth; depth > 0; depth -= 1) {
              if ($end.node(depth).type.name !== this.name) continue
              tr.setSelection(Selection.near(tr.doc.resolve($end.start(depth)), 1))
              break
            }
          }
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    const run = (command: KeyCommand) => () =>
      command(this.editor.state, (tr) => this.editor.view.dispatch(tr.scrollIntoView()))
    const afterHeader = backIntoBlock(this.name)
    return {
      Backspace: run((state, dispatch) => backspaceInColumn(state, dispatch) || afterHeader(state, dispatch)),
      Delete: run(deleteInColumn),
      // A page break cannot sit inside the header.
      'Mod-Enter': run((state) => columnContext(state) !== null),
    }
  },
})
