import JSZip from 'jszip'
import mammoth from 'mammoth'
import {
  formulaMark,
  insertChoiceGrids,
  insertFormulaPictures,
  insertFormulas,
  insertPageBreaks,
  insertPictureSizes,
  PAGE_BREAK_MARK,
  pictureSizeMark,
  type Formula,
} from './exam-html'
import { loadKatex } from './katex-loader'
import { ommlText, ommlToLatex } from './omml-to-latex'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const XML = 'http://www.w3.org/XML/1998/namespace'
/** Word sizes drawings in EMU: 9525 to a CSS pixel. */
const EMU_PER_PX = 9525

/** Word headings, the title style, underline (mammoth leaves it out by default) and strikethrough. */
const STYLE_MAP = ["p[style-name='Title'] => h1:fresh", 'u => u', 'strike => s']

function textRun(xml: XMLDocument, text: string): Element {
  const run = xml.createElementNS(W, 'w:r')
  const t = xml.createElementNS(W, 'w:t')
  t.setAttributeNS(XML, 'xml:space', 'preserve')
  t.textContent = text
  run.append(t)
  return run
}

function attribute(element: Element, name: string): string | null {
  return element.getAttributeNS(W, name) ?? element.getAttribute(`w:${name}`)
}

/**
 * mammoth reads neither Word's equations nor its page breaks, so they are written into the text as placeholders
 * first: each equation's LaTeX is kept in `formulas`, at the index its placeholder names.
 */
function markEquations(xml: XMLDocument, formulas: Array<{ latex: string; text: string; display: boolean }>) {
  const mark = (math: Element, display: boolean) => {
    const latex = ommlToLatex(math)
    if (!latex) return ''
    formulas.push({ latex, text: ommlText(math), display })
    return formulaMark(formulas.length - 1)
  }
  for (const paragraph of Array.from(xml.getElementsByTagNameNS(M, 'oMathPara'))) {
    const maths = Array.from(paragraph.getElementsByTagNameNS(M, 'oMath'))
    paragraph.replaceWith(textRun(xml, maths.map((math) => mark(math, true)).join('')))
  }
  for (const math of Array.from(xml.getElementsByTagNameNS(M, 'oMath'))) {
    math.replaceWith(textRun(xml, mark(math, aloneInParagraph(math))))
  }
}

/** An equation with no text or picture beside it in its paragraph: Word shows it as a display equation. */
function aloneInParagraph(math: Element): boolean {
  const paragraph = math.parentElement
  if (paragraph?.namespaceURI !== W || paragraph.localName !== 'p') return false
  return Array.from(paragraph.children).every((child) => {
    if (child === math || child.localName === 'pPr' || child.localName.startsWith('bookmark')) return true
    if (child.localName === 'oMath') return false
    return !(child.textContent ?? '').trim() && !child.getElementsByTagNameNS(W, 'drawing').length
  })
}

/** mammoth drops a picture's size, so it rides in the picture's description into the HTML. */
function markPictureSizes(xml: XMLDocument) {
  for (const extent of Array.from(xml.getElementsByTagNameNS(WP, 'extent'))) {
    const holder = extent.parentElement
    const properties = holder
      ? Array.from(holder.children).find((child) => child.namespaceURI === WP && child.localName === 'docPr')
      : undefined
    const width = Math.round(Number(extent.getAttribute('cx')) / EMU_PER_PX)
    const height = Math.round(Number(extent.getAttribute('cy')) / EMU_PER_PX)
    if (!properties || !(width > 0) || !(height > 0)) continue
    const description = properties.getAttribute('descr')?.trim() || properties.getAttribute('title') || ''
    properties.setAttribute('descr', description + pictureSizeMark(width, height))
  }
}

function markPageBreaks(xml: XMLDocument) {
  for (const lineBreak of Array.from(xml.getElementsByTagNameNS(W, 'br'))) {
    if (attribute(lineBreak, 'type') !== 'page') continue
    const t = xml.createElementNS(W, 'w:t')
    t.textContent = PAGE_BREAK_MARK
    lineBreak.replaceWith(t)
  }
  for (const flag of Array.from(xml.getElementsByTagNameNS(W, 'pageBreakBefore'))) {
    const value = attribute(flag, 'val')
    if (value === '0' || value === 'false' || value === 'off') continue
    const paragraph = flag.parentElement?.parentElement
    const properties = flag.parentElement
    if (paragraph?.localName === 'p' && properties) properties.after(textRun(xml, PAGE_BREAK_MARK))
  }
}

/**
 * A .docx as the editor's HTML (mammoth: headings, lists, tables, bold/italic/underline, links, pictures as data
 * URLs), with Word equations as formulas, page breaks, and "A. … B. …" option tables or lines as choice grids.
 * Alignment, colours, fonts and indents are not read (mammoth keeps the structure, not the looks).
 */
export async function docxToElement(data: ArrayBuffer): Promise<HTMLElement> {
  const zip = await JSZip.loadAsync(data)
  const part = zip.file('word/document.xml')
  if (!part) throw new Error('Không phải tệp Word')
  const xml = new DOMParser().parseFromString(await part.async('string'), 'application/xml')
  if (xml.getElementsByTagName('parsererror').length) throw new Error('Tệp Word bị hỏng')

  const equations: Array<{ latex: string; text: string; display: boolean }> = []
  markEquations(xml, equations)
  markPageBreaks(xml)
  markPictureSizes(xml)
  zip.file('word/document.xml', new XMLSerializer().serializeToString(xml))
  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: STYLE_MAP, convertImage: mammoth.images.dataUri })
  const body = new DOMParser().parseFromString(result.value, 'text/html').body

  // An equation KaTeX cannot set is kept as its characters rather than a formula that shows an error.
  const katex = equations.length ? await loadKatex() : null
  const formulas: Array<Formula | string> = equations.map(({ latex, text, display }) => {
    try {
      katex?.renderToString(latex, { throwOnError: true, strict: 'ignore', displayMode: display })
      return { latex, display }
    } catch {
      return text
    }
  })
  insertFormulas(body, formulas)
  insertPictureSizes(body)
  insertFormulaPictures(body)
  insertPageBreaks(body)
  insertChoiceGrids(body)
  return body
}
