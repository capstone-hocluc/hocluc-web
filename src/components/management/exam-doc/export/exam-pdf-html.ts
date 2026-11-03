import type { Editor, JSONContent } from '@tiptap/core'
import { DOMSerializer } from '@tiptap/pm/model'
import { withoutAnswerKey } from '../answer-key'
import { loadKatex, type Katex } from './katex-loader'

/*
 * The document as the HTML the server prints (POST /api/v1/exam-docs/pdf): the editor's own serialisation of the
 * document (renderHTML, not the paginated screen), made into what a CSS 2.1 print engine lays out. Choice grids and
 * the exam header become borderless tables, formulas MathML, charts inline SVG, pictures data URIs (the server
 * fetches nothing), a page break a `page-break-before` on the block after it. Only the body is sent: the server
 * prints it with its own style sheet (the sheet's A4 margins, Times New Roman 11.5pt) and keeps only the classes
 * and inline styles it knows.
 */

export interface ServerPdfHtml {
  html: string
  /** Pictures that could not be read, sent as their name ("[Hình]") instead. */
  missingImages: number
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const SVG_DATA = /^data:image\/svg\+xml(;charset=[^;,]+)?(;base64)?,/i
/** Pictures the server embeds as they are; any other kind is redrawn as PNG first. */
const PRINTABLE = /^data:image\/(png|jpeg|gif);base64,/i
/** How long one picture may take to download. */
const IMAGE_TIMEOUT_MS = 10_000
/** Header and choice-grid column shares, as exam-nodes.css lays them out (2fr 3fr; 4, 2 or 1 per row). */
const HEADER_WIDTHS = ['40%', '60%']
/** Spacing accents KaTeX writes over letters of \text{…} (its MathML spells "có" as o with ˊ above). */
const TEXT_ACCENTS: Record<string, string> = {
  'ˊ': '́',
  'ˋ': '̀',
  'ˆ': '̂',
  '˜': '̃',
  '~': '̃',
  'ˇ': '̌',
  '˘': '̆',
  '¨': '̈',
  '˙': '̇',
  'ˉ': '̄',
}

/** Reads a picture into a data URI. A copy the browser kept may lack the server's cross-origin answer, so it is asked again. */
export async function readAsDataUrl(src: string): Promise<string> {
  // A host that stalls must not hold the PDF up: the picture is then left out by name.
  const response = await fetch(src, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return blobToDataUrl(await response.blob())
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** A picture the server cannot embed (WebP, SVG, a blob URL…) redrawn as a PNG data URI. */
async function asPng(src: string): Promise<string> {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, image.naturalWidth || image.width)
  canvas.height = Math.max(1, image.naturalHeight || image.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No 2D canvas')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** The picture as a data URI the server embeds, or null when it cannot be read. */
async function printableSource(src: string): Promise<string | null> {
  try {
    const data = src.startsWith('data:') ? src : await readAsDataUrl(src)
    return PRINTABLE.test(data) ? data : await asPng(data)
  } catch {
    return null
  }
}

/** The options per row the grid at `pos` is shown with; null when the editor is not on the page. */
function measuredColumns(editor: Editor, pos: number): string | null {
  try {
    const dom = editor.view.nodeDOM(pos)
    return dom instanceof HTMLElement ? dom.getAttribute('data-columns') : null
  } catch {
    return null
  }
}

/** Options per row of each choice grid in document order, as the sheet shows them (an 'auto' grid is measured there). */
function shownColumns(editor: Editor, examOnly: boolean): Array<string | null> {
  const columns: Array<string | null> = []
  editor.state.doc.forEach((block, offset) => {
    if (examOnly && block.attrs.examKey) return
    const visit = (node: typeof block, pos: number) => {
      if (node.type.name === 'choiceGrid') {
        columns.push(measuredColumns(editor, pos))
        return
      }
      node.forEach((child, childOffset) => visit(child, pos + 1 + childOffset))
    }
    visit(block, offset)
  })
  return columns
}

/** Moves every child of `from` into `to`. */
function moveChildren(from: Node, to: Node) {
  while (from.firstChild) to.appendChild(from.firstChild)
}

function choiceGridTable(doc: Document, grid: Element, shown: string | null): HTMLTableElement {
  const cells = Array.from(grid.querySelectorAll(':scope > [data-choice-cell]'))
  const value = Number(shown ?? grid.getAttribute('data-columns'))
  const perRow = value === 1 || value === 2 || value === 4 ? value : 4
  const table = doc.createElement('table')
  table.className = 'exam-choice-grid'
  const colgroup = table.appendChild(doc.createElement('colgroup'))
  for (let index = 0; index < perRow; index += 1) {
    colgroup.appendChild(doc.createElement('col')).setAttribute('style', `width: ${100 / perRow}%`)
  }
  const tbody = table.appendChild(doc.createElement('tbody'))
  for (let start = 0; start < cells.length; start += perRow) {
    const row = tbody.appendChild(doc.createElement('tr'))
    for (const cell of cells.slice(start, start + perRow)) {
      const td = row.appendChild(doc.createElement('td'))
      const label = td.appendChild(doc.createElement('span'))
      label.className = 'exam-choice-label'
      label.textContent = cell.querySelector('.exam-choice-label')?.textContent ?? `${cell.getAttribute('data-label') ?? ''}.`
      td.append(' ')
      const body = td.appendChild(doc.createElement('span'))
      body.className = 'exam-choice-body'
      const source = cell.querySelector('[data-choice-body]')
      if (source) moveChildren(source, body)
    }
    // A short last row keeps the grid's columns.
    while (row.cells.length < perRow) row.appendChild(doc.createElement('td'))
  }
  return table
}

function headerTable(doc: Document, header: Element): HTMLTableElement {
  const table = doc.createElement('table')
  table.className = 'exam-header'
  const colgroup = table.appendChild(doc.createElement('colgroup'))
  HEADER_WIDTHS.forEach((width) => colgroup.appendChild(doc.createElement('col')).setAttribute('style', `width: ${width}`))
  const row = table.appendChild(doc.createElement('tbody')).appendChild(doc.createElement('tr'))
  header.querySelectorAll(':scope > [data-header-column]').forEach((column) => moveChildren(column, row.appendChild(doc.createElement('td'))))
  return table
}

/** A page break becomes `page-break-before` on the block after it; one that ends the document is dropped. */
function applyPageBreaks(root: Element) {
  for (const pageBreak of Array.from(root.querySelectorAll(':scope > [data-page-break]'))) {
    const next = pageBreak.nextElementSibling
    if (next && !next.hasAttribute('data-page-break')) {
      next.classList.add('exam-page-break')
      pageBreak.remove()
    } else if (next) {
      // Two breaks in a row leave a blank sheet between them, as on the screen.
      pageBreak.removeAttribute('data-page-break')
      pageBreak.className = 'exam-page-break'
    } else {
      pageBreak.remove()
    }
  }
}

/** The chart's drawing (the SVG its picture carries) inline, at the share of the text width the sheet gives it. */
function inlineSvgPicture(doc: Document, image: HTMLImageElement, className: string): Element | null {
  const src = image.getAttribute('src') ?? ''
  const head = SVG_DATA.exec(src)
  if (!head) return null
  const payload = src.slice(head[0].length)
  let markup: string
  try {
    markup = head[2] ? new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))) : decodeURIComponent(payload)
  } catch {
    return null
  }
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = parsed.documentElement
  if (svg.namespaceURI !== SVG_NS || svg.localName !== 'svg' || parsed.querySelector('parsererror')) return null
  const holder = doc.createElement('div')
  holder.className = className
  const width = image.style.width || (image.getAttribute('width') ? `${image.getAttribute('width')}px` : '')
  if (width) holder.setAttribute('style', `width: ${width}`)
  holder.appendChild(doc.importNode(svg, true))
  return holder
}

/** KaTeX's mhchem MathML, which a MathML 2 renderer misreads, made plain. */
function plainChemistry(math: Element) {
  // H₂: KaTeX writes the subscript on an invisible phantom (zero-width mpadded) placed after the H. The letter
  // before it becomes the base, and the zero-height mpadded around the number is unwrapped.
  for (const script of Array.from(math.querySelectorAll('msub, msup, msubsup'))) {
    const base = script.firstElementChild
    if (!base || base.localName !== 'mpadded' || !base.querySelector('mphantom')) continue
    const previous = script.previousElementSibling
    if (previous) base.replaceWith(previous)
    else base.replaceWith(math.ownerDocument.createElementNS(math.namespaceURI, 'mrow'))
  }
  for (const padded of Array.from(math.querySelectorAll('msub > mpadded, msup > mpadded, msubsup > mpadded'))) {
    if (padded.getAttribute('height') !== '0px') continue
    const row = math.ownerDocument.createElementNS(math.namespaceURI, 'mrow')
    moveChildren(padded, row)
    padded.replaceWith(row)
  }
  // The reaction arrow: a stretchy arrow over an empty box, drawn as a plain arrow with room on both sides.
  for (const over of Array.from(math.querySelectorAll('mover, munder'))) {
    const [arrow, box] = Array.from(over.children)
    if (arrow?.localName !== 'mo' || box?.localName !== 'mpadded' || box.textContent?.trim()) continue
    arrow.removeAttribute('stretchy')
    arrow.removeAttribute('minsize')
    arrow.setAttribute('lspace', '0.3em')
    arrow.setAttribute('rspace', '0.3em')
    over.replaceWith(arrow)
  }
}

/** Letters of \text{…} that KaTeX split into a letter and an accent above it ("có", "dấu") put back together. */
function composeTextAccents(math: Element) {
  const overs = Array.from(math.querySelectorAll('mover[accent="true"]')).reverse()
  for (const over of overs) {
    const [base, accent] = Array.from(over.children)
    const mark = accent?.localName === 'mo' ? TEXT_ACCENTS[accent.textContent ?? ''] : undefined
    if (!mark || base?.localName !== 'mtext' || Array.from(base.textContent ?? '').length !== 1) continue
    base.textContent = `${base.textContent}${mark}`.normalize('NFC')
    over.replaceWith(base)
  }
}

function mathElement(doc: Document, katex: Katex, latex: string, display: boolean): Element {
  const holder = doc.createElement('span')
  holder.className = display ? 'exam-math exam-math-display' : 'exam-math'
  const markup = katex.renderToString(latex, { output: 'mathml', displayMode: display, throwOnError: false, strict: 'ignore' })
  const parsed = new DOMParser().parseFromString(markup, 'text/html')
  const math = parsed.querySelector('math')
  if (!math) {
    holder.textContent = display ? `$$${latex}$$` : `$${latex}$`
    return holder
  }
  // The LaTeX copy is for screen readers; printed, it would be read out as text after the formula.
  math.querySelectorAll('annotation, annotation-xml').forEach((annotation) => annotation.remove())
  plainChemistry(math)
  composeTextAccents(math)
  holder.appendChild(doc.importNode(math, true))
  return holder
}

/** Attributes only the editor reads (data-*, contenteditable…) are left out; class and style stay. */
function stripEditorAttributes(root: Element) {
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const name of element.getAttributeNames()) {
      if (name.startsWith('data-') || name === 'contenteditable' || name === 'draggable' || name === 'spellcheck') {
        element.removeAttribute(name)
      }
    }
  }
}

