import { Extension, Mark, Node, isNodeActive, mergeAttributes, type CommandProps } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MathNodeView from './MathNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
    boxed: {
      toggleBoxed: () => ReturnType
    }
    lineSpacing: {
      /** Line spacing of every paragraph/heading the selection touches; null goes back to the sheet default. */
      setLineSpacing: (value: string | null) => ReturnType
    }
    pageBreak: {
      setPageBreak: () => ReturnType
    }
    math: {
      insertMath: (value: { latex: string; display: boolean }) => ReturnType
      updateMath: (pos: number, value: { latex: string; display: boolean }) => ReturnType
    }
  }
}

/** One indent step, as in Word: 1.27 cm. Paragraphs and headings go up to 8 steps. */
const INDENT_STEP_CM = 1.27
const MAX_INDENT = 8

/** A whole number of steps in 0..MAX_INDENT, whatever was stored or pasted. */
const clampIndent = (value: unknown) => Math.min(MAX_INDENT, Math.max(0, Math.trunc(Number(value)) || 0))

export const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => clampIndent(element.getAttribute('data-indent')),
            renderHTML: (attributes) => {
              const indent = clampIndent(attributes.indent)
              return indent ? { 'data-indent': indent, style: `margin-left: ${indent * INDENT_STEP_CM}cm` } : {}
            },
          },
        },
      },
    ]
  },
  addCommands() {
    // The chain's own `commands` and `tr`: a command that dispatched separately would leave this one's transaction stale.
    const shift = (delta: 1 | -1) => () => ({ state, tr, dispatch, commands }: CommandProps) => {
      // Inside a list the step is a list level, like every word processor.
      if (isNodeActive(state, 'listItem')) {
        return delta > 0 ? commands.sinkListItem('listItem') : commands.liftListItem('listItem')
      }
      let changed = false
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return
        const indent = clampIndent(node.attrs.indent)
        const next = clampIndent(indent + delta)
        if (next !== indent) {
          if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
          changed = true
        }
        return false
      })
      return changed
    }
    return { indent: shift(1), outdent: shift(-1) }
  },
  addKeyboardShortcuts() {
    // In a table Tab moves between cells (TableKit's keys come next); the toolbar buttons still indent there.
    const inTable = () => this.editor.isActive('tableCell') || this.editor.isActive('tableHeader')
    // In a list Tab stays with the editor even when the item cannot move (the first item), so focus never jumps out.
    const shift = (run: () => boolean) => () => !inTable() && (run() || this.editor.isActive('listItem'))
    return {
      Tab: shift(() => this.editor.commands.indent()),
      'Shift-Tab': shift(() => this.editor.commands.outdent()),
    }
  },
})

/** Paragraph line spacing (1.0, 1.15, 1.5, 2.0…), a block attribute like in a word processor, not a text style. */
export const LineSpacing = Extension.create({
  name: 'lineSpacing',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineSpacing: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => (attributes.lineSpacing ? { style: `line-height: ${attributes.lineSpacing}` } : {}),
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineSpacing:
        (value) =>
        ({ state, tr, dispatch }: CommandProps) => {
          let changed = false
          state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
            if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return
            if (node.attrs.lineSpacing !== value) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineSpacing: value })
              changed = true
            }
            return false
          })
          if (changed && dispatch) dispatch(tr)
          return changed
        },
    }
  },
})

/** A thin box around text: "ĐỀ CHÍNH THỨC", "Mã đề 101". */
export const Boxed = Mark.create({
  name: 'boxed',
  parseHTML: () => [{ tag: 'span[data-boxed]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-boxed': '', class: 'exam-doc-boxed' }), 0],
  addCommands() {
    return { toggleBoxed: () => ({ commands }) => commands.toggleMark(this.name) }
  },
})

/** Forces the next content onto a new A4 page. */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: 'div[data-page-break]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': '', class: 'exam-doc-page-break' })],
  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => chain().insertContent({ type: this.name }).createParagraphNear().run(),
    }
  },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() }
  },
})

export interface MathOptions {
  /** Opens the formula dialog to edit the formula at `pos`. */
  onEdit: (pos: number, value: { latex: string; display: boolean }) => void
}

/** A LaTeX formula (or `\ce{…}` chemistry) set with KaTeX; double click, or Enter/Space while it is selected, edits it. */
export const MathNode = Node.create<MathOptions>({
  name: 'math',
  // Its keys run before the other extensions' (all at 100): otherwise Enter on a formula in an answer option moves to
  // the next option (choice grid), and elsewhere replaces the formula with a line break.
  priority: 101,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addOptions: () => ({ onEdit: () => undefined }),
  addAttributes() {
    return {
      latex: { default: '' },
      display: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-display') === 'true',
        renderHTML: (attributes) => ({ 'data-display': String(attributes.display) }),
      },
    }
  },
  parseHTML: () => [{ tag: 'span[data-math]', getAttrs: (element) => ({ latex: (element as HTMLElement).getAttribute('data-latex') ?? '' }) }],
  renderHTML: ({ node, HTMLAttributes }) =>
    ['span', mergeAttributes(HTMLAttributes, { 'data-math': '', 'data-latex': node.attrs.latex }), node.attrs.display ? `$$${node.attrs.latex}$$` : `$${node.attrs.latex}$`],
  renderText: ({ node }) => (node.attrs.display ? `$$${node.attrs.latex}$$` : `$${node.attrs.latex}$`),
  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView)
  },
  addKeyboardShortcuts() {
    const edit = () => {
      const { selection } = this.editor.state
      if (!this.editor.isEditable || !(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
        return false
      }
      const { latex, display } = selection.node.attrs
      this.options.onEdit(selection.from, { latex: String(latex ?? ''), display: Boolean(display) })
      return true
    }
    return { Enter: edit, Space: edit }
  },
  addCommands() {
    return {
      insertMath: (value) => ({ commands }) => commands.insertContent({ type: this.name, attrs: value }),
      updateMath: (pos, value) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setNodeMarkup(pos, undefined, value))
        return true
      },
    }
  },
})
