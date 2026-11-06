import { Node, type Editor } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorView, NodeView } from '@tiptap/pm/view'
import { cn } from '../../../../lib/cn'
import { buttonStyles } from '../../../tailgrids/core/button'
import {
  CHART_WIDTH,
  chartValueAlt,
  chartValueSize,
  chartValueSrc,
  chartWidth,
  newChart,
  normalizeChart,
  type ChartValue,
} from '../chart-data'
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

/**
 * Chèn ▸ Biểu đồ: a chart at the caret (the sample column chart unless `value` says), then its editor (which takes
 * focus, and gives it back to the chart).
 */
export function insertChartAndEdit(editor: Editor, value?: ChartValue) {
  if (editor.isDestroyed || !editor.isEditable) return
  if (!editor.commands.insertChart(value)) return
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

/** A width dragged to, as a share of the text width: in range, in hundredths. */
const draggedWidth = (share: number) => chartWidth(Math.min(CHART_WIDTH.max, Math.max(CHART_WIDTH.min, share)))

/**
 * The chart on the sheet: its drawing (an SVG picture), a ring while it is selected and, in an editable document, a
 * "Sửa biểu đồ" button and handles at its right edge and corner that drag its width (one undo step on release). A
 * double click opens the chart editor too, and so do Enter and Space on a selected chart (the node's keyboard
 * shortcuts); the editor's width slider is the keyboard's way to the width. Plain DOM like the formulas: a React view
 * per chart would be mounted inside the editor updates that write AI questions in, where React cannot render
 * synchronously.
 */
class ChartView implements NodeView {
  dom: HTMLElement
  private node: ProseMirrorNode
  private readonly image: HTMLImageElement
  private readonly button: HTMLButtonElement
  private readonly handles: HTMLElement[]
  /** The drag of a handle under way: where it started and the width it has reached. */
  private resizing: { pointerId: number; handle: HTMLElement; centre: number; textWidth: number; width: number } | null = null

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

    // Shown by exam-nodes.css with the edit button; chrome of the editor like it.
    this.handles = (['side', 'corner'] as const).map((place) => {
      const handle = document.createElement('span')
      handle.className = `exam-chart-resize exam-chart-resize-${place}`
      handle.setAttribute('data-exam-doc-chrome', '')
      handle.setAttribute('data-chart-resize', place)
      handle.setAttribute('aria-hidden', 'true')
      handle.title = 'Kéo để đổi độ rộng'
      handle.addEventListener('pointerdown', this.startResize)
      handle.addEventListener('pointermove', this.moveResize)
      handle.addEventListener('pointerup', this.endResize)
      handle.addEventListener('pointercancel', this.cancelResize)
      handle.addEventListener('mousedown', this.keepFocus)
      return handle
    })
    this.dom.append(this.image, this.button, ...this.handles)
    this.render()
  }

  private keepFocus = (event: MouseEvent) => {
    event.preventDefault()
  }

  private startResize = (event: PointerEvent) => {
    if (event.button !== 0 || !this.view.editable || this.resizing) return
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget as HTMLElement
    const rect = this.dom.getBoundingClientRect()
    const share = chartValueOf(this.node).spec.width
    // The text width in screen pixels, whatever the zoom: the chart takes its share of it.
    this.resizing = { pointerId: event.pointerId, handle, centre: rect.left + rect.width / 2, textWidth: rect.width / share, width: share }
    handle.setPointerCapture?.(event.pointerId)
    // Nor does the browser drag the chart away while its handle is held.
    this.dom.draggable = false
    this.dom.classList.add('exam-chart-resizing')
  }

  private moveResize = (event: PointerEvent) => {
    const drag = this.resizing
    if (!drag || event.pointerId !== drag.pointerId) return
    // The chart stays centred, so its right edge follows the pointer when it grows by twice the pointer's way.
    drag.width = draggedWidth((2 * (event.clientX - drag.centre)) / drag.textWidth)
    this.dom.style.width = `${Math.round(drag.width * 100)}%`
  }

  private endResize = (event: PointerEvent) => {
    const drag = this.resizing
    if (!drag || event.pointerId !== drag.pointerId) return
    this.finishResize()
    const value = chartValueOf(this.node)
    const pos = this.getPos()
    if (drag.width === value.spec.width || typeof pos !== 'number' || !this.view.editable) {
      this.render()
      return
    }
    this.editor.chain().updateChart(pos, { ...value, spec: { ...value.spec, width: drag.width } }).focus().run()
  }

  private cancelResize = (event: PointerEvent) => {
    if (!this.resizing || event.pointerId !== this.resizing.pointerId) return
    this.finishResize()
    this.render()
  }

  private finishResize() {
    const drag = this.resizing
    this.resizing = null
    this.dom.draggable = true
    this.dom.classList.remove('exam-chart-resizing')
    if (drag?.handle.hasPointerCapture?.(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId)
  }

  private edit = (event: MouseEvent) => {
    // The button's own clicks open the editor; a double click on it is not a second request, nor one on a handle.
    if (
      event.type === 'dblclick' &&
      event.target instanceof globalThis.Node &&
      [this.button, ...this.handles].some((element) => element.contains(event.target as globalThis.Node))
    ) {
      return
    }
    event.preventDefault()
    if (!this.view.editable) return
    const pos = this.getPos()
    if (typeof pos === 'number') openChartEditor(this.editor, pos)
  }

  private render() {
    const value = chartValueOf(this.node)
    // Its size before it loads, so the page does not move when it does.
    const size = chartValueSize(value)
    this.image.width = size.width
    this.image.height = size.height
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

  /**
   * Mouse events on the button and the handles are theirs (a handle's drag is no drag of the chart); everything else
   * (selecting, dragging the chart) is the editor's.
   */
  stopEvent(event: Event) {
    if (!(event.target instanceof globalThis.Node)) return false
    const target = event.target
    if (this.handles.some((handle) => handle.contains(target))) {
      return /^(mouse|pointer|click|dblclick|auxclick|contextmenu|drag)/.test(event.type)
    }
    return this.button.contains(target) && /^(mouse|pointer|click|dblclick|auxclick|contextmenu)/.test(event.type)
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    this.button.removeEventListener('mousedown', this.keepFocus)
    this.button.removeEventListener('click', this.edit)
    this.dom.removeEventListener('dblclick', this.edit)
    for (const handle of this.handles) {
      handle.removeEventListener('pointerdown', this.startResize)
      handle.removeEventListener('pointermove', this.moveResize)
      handle.removeEventListener('pointerup', this.endResize)
      handle.removeEventListener('pointercancel', this.cancelResize)
      handle.removeEventListener('mousedown', this.keepFocus)
    }
  }
}

/**
 * A chart block: bar, line or pie with its data table, or a function's graph or variation table, and its settings
 * (see `chart-data.ts`). In HTML (copy and paste, clipboard to other programs) it is the drawing as an `<img>`
 * carrying the chart's JSON in `data-chart`, which a paste reads back as a chart; pictures without it stay pictures.
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
    const size = chartValueSize(value)
    return [
      'img',
      {
        src: chartValueSrc(value),
        alt: chartValueAlt(value),
        width: String(size.width),
        height: String(size.height),
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
