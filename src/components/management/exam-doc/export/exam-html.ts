import { DOMParser as SchemaParser, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model'
import { CHOICE_LABELS } from '../nodes/choice-grid'

/*
 * Imported HTML (from Word through mammoth, or from Markdown) turned into the editor's own HTML before it is parsed:
 * formula, page-break and picture-size placeholders, formula pictures, and "A. … B. …" options as choice grids.
 */

// Private-use characters (U+E000, U+E001), which no real text holds.
const MARK_OPEN = String.fromCharCode(0xe000)
const MARK_CLOSE = String.fromCharCode(0xe001)
/** Written into a .docx's text where a page break was, before mammoth reads it. */
export const PAGE_BREAK_MARK = `${MARK_OPEN}PB${MARK_CLOSE}`
/** Written into a .docx's text where formula `index` was. */
export const formulaMark = (index: number) => `${MARK_OPEN}M${index}${MARK_CLOSE}`

export interface Formula {
  latex: string
  display: boolean
}

const FORMULA_MARK = new RegExp(`${MARK_OPEN}M(\\d+)${MARK_CLOSE}`, 'g')
const PAGE_BREAK_PATTERN = new RegExp(PAGE_BREAK_MARK, 'g')
/** "A." (or "A)") opening an option. */
const OPTION_LABEL = /^\s*([A-H])\s*[.)]\s*/
const CONTENT = 'img, [data-math]'

export function mathElement(doc: Document, formula: Formula): HTMLElement {
  const span = doc.createElement('span')
  span.setAttribute('data-math', '')
  span.setAttribute('data-latex', formula.latex)
  span.setAttribute('data-display', String(formula.display))
  return span
}

function textNodes(root: Node): Text[] {
  const walker = (root.ownerDocument ?? (root as Document)).createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text)
  return nodes
}

function hasContent(node: Node): boolean {
  if ((node.textContent ?? '').trim()) return true
  if (node instanceof Element && node.matches(CONTENT)) return true
  return node instanceof Element || node instanceof DocumentFragment ? Boolean(node.querySelector(CONTENT)) : false
}

/** Formula placeholders become the editor's math spans; a formula KaTeX could not read stays as its text. */
export function insertFormulas(root: HTMLElement, formulas: Array<Formula | string>) {
  const doc = root.ownerDocument
  for (const text of textNodes(root)) {
    if (!text.data.includes(MARK_OPEN)) continue
    const parts = text.data.split(FORMULA_MARK)
    if (parts.length === 1) continue
    const fragment = doc.createDocumentFragment()
    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        if (part) fragment.append(part)
        return
      }
      const formula = formulas[Number(part)]
      if (typeof formula === 'string') fragment.append(formula)
      else if (formula) fragment.append(mathElement(doc, formula))
    })
    text.replaceWith(fragment)
  }
}

/** Written after a .docx picture's description: its size in Word, which mammoth does not keep. */
export const pictureSizeMark = (width: number, height: number) => `${MARK_OPEN}S${width}x${height}${MARK_CLOSE}`
const PICTURE_SIZE = new RegExp(`${MARK_OPEN}S(\\d+)x(\\d+)${MARK_CLOSE}$`)

/** Pictures keep the size they had in Word (their width/height attributes), and their own description. */
export function insertPictureSizes(root: HTMLElement) {
  for (const image of Array.from(root.querySelectorAll('img[alt]'))) {
    const alt = image.getAttribute('alt') ?? ''
    const match = PICTURE_SIZE.exec(alt)
    if (!match) continue
    image.setAttribute('width', match[1])
    image.setAttribute('height', match[2])
    const description = alt.slice(0, match.index)
    if (description) image.setAttribute('alt', description)
    else image.removeAttribute('alt')
  }
}

const FORMULA_PICTURE = /^\$(\$?)([\s\S]+?)\1\$$/

/** Pictures the Word export made of formulas (their description is the LaTeX, "$…$") become formulas again. */
export function insertFormulaPictures(root: HTMLElement) {
  for (const image of Array.from(root.querySelectorAll('img[alt]'))) {
    const match = FORMULA_PICTURE.exec(image.getAttribute('alt')?.trim() ?? '')
    if (match) image.replaceWith(mathElement(root.ownerDocument, { latex: match[2], display: match[1] === '$' }))
  }
}