/** The name a picture leaves where it could not be read, as the Word export writes "[name]". */
function missingPicture(doc: Document, alt: string | null): Element {
  const name = doc.createElement('span')
  name.className = 'exam-missing-picture'
  name.textContent = `[${alt?.trim() || 'Hình'}]`
  return name
}

/** The body HTML the server prints for the document `editor` holds; with `examOnly`, without its answer key. */
export async function buildServerPdfHtml(editor: Editor, { examOnly }: { examOnly: boolean }): Promise<ServerPdfHtml> {
  const json: JSONContent = editor.getJSON()
  const content = editor.schema.nodeFromJSON(examOnly ? withoutAnswerKey(json) : json)
  const columns = shownColumns(editor, examOnly)
  // An inert document: nothing in it loads (pictures) or runs while it is built.
  const doc = document.implementation.createHTMLDocument('')
  const root = doc.createElement('div')
  root.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(content.content, { document: doc }))

  root.querySelectorAll('[data-choice-grid]').forEach((grid, index) => grid.replaceWith(choiceGridTable(doc, grid, columns[index] ?? null)))
  root.querySelectorAll('[data-exam-header]').forEach((header) => header.replaceWith(headerTable(doc, header)))
  applyPageBreaks(root)

  const formulas = Array.from(root.querySelectorAll('span[data-math]'))
  if (formulas.length) {
    const katex = await loadKatex()
    for (const formula of formulas) {
      const latex = formula.getAttribute('data-latex') ?? ''
      formula.replaceWith(mathElement(doc, katex, latex, formula.getAttribute('data-display') === 'true'))
    }
  }

  let missingImages = 0
  for (const image of Array.from(root.querySelectorAll('img'))) {
    const chart = image.hasAttribute('data-chart')
    const inline = SVG_DATA.test(image.getAttribute('src') ?? '') ? inlineSvgPicture(doc, image, chart ? 'exam-chart' : 'exam-picture') : null
    if (inline) {
      image.replaceWith(inline)
      continue
    }
    const src = await printableSource(image.getAttribute('src') ?? '')
    if (src) {
      image.setAttribute('src', src)
      image.removeAttribute('srcset')
    } else {
      missingImages += 1
      image.replaceWith(missingPicture(doc, image.getAttribute('alt')))
    }
  }

  stripEditorAttributes(root)
  return { html: root.innerHTML, missingImages }
}
