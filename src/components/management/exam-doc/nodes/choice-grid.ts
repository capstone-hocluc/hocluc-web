import { Node, mergeAttributes, type JSONContent } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { NodeView, ViewMutationRecord } from '@tiptap/pm/view'
import { backIntoBlock, type KeyCommand } from './block-keys'
import { selectionInsertRange } from './insert-position'
import './exam-nodes.css'

/** Options per row: 'auto' picks 4, 2 or 1 from the widest option as it is rendered. */
export type ChoiceColumns = 'auto' | 1 | 2 | 4

/** Option letters in order; a grid holds at most this many options. */
export const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    choiceGrid: {
      /** Options A, B, C… (1 to 8, default 4) next to the current line, with the caret in option A. */
      insertChoiceGrid: (options?: { count?: number }) => ReturnType
      /** Options per row of the grid at the caret (or of every grid in the selection). */
      setChoiceColumns: (columns: ChoiceColumns) => ReturnType
    }
  }
}

const labelAt = (index: number) => CHOICE_LABELS[index] ?? String(index + 1)

function parseColumns(value: unknown): ChoiceColumns {
  const text = String(value)
  return text === '1' ? 1 : text === '2' ? 2 : text === '4' ? 4 : 'auto'
}

/** JSON for a choice grid: one entry of inline content per option, lettered A, B, C… in order. */
export function choiceGridContent(options: JSONContent[][], columns: ChoiceColumns = 'auto'): JSONContent {
  return {
    type: 'choiceGrid',
    attrs: { columns },
    content: options.slice(0, CHOICE_LABELS.length).map((content, index) => ({
      type: 'choiceCell',
      attrs: { label: labelAt(index) },
      ...(content.length ? { content } : {}),
    })),
  }
}

/** Options per row guessed from text length; stands until the node view has measured the rendered options. */
function estimateColumns(grid: ProseMirrorNode): 1 | 2 | 4 {
  let longest = 0
  grid.forEach((cell) => {
    let length = 0
    cell.forEach((child) => {
      if (child.isText) length += child.text?.length ?? 0
      else if (child.type.name === 'math') length += Math.ceil(String(child.attrs.latex).length / 2) + 2
    })
    longest = Math.max(longest, length)
  })
  return longest <= 18 ? 4 : longest <= 40 ? 2 : 1
}

function shownColumns(grid: ProseMirrorNode): 1 | 2 | 4 {
  const columns = parseColumns(grid.attrs.columns)
  return columns === 'auto' ? estimateColumns(grid) : columns
}

/* ---------- Measuring: every grid that changed is measured in one pass per frame ---------- */

interface Reading {
  width: number
  gap: number
  widest: number
}

const queued = new Set<ChoiceGridView>()
const viewsByDom = new WeakMap<Element, ChoiceGridView>()
let frame = 0
let resizeObserver: ResizeObserver | null = null

function scheduleMeasure(view: ChoiceGridView) {
  if (typeof requestAnimationFrame !== 'function') return
  queued.add(view)
  if (!frame) frame = requestAnimationFrame(measureQueued)
}

/** One layout with the options at their natural width (`data-measuring`), the readings, then the grid layout back. */
function measureQueued() {
  frame = 0
  const views = [...queued].filter((view) => view.dom.isConnected)
  queued.clear()
  views.forEach((view) => view.dom.setAttribute('data-measuring', ''))
  const readings = views.map((view) => view.read())
  views.forEach((view) => view.dom.removeAttribute('data-measuring'))
  views.forEach((view, index) => view.apply(readings[index]))
}

function sharedResizeObserver(): ResizeObserver | null {
  if (typeof ResizeObserver !== 'function') return null
  resizeObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const view = viewsByDom.get(entry.target)
      // Only a new width can change how many options fit a row; a new height is the grid's own columns changing.
      if (view && view.measuredWidth !== Math.round(entry.contentRect.width)) view.remeasure()
    }
  })
  return resizeObserver
}

/**
 * The grid element is also the content element, so the options are its grid items. Only `data-*` attributes of
 * the grid change with the layout; the document never stores the measured value.
 */