/**
 * The block's content cut at matches of `separator` in its text (and at <br> elements when `breaks`); each piece
 * keeps the inline elements (bold, links…) it was inside.
 */
function splitBlock(block: Element, separator: RegExp | null, breaks = true): DocumentFragment[] {
  const doc = block.ownerDocument
  const cuts: Range[] = []
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Element) {
      if (breaks && node.tagName === 'BR') {
        const range = doc.createRange()
        range.selectNode(node)
        cuts.push(range)
      }
    } else if (separator) {
      for (const match of (node as Text).data.matchAll(separator)) {
        const range = doc.createRange()
        range.setStart(node, match.index)
        range.setEnd(node, match.index + match[0].length)
        cuts.push(range)
      }
    }
  }
  const pieces: DocumentFragment[] = []
  let from: [Node, number] = [block, 0]
  for (const cut of [...cuts, null]) {
    const range = doc.createRange()
    range.setStart(...from)
    if (cut) range.setEnd(cut.startContainer, cut.startOffset)
    else range.setEnd(block, block.childNodes.length)
    pieces.push(range.cloneContents())
    if (cut) from = [cut.endContainer, cut.endOffset]
  }
  return pieces
}

/** Page-break placeholders become page breaks; a paragraph holding one is split around it. */
export function insertPageBreaks(root: HTMLElement) {
  const doc = root.ownerDocument
  const blocks = new Set<Element>()
  for (const text of textNodes(root)) {
    if (!text.data.includes(PAGE_BREAK_MARK)) continue
    const block = text.parentElement?.closest('p, h1, h2, h3, h4, h5, h6')
    // Only a break between the sheet's blocks is kept; one inside a table or a list is dropped.
    if (block && block.parentElement === root) blocks.add(block)
    else text.data = text.data.replace(PAGE_BREAK_PATTERN, '')
  }
  for (const block of blocks) {
    const nodes: Node[] = []
    splitBlock(block, PAGE_BREAK_PATTERN, false).forEach((piece, index) => {
      if (index > 0) {
        const pageBreak = doc.createElement('div')
        pageBreak.setAttribute('data-page-break', '')
        nodes.push(pageBreak)
      }
      if (!hasContent(piece)) return
      const copy = block.cloneNode(false) as Element
      copy.append(piece)
      nodes.push(copy)
    })
    block.replaceWith(...nodes)
  }
}

/** Removes `count` characters from the start of the piece's text, and the inline elements that leaves empty. */
function dropLeadingText(piece: DocumentFragment, count: number) {
  let left = count
  for (const text of textNodes(piece)) {
    if (left <= 0) break
    const taken = Math.min(left, text.data.length)
    text.data = text.data.slice(taken)
    left -= taken
  }
  for (const element of Array.from(piece.querySelectorAll('*')).reverse()) {
    if (!element.matches(`${CONTENT}, br`) && !hasContent(element) && !element.querySelector('br')) element.remove()
  }
}

interface ChoiceOption {
  letter: string
  content: DocumentFragment
}

/** The piece as option `letter` ("A. …" / "A) …"), its label taken off, or null. */
function optionOf(piece: DocumentFragment, letter: string): ChoiceOption | null {
  const match = OPTION_LABEL.exec(piece.textContent ?? '')
  if (!match || match[1] !== letter) return null
  dropLeadingText(piece, match[0].length)
  return { letter, content: piece }
}

const letterAt = (index: number) => CHOICE_LABELS[index] ?? ''

