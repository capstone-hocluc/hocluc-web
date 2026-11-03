import { Extension, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, Selection, type EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

/**
 * Print layout: the document is one editable flow laid over a stack of A4 sheets (drawn by DocSheet). After every
 * change the top-level blocks are measured and a spacer widget is put before each block that would cross a sheet's
 * bottom margin, so that block starts at the top margin of the next sheet. A block taller than a sheet runs over.
 */

const PX_PER_MM = 96 / 25.4
/** A4 at 96 dpi with the exam margins (top 2 cm, bottom 2 cm) and 24px of grey between sheets; must match exam-doc.css. */
export const PAGE = {
  height: 297 * PX_PER_MM,
  marginTop: 20 * PX_PER_MM,
  marginBottom: 20 * PX_PER_MM,
  gap: 24,
} as const
const CONTENT_HEIGHT = PAGE.height - PAGE.marginTop - PAGE.marginBottom
const PITCH = PAGE.height + PAGE.gap

/** Rounding slack: a block sticking out by less than this still fits. */
const SLACK = 0.5
/** Spacer updates in a row from the same content layout before the plugin stops correcting its own layout. */
const MAX_SELF_UPDATES = 4

const GAP_CLASS = 'exam-doc-page-gap'
/** Set on the editor's parent for the instant the natural (spacer-free) layout is read. */
const MEASURING_CLASS = 'exam-doc-measuring'

interface Gap {
  /** Document position of the block that starts the next sheet. */
  pos: number
  height: number
}

interface Block {
  pos: number
  isBreak: boolean
  /** Border box, in unzoomed px from the top of the first sheet's content area, with no spacers. */
  top: number
  height: number
  marginTop: number
  marginBottom: number
  /** How much lower than its own top margin the block sits after a spacer (a first child's margin collapsing through). */
  lift: number
}

const paginationKey = new PluginKey<DecorationSet>('examPagination')
const views = new WeakMap<EditorView, PaginationView>()

function gapWidget(height: number) {
  const element = document.createElement('div')
  element.className = GAP_CLASS
  element.style.height = `${height}px`
  element.setAttribute('aria-hidden', 'true')
  return element
}

function decorate(doc: ProseMirrorNode, gaps: Gap[]) {
  return DecorationSet.create(
    doc,
    gaps.map((gap) =>
      Decoration.widget(gap.pos, () => gapWidget(gap.height), {
        side: -1,
        ignoreSelection: true,
        key: `${GAP_CLASS}-${gap.height.toFixed(2)}`,
        height: gap.height,
      })
    )
  )
}

function sameGaps(set: DecorationSet, gaps: Gap[]) {
  const current = set.find()
  return (
    current.length === gaps.length &&
    current.every((decoration, index) => decoration.from === gaps[index].pos && Math.abs(decoration.spec.height - gaps[index].height) < SLACK)
  )
}

/** CSS `zoom` on an ancestor scales client rects; offsets and computed margins stay in the sheet's own px. */
function zoomOf(element: HTMLElement) {
  const zoom = (element as { currentCSSZoom?: number }).currentCSSZoom
  if (typeof zoom === 'number' && zoom > 0) return zoom
  return element.offsetWidth > 0 ? element.getBoundingClientRect().width / element.offsetWidth : 1
}

interface Placed {
  pos: number
  dom: HTMLElement
  isBreak: boolean
  /** Border box as laid out now (spacers included), in unzoomed px from the editor's top. */
  top: number
  height: number
}

/** The top-level blocks as they sit now; null while the editor is detached or hidden (the structured view shows). */
function readLayout(view: EditorView): { zoom: number; placed: Placed[] } | null {
  const root = view.dom as HTMLElement
  if (!root.parentElement || !root.isConnected || root.offsetParent === null) return null
  const zoom = zoomOf(root)
  const origin = root.getBoundingClientRect().top
  const placed: Placed[] = []
  view.state.doc.forEach((node, pos) => {
    const dom = view.nodeDOM(pos)
    if (!(dom instanceof HTMLElement)) return
    const box = dom.getBoundingClientRect()
    placed.push({ pos, dom, isBreak: node.type.name === 'pageBreak', top: (box.top - origin) / zoom, height: box.height / zoom })
  })
  return { zoom, placed }
}

function sameLayout(a: Placed[], b: Placed[]) {
  return (
    a.length === b.length &&
    a.every((box, index) => box.dom === b[index].dom && Math.abs(box.top - b[index].top) < 0.01 && Math.abs(box.height - b[index].height) < 0.01)
  )
}

/** The same blocks with the spacers taken out: the natural flow the page breaks are computed from. */
function readNatural(view: EditorView, zoom: number, placed: Placed[]): Block[] {
  const root = view.dom as HTMLElement
  const host = root.parentElement as HTMLElement
  const extras = placed.map(({ dom }) => {
    const style = getComputedStyle(dom)
    const marginTop = parseFloat(style.marginTop) || 0
    const marginBottom = parseFloat(style.marginBottom) || 0
    // Where a block that already starts a sheet really sits under its spacer.
    const before = dom.previousElementSibling
    let lift = 0
    if (before instanceof HTMLElement && before.classList.contains(GAP_CLASS)) {
      lift = (dom.getBoundingClientRect().top - before.getBoundingClientRect().bottom) / zoom - marginTop
      if (Math.abs(lift) < SLACK) lift = 0
    }
    return { marginTop, marginBottom, lift }
  })

  host.classList.add(MEASURING_CLASS)
  const origin = root.getBoundingClientRect().top
  const blocks = placed.map(({ pos, dom, isBreak }, index) => {
    const box = dom.getBoundingClientRect()
    return { pos, isBreak, top: (box.top - origin) / zoom, height: box.height / zoom, ...extras[index] }
  })
  host.classList.remove(MEASURING_CLASS)
  return blocks
}

/** Where the spacers go, given the natural layout, and how many sheets that makes. */
function paginate(blocks: Block[]): { gaps: Gap[]; pages: number } {
  const gaps: Gap[] = []
  let shift = 0
  let page = 0
  /** Something already sits on `page` (a block, or the tail of one that ran over). */
  let occupied = false
  /** The sheet the next block must start, after an explicit page break. */
  let forced: number | null = null
  let previous: Block | null = null
  let previousBottom = 0
  let end = 0

  for (const block of blocks) {
    let top = block.top + shift
    const natural = Math.max(0, Math.floor((top + SLACK) / PITCH))
    if (natural > page) {
      page = natural
      occupied = true
    }
    const contentBottom = page * PITCH + CONTENT_HEIGHT
    let target: number | null = null
    if (previous && forced !== null) target = forced
    else if (previous && !block.isBreak && (top > contentBottom || (occupied && top + block.height > contentBottom + SLACK))) {
      target = page + 1
    }

    if (previous && target !== null) {
      // The spacer takes the previous block's bottom margin and this block's top margin, so the border box lands on the margin.
      const height = Math.max(0, target * PITCH - previousBottom - previous.marginBottom - block.marginTop - block.lift)
      gaps.push({ pos: block.pos, height })
      top = previousBottom + previous.marginBottom + height + block.marginTop + block.lift
      shift = top - block.top
      page = target
    }

    const bottom = top + block.height
    forced = block.isBreak ? Math.floor((top + SLACK) / PITCH) + 1 : null
    occupied = true
    previous = block
    previousBottom = bottom
    end = Math.max(end, bottom)
  }

  return { gaps, pages: Math.max(1, Math.floor((end - SLACK) / PITCH) + 1) }
}

class PaginationView {
  private view: EditorView
  private readonly onPages: (pages: number) => void
  private readonly observer: ResizeObserver
  private frame = 0
  private pages = 0
  private selfUpdates = 0
  /** The natural layout the last spacers were computed from, rounded. */
  private input = ''
  /** The block boxes when the spacers last matched the content; the same boxes need no new measuring. */
  private settled: Placed[] | null = null

  constructor(view: EditorView, onPages: (pages: number) => void) {
    this.view = view
    this.onPages = onPages
    views.set(view, this)
    // Node views, images and fonts change block heights after the transaction that added them.
    this.observer = new ResizeObserver(this.schedule)
    this.observer.observe(view.dom)
    document.fonts?.addEventListener('loadingdone', this.schedule)
    this.schedule()
  }

  update(view: EditorView, previous: EditorState) {
    this.view = view
    // Spacer-only transactions are not a reason to measure again.
    if (view.state.doc !== previous.doc) {
      this.selfUpdates = 0
      this.schedule()
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame)
    this.frame = 0
    this.observer.disconnect()
    document.fonts?.removeEventListener('loadingdone', this.schedule)
    views.delete(this.view)
    this.settled = null
  }

  /** Measures again on the next frame (zoom changes, which no observer reports). */
  request() {
    this.selfUpdates = 0
    this.settled = null
    this.schedule()
  }

  readonly schedule = () => {
    if (!this.frame) this.frame = requestAnimationFrame(this.run)
  }

  private readonly run = () => {
    this.frame = 0
    const { view } = this
    // An IME composition must not see its text moved; the transaction that ends it measures again.
    if (view.isDestroyed || view.composing || window.matchMedia('print').matches) return
    const layout = readLayout(view)
    if (!layout) return
    // Typing inside a line moves no block: skip taking the spacers out and laying everything out again.
    if (this.settled && sameLayout(this.settled, layout.placed)) return
    const blocks = readNatural(view, layout.zoom, layout.placed)
    // Content that grew on its own (a formula rendered, an image decoded) is new input, not the layout correcting itself.
    const input = blocks.map((block) => `${block.top.toFixed(1)}:${block.height.toFixed(1)}`).join(' ')
    if (input !== this.input) {
      this.input = input
      this.selfUpdates = 0
    }
    const { gaps, pages } = paginate(blocks)
    if (pages !== this.pages) {
      this.pages = pages
      this.onPages(pages)
    }
    const current = paginationKey.getState(view.state) ?? DecorationSet.empty
    if (sameGaps(current, gaps)) {
      this.settled = layout.placed
      return
    }
    this.settled = null
    if (this.selfUpdates >= MAX_SELF_UPDATES) return
    this.selfUpdates += 1
    const tr = view.state.tr.setMeta(paginationKey, gaps).setMeta('addToHistory', false)
    // Follow the caret only when it was on screen: content added elsewhere must not pull the view back to it.
    if (view.hasFocus() && caretOnScreen(view)) tr.scrollIntoView()
    view.dispatch(tr)
  }
}

function caretOnScreen(view: EditorView) {
  const caret = view.coordsAtPos(view.state.selection.head)
  let top = 0
  let bottom = window.innerHeight
  for (let element = view.dom.parentElement; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element)
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue
    const box = element.getBoundingClientRect()
    top = Math.max(top, box.top)
    bottom = Math.min(bottom, box.bottom)
    break
  }
  return caret.bottom > top && caret.top < bottom
}

