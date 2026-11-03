import { Extension, Mark, Node, isNodeActive, mergeAttributes, type CommandProps } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import {
  INDENT_STEP_CM,
  NO_INDENTS,
  indentAttrs,
  indentStyle,
  legacySteps,
  patchIndents,
  readIndents,
  sameIndents,
  stepLeft,
  type Indents,
} from './indents'
import { MathView } from './nodes/math-view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /** One 1.27 cm step in (or, in a list, one level down). */
      indent: () => ReturnType
      outdent: () => ReturnType
      /** Sets these indents (cm) on every paragraph/heading of the selection, each kept inside its room. */
      setIndents: (patch: Partial<Indents>, options?: IndentOptions) => ReturnType
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

export interface IndentOptions {
  /** Width of the text the indents sit in, in cm (the sheet's 17.5 cm by default). */
  width?: number
  /** `top-level`: only blocks straight on the sheet, the ones the ruler measures from the page margin. */
  scope?: 'all' | 'top-level'
}

/** The paragraphs and headings of the selection, with their positions. */
export function indentTargets(state: EditorState, scope: IndentOptions['scope'] = 'all') {
  const blocks: Array<{ node: ProseMirrorNode; pos: number }> = []
  const { from, to } = state.selection
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      if (scope === 'all' || parent === state.doc) blocks.push({ node, pos })
      return false
    }
    // Lists, tables and the header's columns have their own left edge, not the page margin the ruler measures from.
    return scope === 'all'
  })
  return blocks
}

/** Writes `patch` into every target block, each kept inside its own room; true when a block changed. */
function writeIndents(tr: Transaction, state: EditorState, patch: Partial<Indents>, options: IndentOptions = {}) {
  let changed = false
  for (const { node, pos } of indentTargets(state, options.scope)) {
    const current = readIndents(node.attrs)
    const next = patchIndents(current, patch, options.width)
    if (sameIndents(current, next)) continue
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...indentAttrs(next) })
    changed = true
  }
  return changed
}

/** What a ruler drag would set, shown on the sheet before it is written. */
export interface IndentPreview {
  patch: Partial<Indents>
  options: IndentOptions
}

export const indentPreviewKey = new PluginKey<IndentPreview | null>('indentPreview')

/** Shows (or, with null, takes off) a ruler drag's indents on the sheet without touching the document. */
export function previewIndents(view: EditorView, preview: IndentPreview | null) {
  view.dispatch(view.state.tr.setMeta(indentPreviewKey, preview).setMeta('addToHistory', false))
}

/** Ends a ruler drag: the preview goes and, unless `patch` is null (cancelled), its indents become one undo step. */
export function commitIndents(view: EditorView, patch: Partial<Indents> | null, options: IndentOptions = {}) {
  const { state } = view
  const tr = state.tr.setMeta(indentPreviewKey, null)
  if (patch && writeIndents(tr, state, patch, options)) closeHistory(tr)
  view.dispatch(tr)
}

// The preview's values are CSS variables behind `!important` classes, so they win over the block's own inline indents
// and taking the preview off leaves that inline style as it was.
const INDENT_PREVIEW_CLASS =
  '[margin-left:var(--exam-indent-left)]! [margin-right:var(--exam-indent-right)]! [text-indent:var(--exam-indent-first)]!'

/**
 * Paragraph and heading indents in cm (see indents.ts): left (`margin-left`), right (`margin-right`) and first line
 * (`text-indent`, negative for a hanging indent). Old documents' `indent` step count still loads.
 */
export const Indent = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    const cm = (element: HTMLElement, name: string) => {
      const value = element.getAttribute(name)
      return value === null || value.trim() === '' || !Number.isFinite(Number(value)) ? null : Number(value)
    }
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          // Old documents only: whole steps of 1.27 cm. Old HTML (`data-indent`) loads straight into `indentLeft`.
          indent: { default: 0, parseHTML: () => 0, renderHTML: () => ({}) },
          indentLeft: {
            default: null,
            parseHTML: (element) =>
              cm(element, 'data-indent-left') ?? (legacySteps(element.getAttribute('data-indent')) * INDENT_STEP_CM || null),
            // This one attribute writes all three from the resolved values, old step count included.
            renderHTML: (attributes) => {
              const indents = readIndents(attributes)
              if (sameIndents(indents, NO_INDENTS)) return {}
              return {
                ...(indents.left ? { 'data-indent-left': indents.left } : {}),
                ...(indents.right ? { 'data-indent-right': indents.right } : {}),
                ...(indents.firstLine ? { 'data-indent-first': indents.firstLine } : {}),
                style: indentStyle(indents),
              }
            },
          },
          indentRight: { default: null, parseHTML: (element) => cm(element, 'data-indent-right'), renderHTML: () => ({}) },
          indentFirst: { default: null, parseHTML: (element) => cm(element, 'data-indent-first'), renderHTML: () => ({}) },
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
      for (const { node, pos } of indentTargets(state)) {
        const next = stepLeft(readIndents(node.attrs), delta)
        if (!next) continue
        if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...indentAttrs(next) })
        changed = true
      }
      return changed
    }
    return {
      indent: shift(1),
      outdent: shift(-1),
      setIndents:
        (patch, options) =>
        ({ state, tr, dispatch }: CommandProps) =>
          dispatch ? writeIndents(tr, state, patch, options) : indentTargets(state, options?.scope).length > 0,
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<IndentPreview | null>({
        key: indentPreviewKey,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(indentPreviewKey) as IndentPreview | null | undefined
            return meta === undefined ? value : meta
          },
        },
        props: {
          decorations: (state) => {
            const preview = indentPreviewKey.getState(state)
            if (!preview) return null
            return DecorationSet.create(
              state.doc,
              indentTargets(state, preview.options.scope).map(({ node, pos }) => {
                const { left, right, firstLine } = patchIndents(readIndents(node.attrs), preview.patch, preview.options.width)
                return Decoration.node(pos, pos + node.nodeSize, {
                  class: INDENT_PREVIEW_CLASS,
                  style: `--exam-indent-left: ${left}cm; --exam-indent-right: ${right}cm; --exam-indent-first: ${firstLine}cm`,
                })
              })
            )
          },
        },
      }),
    ]
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
    const onEdit = this.options.onEdit
    return ({ node, view, getPos }) => new MathView(node, view, getPos, onEdit)
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