function choiceGridElement(doc: Document, options: ChoiceOption[], columns: 1 | 2 | 4 | 'auto'): HTMLElement {
  const grid = doc.createElement('div')
  grid.setAttribute('data-choice-grid', '')
  grid.setAttribute('data-choice-columns', String(columns))
  for (const option of options) {
    const cell = doc.createElement('div')
    cell.setAttribute('data-choice-cell', '')
    cell.setAttribute('data-label', option.letter)
    const body = doc.createElement('div')
    body.setAttribute('data-choice-body', '')
    body.append(option.content)
    while (body.firstChild instanceof HTMLBRElement) body.firstChild.remove()
    while (body.lastChild instanceof HTMLBRElement) body.lastChild.remove()
    cell.append(body)
    grid.append(cell)
  }
  return grid
}

/** A cell's content as inline content: its paragraphs one per line. */
function cellInline(cell: Element): DocumentFragment {
  const doc = cell.ownerDocument
  const fragment = doc.createDocumentFragment()
  for (const child of Array.from(cell.childNodes)) {
    if (child instanceof Element && /^(P|H[1-6]|DIV)$/.test(child.tagName)) {
      if (fragment.childNodes.length) fragment.append(doc.createElement('br'))
      fragment.append(...Array.from(child.childNodes, (node) => node.cloneNode(true)))
    } else {
      fragment.append(child.cloneNode(true))
    }
  }
  return fragment
}

/** Tables whose cells read "A. …", "B. …" in order (as Word exports options) become choice grids. */
function tablesToChoices(root: HTMLElement) {
  for (const table of Array.from(root.querySelectorAll(':scope > table'))) {
    const rows = Array.from((table as HTMLTableElement).rows)
    const cells = rows.flatMap((row) => Array.from(row.cells))
    while (cells.length && !hasContent(cells[cells.length - 1])) cells.pop()
    if (cells.length < 2 || cells.length > CHOICE_LABELS.length) continue
    const options: ChoiceOption[] = []
    for (const [index, cell] of cells.entries()) {
      const option = optionOf(cellInline(cell), letterAt(index))
      if (!option) break
      options.push(option)
    }
    if (options.length !== cells.length) continue
    const perRow = rows[0]?.cells.length
    table.replaceWith(choiceGridElement(root.ownerDocument, options, perRow === 1 || perRow === 2 || perRow === 4 ? perRow : 'auto'))
  }
}

/**
 * Paragraphs whose lines or tab-separated parts read "A. …", "B. …" in order, one after another, become one choice
 * grid: one option per line, "A. … ⇥ B. …" on one line, or a paragraph per option.
 */
function paragraphsToChoices(root: HTMLElement) {
  const children = Array.from(root.children)
  let index = 0
  while (index < children.length) {
    const run: Element[] = []
    const options: ChoiceOption[] = []
    for (let next = index; next < children.length && children[next].tagName === 'P'; next += 1) {
      const pieces = splitBlock(children[next], /\t+|\n/g).filter(hasContent)
      const found: ChoiceOption[] = []
      for (const piece of pieces) {
        const option = optionOf(piece, letterAt(options.length + found.length))
        if (!option) break
        found.push(option)
      }
      if (!pieces.length || found.length !== pieces.length) break
      run.push(children[next])
      options.push(...found)
    }
    if (options.length >= 2) {
      run[0].replaceWith(choiceGridElement(root.ownerDocument, options, 'auto'))
      run.slice(1).forEach((paragraph) => paragraph.remove())
      index += run.length
    } else {
      index += 1
    }
  }
}

export function insertChoiceGrids(root: HTMLElement) {
  tablesToChoices(root)
  paragraphsToChoices(root)
}

/** The prepared HTML as a document of the editor's schema. */
export function parseExamHtml(schema: Schema, root: HTMLElement): ProseMirrorNode {
  // A picture is a block of its own in the editor; a paragraph holding only pictures would leave an empty line.
  for (const paragraph of Array.from(root.querySelectorAll('p'))) {
    const only = Array.from(paragraph.childNodes).every(
      (node) => (node instanceof HTMLImageElement) || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
    )
    const firstOfItem = paragraph.parentElement?.tagName === 'LI' && paragraph.parentElement.firstElementChild === paragraph
    if (only && paragraph.querySelector('img') && !firstOfItem) paragraph.replaceWith(...Array.from(paragraph.querySelectorAll('img')))
  }
  return SchemaParser.fromSchema(schema).parse(root)
}
