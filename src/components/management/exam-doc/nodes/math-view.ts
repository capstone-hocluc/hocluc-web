import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView, NodeView } from '@tiptap/pm/view'
import { loadKatex } from '../../../ui/katex-loader'

type OnEdit = (pos: number, value: { latex: string; display: boolean }) => void

const SELECTED = ['ring-2', 'ring-input-primary-focus-border']

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
    // Until KaTeX arrives the formula shows as typed, marked pending so printing can wait until every formula is set.
    const pending = document.createElement('span')
    pending.setAttribute('data-math-pending', '')
    pending.textContent = display ? `$$${latex}$$` : `$${latex}$`
    this.dom.replaceChildren(pending)
    loadKatex().then(
      (katex) => {
        if (!this.live || this.latex !== latex || this.display !== display) return
        // relative: KaTeX's hidden MathML copy is absolutely placed and must stay inside the formula's box
        const set = document.createElement('span')
        set.className = 'relative'
        katex.render(latex, set, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
        this.dom.replaceChildren(set)
      },
      () => undefined
    )
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false
    const changed = node.attrs.latex !== this.node.attrs.latex || node.attrs.display !== this.node.attrs.display
    this.node = node
    if (changed) this.render()
    return true
  }

  selectNode() {
    this.dom.classList.add(...SELECTED)
  }

  deselectNode() {
    this.dom.classList.remove(...SELECTED)
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