class ChoiceGridView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private node: ProseMirrorNode
  private mutations: MutationObserver | null = null
  /** The grid's width when its options were last measured, in whole px (-1: not measured yet). */
  measuredWidth = -1

  constructor(node: ProseMirrorNode) {
    this.node = node
    this.dom = document.createElement('div')
    this.dom.className = 'exam-choice-grid'
    this.dom.setAttribute('data-choice-grid', '')
    this.dom.setAttribute('data-columns', String(shownColumns(node)))
    this.contentDOM = this.dom
    viewsByDom.set(this.dom, this)
    sharedResizeObserver()?.observe(this.dom)
    // Formulas and images render after the node view is built; a change inside means another measure.
    if (typeof MutationObserver === 'function') {
      this.mutations = new MutationObserver(() => this.remeasure())
      this.mutations.observe(this.dom, { childList: true, characterData: true, subtree: true })
    }
    this.render()
  }

  private get columns(): ChoiceColumns {
    return parseColumns(this.node.attrs.columns)
  }

  private render() {
    const columns = this.columns
    this.dom.setAttribute('data-choice-columns', String(columns))
    if (columns === 'auto') scheduleMeasure(this)
    else this.dom.setAttribute('data-columns', String(columns))
  }

  remeasure() {
    if (this.columns === 'auto') scheduleMeasure(this)
  }

  read(): Reading | null {
    const width = this.dom.clientWidth
    if (!width) return null
    const style = getComputedStyle(this.dom)
    // As the resize observer reports it (the content box), so its first report after this measure changes nothing.
    this.measuredWidth = Math.round(width - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0))
    const gap = parseFloat(style.columnGap) || 0
    let widest = 0
    for (const cell of Array.from(this.dom.children)) {
      if (cell instanceof HTMLElement) widest = Math.max(widest, cell.offsetWidth)
    }
    return { width, gap, widest }
  }

  apply(reading: Reading | null) {
    if (!reading || this.columns !== 'auto') return
    const fits = (count: number) => reading.widest <= (reading.width - reading.gap * (count - 1)) / count + 0.5
    const columns = String(fits(4) ? 4 : fits(2) ? 2 : 1)
    if (this.dom.getAttribute('data-columns') !== columns) this.dom.setAttribute('data-columns', columns)
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.render()
    return true
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    return mutation.type === 'attributes' && mutation.target === this.dom
  }

  destroy() {
    resizeObserver?.unobserve(this.dom)
    this.mutations?.disconnect()
    queued.delete(this)
  }
}

/* ---------- Keys ---------- */

interface CellContext {
  gridPos: number
  grid: ProseMirrorNode
  index: number
  cellPos: number
  cell: ProseMirrorNode
}

/** The option holding the whole selection, or null. */
function cellContext(state: EditorState): CellContext | null {
  const { $from, to } = state.selection
  for (let depth = $from.depth; depth >= 2; depth -= 1) {
    if ($from.node(depth).type.name !== 'choiceCell') continue
    if (to > $from.end(depth)) return null
    return {
      gridPos: $from.before(depth - 1),
      grid: $from.node(depth - 1),
      index: $from.index(depth - 1),
      cellPos: $from.before(depth),
      cell: $from.node(depth),
    }
  }
  return null
}

/** Selects the text of option `index` (an empty option gets the caret), like Tab in a table. */
function selectCell(tr: Transaction, gridPos: number, index: number) {
  const grid = tr.doc.nodeAt(gridPos)
  if (!grid) return
  let pos = gridPos + 1
  for (let child = 0; child < index; child += 1) pos += grid.child(child).nodeSize
  tr.setSelection(TextSelection.create(tr.doc, pos + 1, pos + 1 + grid.child(index).content.size))
}

/** Enter: on to the next option; in the last one, out of the grid onto a fresh line. */
const enterInCell: KeyCommand = (state, dispatch) => {
  const context = cellContext(state)
  if (!context) return false
  const tr = state.tr
  if (context.index < context.grid.childCount - 1) {
    selectCell(tr, context.gridPos, context.index + 1)
  } else {
    const after = context.gridPos + context.grid.nodeSize
    const next = state.doc.nodeAt(after)
    if (!(next?.type.name === 'paragraph' && next.content.size === 0)) {
      tr.insert(after, state.schema.nodes.paragraph.create())
    }
    tr.setSelection(TextSelection.create(tr.doc, after + 1))
  }
  dispatch(tr)
  return true
}

/** Tab / Shift-Tab between options; Tab in the last option adds the next letter (up to H). */
const moveCell =
  (step: 1 | -1): KeyCommand =>
  (state, dispatch) => {
    const context = cellContext(state)
    if (!context) return false
    const target = context.index + step
    if (target < 0) return true
    const tr = state.tr
    if (target >= context.grid.childCount) {
      if (context.grid.childCount >= CHOICE_LABELS.length) return true
      const end = context.gridPos + context.grid.nodeSize - 1
      tr.insert(end, state.schema.nodes.choiceCell.create({ label: labelAt(target) }))
    }
    selectCell(tr, context.gridPos, target)
    dispatch(tr)
    return true
  }

/**
 * Backspace at the start of an option: an empty grid (caret in option A) turns into an empty line, an empty last
 * option is removed, any other option sends the caret to the end of the one before. Options never merge.
 */
