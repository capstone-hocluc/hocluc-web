import { Node, type Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorView, NodeView } from '@tiptap/pm/view'
import { cn } from '../../../../lib/cn'
import { buttonStyles } from '../../../tailgrids/core/button'
import { CHART_SVG_SIZE } from '../chart-svg'
import { chartValueAlt, chartValueSrc, newChart, normalizeChart, type ChartValue } from '../chart-data'
import { selectionInsertRange } from './insert-position'
import './exam-nodes.css'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      /** A chart between the blocks at the caret (see `selectionInsertRange`), selected; the sample chart by default. */
      insertChart: (value?: ChartValue) => ReturnType
      /** The chart at `pos` with new data and settings, selected. */
      updateChart: (pos: number, value: ChartValue) => ReturnType
    }
  }
}

/* ---------- Opening the chart editor ---------- */

type ChartEditListener = (pos: number) => void
const editListeners = new WeakMap<Editor, Set<ChartEditListener>>()

/** Asks the chart editor listening on `editor` (ChartEditorHost) to open the chart at `pos`. */
export function openChartEditor(editor: Editor, pos: number) {
  editListeners.get(editor)?.forEach((listener) => listener(pos))
}

/** Calls `listener` with the position of every chart asked to be edited in `editor`; returns the unsubscribe. */
export function onChartEdit(editor: Editor, listener: ChartEditListener): () => void {
  let listeners = editListeners.get(editor)
  if (!listeners) {
    listeners = new Set()
    editListeners.set(editor, listeners)
  }
  const current = listeners
  current.add(listener)
  return () => {
    current.delete(listener)
  }
}

/** Chèn ▸ Biểu đồ: the sample chart at the caret, then its editor (which takes focus, and gives it back to the chart). */
export function insertChartAndEdit(editor: Editor) {
  if (editor.isDestroyed || !editor.isEditable) return
  if (!editor.commands.insertChart()) return
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.node.type.name === 'chart') openChartEditor(editor, selection.from)
}

/* ---------- The node ---------- */

const values = new WeakMap<ProseMirrorNode, ChartValue>()

/** The chart a node holds, ready to draw (nodes never change, so it is read once per node). */
export function chartValueOf(node: ProseMirrorNode): ChartValue {
  let value = values.get(node)
  if (!value) {
    value = normalizeChart({ data: node.attrs.data, spec: node.attrs.spec })
    values.set(node, value)
  }
  return value
}

const readCharts = new WeakMap<HTMLElement, ChartValue | null>()

/** The JSON a chart's picture carries in `data-chart`, read back on paste; null when it is not a chart's. */
function readChart(element: HTMLElement): ChartValue | null {
  if (readCharts.has(element)) return readCharts.get(element) ?? null
  let value: ChartValue | null = null
  try {
    const parsed = JSON.parse(element.getAttribute('data-chart') ?? '') as { data?: unknown; spec?: unknown } | null
    if (parsed && typeof parsed === 'object') value = normalizeChart(parsed)
  } catch {
    value = null
  }
  readCharts.set(element, value)
  return value
}

const widthStyle = (value: ChartValue) => `${Math.round(value.spec.width * 100)}%`

/**
 * The chart on the sheet: its drawing (an SVG picture), a ring while it is selected and, in an editable document, a
 * "Sửa biểu đồ" button. A double click opens the chart editor too, and so do Enter and Space on a selected chart
 * (the node's keyboard shortcuts). Plain DOM like the formulas: a React view per chart would be mounted inside the
 * editor updates that write AI questions in, where React cannot render synchronously.
 */
class ChartView implements NodeView {
  dom: HTMLElement
  private node: ProseMirrorNode
  private readonly image: HTMLImageElement
  private readonly button: HTMLButtonElement

  constructor(
    node: ProseMirrorNode,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    private readonly editor: Editor
  ) {
    this.node = node
    this.dom = document.createElement('div')
    this.dom.className = 'exam-chart'
    this.dom.setAttribute('data-chart-node', '')

    this.image = document.createElement('img')
    // The node is dragged, not the picture.
    this.image.draggable = false
    this.image.width = CHART_SVG_SIZE.width
    this.image.height = CHART_SVG_SIZE.height
    this.image.className = 'w-full'

    this.button = document.createElement('button')
    this.button.type = 'button'
    // Reached from the keyboard through Enter on the selected chart, so it stays out of the tab order.
    this.button.tabIndex = -1
    this.button.textContent = 'Sửa biểu đồ'
    this.button.setAttribute('aria-keyshortcuts', 'Enter')
    // Chrome of the editor, never printed or captured with the page.
    this.button.setAttribute('data-exam-doc-chrome', '')
    // Shown by exam-nodes.css only on a selected chart of an editable document.
    this.button.className = cn(
      buttonStyles({ variant: 'primary', appearance: 'fill', size: 'sm' }),
      'exam-chart-edit absolute top-2 right-2 z-10 h-8 px-3 font-sans whitespace-nowrap shadow-sm'
    )
    // The editor keeps its focus and the chart stays selected.
    this.button.addEventListener('mousedown', this.keepFocus)
    this.button.addEventListener('click', this.edit)
    this.dom.addEventListener('dblclick', this.edit)
    this.dom.append(this.image, this.button)
    this.render()
  }

