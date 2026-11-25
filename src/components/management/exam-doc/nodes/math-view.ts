import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView, NodeView } from '@tiptap/pm/view'
import { loadedKatex, loadKatex, type Katex } from '../../../ui/katex-loader'

type OnEdit = (pos: number, value: { latex: string; display: boolean }) => void

/** Tints only the formula (exam-doc.css); a ring around the inline box covered the words beside it. */
const SELECTED = 'exam-doc-math-selected'

/**
 * A formula set by KaTeX straight into the DOM. A React node view per formula made a long exam slow to fill: every
 * formula the AI wrote mounted its own React root inside the editor's update and asked React to flush while it was
 * already rendering. A double click opens the formula in the dialog; Enter or Space on a selected formula does the
 * same through the node's keyboard shortcuts.
 */
export class MathView implements NodeView {
  dom: HTMLElement
  private node: ProseMirrorNode
  private live = true

  constructor(
    node: ProseMirrorNode,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    private readonly onEdit: OnEdit
  ) {
    this.node = node
    this.dom = document.createElement('span')
    this.dom.setAttribute('data-math', '')
    this.dom.title = 'Bấm đúp để sửa công thức'
    this.dom.addEventListener('dblclick', this.edit)
    this.render()
  }

  private get latex() {
    return String(this.node.attrs.latex ?? '')
  }

  private get display() {
    return Boolean(this.node.attrs.display)
  }

  private edit = () => {
    if (!this.view.editable) return
    const pos = this.getPos()
    if (typeof pos === 'number') this.onEdit(pos, { latex: this.latex, display: this.display })
  }

  private render() {
    const { latex, display } = this
    this.dom.className = `exam-doc-math cursor-pointer rounded-sm${display ? ' block text-center' : ''}`
    const ready = loadedKatex()
    if (ready) {
      this.set(ready, latex, display)
      return
    }
    // Until KaTeX arrives a shimmer about the formula's size holds its place (never the `$…$` typed), marked pending so
    // printing can wait until every formula is set.
    const pending = document.createElement('span')
    pending.setAttribute('data-math-pending', '')
    pending.setAttribute('aria-label', latex)
    pending.className = 'inline-block h-[1.1em] animate-pulse-custom rounded-md bg-skeleton-gradient-50 align-middle'
    pending.style.width = `${Math.min(Math.max(latex.length * 0.5, 2), display ? 24 : 12)}em`
    this.dom.replaceChildren(pending)
    const current = () => this.live && this.latex === latex && this.display === display
    loadKatex().then(
      (katex) => {
        if (current()) this.set(katex, latex, display)
      },
      () => {
        // KaTeX could not be fetched: the formula as typed, readable, and no longer pending.
        if (current()) this.dom.replaceChildren(display ? `$$${latex}$$` : `$${latex}$`)
      }
    )
  }

  private set(katex: Katex, latex: string, display: boolean) {
    // relative: KaTeX's hidden MathML copy is absolutely placed and must stay inside the formula's box
    const set = document.createElement('span')
    set.className = 'relative'
    katex.render(latex, set, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    this.dom.replaceChildren(set)
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false
    const changed = node.attrs.latex !== this.node.attrs.latex || node.attrs.display !== this.node.attrs.display
    this.node = node
    if (changed) this.render()
    return true
  }

  selectNode() {
    this.dom.classList.add(SELECTED)
  }

  deselectNode() {
    this.dom.classList.remove(SELECTED)
  }

  /** KaTeX rewrites the inside; that is not an edit of the document. */
  ignoreMutation() {
    return true
  }

  destroy() {
    this.live = false
    this.dom.removeEventListener('dblclick', this.edit)
  }
}