const backspaceInCell: KeyCommand = (state, dispatch) => {
  const { selection } = state
  const context = cellContext(state)
  if (!context || !selection.empty || selection.$from.parentOffset > 0) return false
  const { grid, gridPos, index, cell, cellPos } = context
  const tr = state.tr
  if (index === 0) {
    let empty = true
    grid.forEach((option) => {
      if (option.content.size > 0) empty = false
    })
    if (!empty) return true
    tr.replaceWith(gridPos, gridPos + grid.nodeSize, state.schema.nodes.paragraph.create())
    tr.setSelection(TextSelection.create(tr.doc, gridPos + 1))
  } else {
    if (cell.content.size === 0 && index === grid.childCount - 1) tr.delete(cellPos, cellPos + cell.nodeSize)
    tr.setSelection(TextSelection.create(tr.doc, cellPos - 1))
  }
  dispatch(tr)
  return true
}

/** Delete at the end of an option does nothing, so the next option is never pulled in. */
const deleteInCell: KeyCommand = (state) => {
  const context = cellContext(state)
  return Boolean(context && state.selection.empty && state.selection.$from.parentOffset === context.cell.content.size)
}

/* ---------- Nodes ---------- */

/** One option: a bold "A." label (not editable, kept in copied HTML) before its inline content. */
export const ChoiceCell = Node.create({
  name: 'choiceCell',
  content: 'inline*',
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      label: {
        default: 'A',
        parseHTML: (element) => element.getAttribute('data-label') || 'A',
        renderHTML: (attributes) => ({ 'data-label': attributes.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-choice-cell]', contentElement: '[data-choice-body]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-choice-cell': '', class: 'exam-choice-cell' }),
      ['span', { class: 'exam-choice-label', contenteditable: 'false' }, `${node.attrs.label}.`],
      ['div', { class: 'exam-choice-body', 'data-choice-body': '' }, 0],
    ]
  },
})

/** Multiple-choice options laid out 4, 2 or 1 per row (12px apart). */
export const ChoiceGrid = Node.create({
  name: 'choiceGrid',
  group: 'block',
  content: 'choiceCell+',
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      columns: {
        default: 'auto',
        parseHTML: (element) => parseColumns(element.getAttribute('data-choice-columns')),
        renderHTML: (attributes) => ({ 'data-choice-columns': String(attributes.columns) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-choice-grid]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-choice-grid': '',
        class: 'exam-choice-grid',
        'data-columns': String(shownColumns(node)),
      }),
      0,
    ]
  },

  addNodeView() {
    return ({ node }) => new ChoiceGridView(node)
  },

  addCommands() {
    return {
      insertChoiceGrid:
        ({ count = 4 } = {}) =>
        ({ state, tr, commands, dispatch }) => {
          const total = Math.min(CHOICE_LABELS.length, Math.max(1, Math.round(count) || 4))
          const grid = choiceGridContent(Array.from({ length: total }, () => []))
          if (!commands.insertContentAt(selectionInsertRange(state.selection), grid)) return false
          if (dispatch) {
            // The insertion leaves the caret in the new grid's last option; option A is where typing starts.
            const $end = tr.selection.$from
            for (let depth = $end.depth; depth > 0; depth -= 1) {
              if ($end.node(depth).type.name !== this.name) continue
              tr.setSelection(TextSelection.create(tr.doc, $end.start(depth) + 1))
              break
            }
          }
          return true
        },
      setChoiceColumns:
        (columns) =>
        ({ state, tr, dispatch }) => {
          if (parseColumns(columns) !== columns) return false
          const positions = new Set<number>()
          const { $from, from, to } = state.selection
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if ($from.node(depth).type.name === this.name) {
              positions.add($from.before(depth))
              break
            }
          }
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name !== this.name) return !node.isTextblock
            positions.add(pos)
            return false
          })
          if (positions.size === 0) return false
          if (dispatch) {
            positions.forEach((pos) => {
              const node = tr.doc.nodeAt(pos)
              if (node) tr.setNodeMarkup(pos, undefined, { ...node.attrs, columns })
            })
          }
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    const run = (command: KeyCommand) => () =>
      command(this.editor.state, (tr) => this.editor.view.dispatch(tr.scrollIntoView()))
    const afterGrid = backIntoBlock(this.name)
    return {
      Enter: run(enterInCell),
      Tab: run(moveCell(1)),
      'Shift-Tab': run(moveCell(-1)),
      Backspace: run((state, dispatch) => backspaceInCell(state, dispatch) || afterGrid(state, dispatch)),
      Delete: run(deleteInCell),
      // A page break cannot sit inside an option.
      'Mod-Enter': run((state) => cellContext(state) !== null),
    }
  },

  addProseMirrorPlugins() {
    const name = this.name
    return [
      // Letters follow the order: adding, removing or pasting options relabels them A, B, C…
      new Plugin({
        key: new PluginKey('choiceLabels'),
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null
          let tr: Transaction | null = null
          state.doc.descendants((node, pos) => {
            if (node.type.name !== name) return !node.isTextblock
            node.forEach((cell, offset, index) => {
              const label = labelAt(index)
              if (cell.attrs.label === label) return
              tr ??= state.tr
              tr.setNodeMarkup(pos + 1 + offset, undefined, { ...cell.attrs, label })
            })
            return false
          })
          return tr
        },
      }),
    ]
  },
})