export interface ExamPaginationOptions {
  /** Called with the page count whenever it changes. Must be stable (it is fixed into the editor when it is built). */
  onPages: (pages: number) => void
}

export const ExamPagination = Extension.create<ExamPaginationOptions>({
  name: 'examPagination',
  addOptions: () => ({ onPages: () => undefined }),
  addProseMirrorPlugins() {
    const { onPages } = this.options
    return [
      new Plugin<DecorationSet>({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            const gaps = tr.getMeta(paginationKey) as Gap[] | undefined
            if (gaps) return decorate(tr.doc, gaps)
            return tr.docChanged ? set.map(tr.mapping, tr.doc) : set
          },
        },
        props: { decorations: (state) => paginationKey.getState(state) },
        view: (view) => new PaginationView(view, onPages),
      }),
    ]
  },
})

/** Lays the sheets out again on the next frame; call it when the zoom changes. */
export function repaginate(editor: Editor) {
  if (!editor.isDestroyed) views.get(editor.view)?.request()
}

/** Puts the caret on the text nearest to a click on a sheet outside the text (its margins, below the last line). */
export function placeCaretNear(editor: Editor, x: number, y: number) {
  if (editor.isDestroyed || !editor.isEditable) return false
  const { view } = editor
  const box = view.dom.getBoundingClientRect()
  const left = Math.min(Math.max(x, box.left + 1), box.right - 1)
  const top = Math.min(Math.max(y, box.top + 1), box.bottom - 1)
  const hit = view.posAtCoords({ left, top })
  if (!hit) return false
  view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(hit.pos))))
  view.focus()
  return true
}