  private keepFocus = (event: MouseEvent) => {
    event.preventDefault()
  }

  private edit = (event: MouseEvent) => {
    // The button's own clicks open the editor; a double click on it is not a second request.
    if (event.type === 'dblclick' && event.target instanceof globalThis.Node && this.button.contains(event.target)) return
    event.preventDefault()
    if (!this.view.editable) return
    const pos = this.getPos()
    if (typeof pos === 'number') openChartEditor(this.editor, pos)
  }

  private render() {
    const value = chartValueOf(this.node)
    this.image.src = chartValueSrc(value)
    this.image.alt = chartValueAlt(value)
    this.dom.style.width = widthStyle(value)
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false
    const changed = node.attrs.data !== this.node.attrs.data || node.attrs.spec !== this.node.attrs.spec
    this.node = node
    if (changed) this.render()
    return true
  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode')
  }

  deselectNode() {
    this.dom.classList.remove('ProseMirror-selectednode')
  }

  /** Mouse events on the button are the button's; everything else (selecting, dragging the chart) is the editor's. */
  stopEvent(event: Event) {
    return (
      event.target instanceof globalThis.Node &&
      this.button.contains(event.target) &&
      /^(mouse|pointer|click|dblclick|auxclick|contextmenu)/.test(event.type)
    )
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    this.button.removeEventListener('mousedown', this.keepFocus)
    this.button.removeEventListener('click', this.edit)
    this.dom.removeEventListener('dblclick', this.edit)
  }
}

/**
 * A chart block: bar, line or pie, with its data table and settings (see `chart-data.ts`). In HTML (copy and paste,
 * clipboard to other programs) it is the drawing as an `<img>` carrying the chart's JSON in `data-chart`, which a
 * paste reads back as a chart; pictures without it stay pictures.
 */
export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  // Its Enter and Space run before the editor's own (which would add a line or replace the chart).
  priority: 101,

  addAttributes() {
    return {
      data: { default: null, rendered: false, parseHTML: (element) => readChart(element)?.data ?? null },
      spec: { default: null, rendered: false, parseHTML: (element) => readChart(element)?.spec ?? null },
    }
  },

  // Above the image's `img[src]` rule, so a chart's picture is read as the chart.
  parseHTML: () => [{ tag: 'img[data-chart]', priority: 60, getAttrs: (element) => (readChart(element as HTMLElement) ? null : false) }],

  renderHTML: ({ node }) => {
    const value = chartValueOf(node)
    return [
      'img',
      {
        src: chartValueSrc(value),
        alt: chartValueAlt(value),
        width: String(CHART_SVG_SIZE.width),
        height: String(CHART_SVG_SIZE.height),
        style: `width: ${widthStyle(value)}; height: auto`,
        'data-chart': JSON.stringify(value),
      },
    ]
  },

  addNodeView() {
    return ({ node, view, getPos, editor }) => new ChartView(node, view, getPos, editor)
  },

  addKeyboardShortcuts() {
    const edit = () => {
      const { selection } = this.editor.state
      if (!this.editor.isEditable || !(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
        return false
      }
      openChartEditor(this.editor, selection.from)
      return true
    }
    return { Enter: edit, Space: edit }
  },

  // Each is an undo step of its own, never merged with typing just before it.
  addCommands() {
    return {
      insertChart:
        (value) =>
        ({ state, tr, dispatch }) => {
          const range = selectionInsertRange(state.selection)
          if (dispatch) {
            closeHistory(tr)
            tr.replaceWith(range.from, range.to, this.type.create(normalizeChart(value ?? newChart())))
            tr.setSelection(NodeSelection.create(tr.doc, range.from)).scrollIntoView()
          }
          return true
        },
      updateChart:
        (pos, value) =>
        ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(pos)
          if (node?.type !== this.type) return false
          if (dispatch) {
            closeHistory(tr)
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...normalizeChart(value) })
            tr.setSelection(NodeSelection.create(tr.doc, pos))
          }
          return true
        },
    }
  },
})
