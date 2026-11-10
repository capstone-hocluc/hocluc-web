import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { repaginate } from '../pagination'
import { requestExamPdf } from '../../../../services/examDocPdfService'
import { buildServerPdfHtml, readAsDataUrl } from './exam-pdf-html'
import { documentTitle, downloadBlob, fileNameFor } from './file-name'

/*
 * The sheet as a PDF, made by the server when it can and by this browser otherwise.
 *
 * The server prints the document's HTML (exam-pdf-html.ts) with real, selectable text. The browser draws every A4
 * sheet as the screen draws it at 100% and sets it on a PDF page as one picture, so formulas, charts and page breaks
 * come out as the editor shows them (the text cannot be selected); its capture library and PDF writer are fetched
 * the first time it makes a PDF.
 */

/**
 * 'client' draws the pages in this browser; 'auto' asks the server first and, on any failure (no backend, an error,
 * a timeout, a refused session), quietly draws them in the browser.
 */
export type PdfRender = 'client' | 'auto'

export interface PdfOptions {
  /** Code of the exam variant (mã đề) on the sheet, for the file name. */
  code?: string | null
  /** The exam without its answer key: the key's blocks and the sheets holding only the key are left out. */
  examOnly?: boolean
  render?: PdfRender
}

export interface PdfResult {
  pages: number
  /** Pictures that could not be read, drawn as a frame with their name instead. */
  missingImages: number
}

/** A failure whose message (in Vietnamese) is meant for the person. */
export class PdfError extends Error {}

interface RenderOptions {
  title: string
  examOnly: boolean
}

/** Makes the PDF of the document `editor` shows. */
type Renderer = (editor: Editor, options: RenderOptions) => Promise<PdfResult & { blob: Blob }>

/** 2.5 pixels per CSS pixel: 240 dpi on paper, sharp text without heavy pages. */
const SCALE = 2.5
const JPEG_QUALITY = 0.92
const A4_MM = { width: 210, height: 297 } as const
/** How long formulas still being set are waited for. */
const MATH_WAIT_MS = 5000
/** Frames the spacers and the sheet count must stay the same for, and the most frames to wait for that. */
const STEADY_FRAMES = 3
const MAX_SETTLE_FRAMES = 90
/** Characters XML refuses (a control character in pasted text, a lone surrogate): the SVG would not load with them. */
const NOT_XML = /[^\t\n\r\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu
/** Safari and Firefox decode the pictures inside an SVG late, so a page with pictures is drawn again a few times. */
const LATE_PICTURES = !/Chrome\//.test(navigator.userAgent)
const REDRAWS = 3
const REDRAW_DELAY_MS = 100
/**
 * Marks a block whose height comes from its content. The capture writes every element's computed height into it, and
 * a fixed height keeps a last child's bottom margin from collapsing through its parent (a table's margin through its
 * wrapper), which moves everything below it up; so these heights are left free and the text lays out as on the sheet.
 */
const FLOW = 'data-pdf-flow'
/** Elements whose height is their own (pictures) or set inside them (formulas, drawings). */
const OWN_HEIGHT = /^(img|svg|video|canvas|iframe|object|embed)$/i

interface Sheet {
  /** The editor's root (the text flow). */
  content: HTMLElement
  /** The stack of A4 sheets the text flows over. */
  pages: HTMLElement
  /** The zoomed paper holding the sheets. */
  paper: HTMLElement
}

/** A sheet's place in the copy, in CSS px from the copy's top-left corner. */
interface PageWindow {
  left: number
  top: number
  width: number
  height: number
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
/** Resolves once the picture is decoded or has failed; never rejects. */
const settleImage = (image: HTMLImageElement) => image.decode().catch(() => undefined)

/** The editor's root element; null when it is not on the page (the view of an editor not mounted yet throws). */
function editorRoot(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null
  try {
    return editor.view.dom
  } catch {
    return null
  }
}

/** The sheets `editor` is shown on; a PdfError when the sheet does not show it (another mode, still loading). */
function sheetOf(editor: Editor): Sheet {
  const content = editorRoot(editor)
  const pages = content?.closest<HTMLElement>('.exam-doc-pages')
  const paper = pages?.closest<HTMLElement>('.exam-doc-paper')
  if (!content || !pages || !paper) throw new PdfError('Đề chưa hiện trên trang nên chưa tạo được PDF')
  return { content, pages, paper }
}

/** Formulas set, fonts in and pictures decoded: until then a block can still grow and the pages break again. */
async function contentReady(content: HTMLElement) {
  const until = Date.now() + MATH_WAIT_MS
  while (content.querySelector('[data-math-pending]') && Date.now() < until) await delay(50)
  await document.fonts.ready
  await Promise.all(Array.from(content.querySelectorAll('img'), settleImage))
}

/** The zoom the element is drawn at (CSS zoom on its ancestors). */
function shownZoom(element: HTMLElement) {
  const zoom = (element as { currentCSSZoom?: number }).currentCSSZoom
  if (typeof zoom === 'number' && zoom > 0) return zoom
  return element.offsetWidth > 0 ? element.getBoundingClientRect().width / element.offsetWidth : 1
}

/** The nearest ancestor that scrolls (the sheet's column). */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}

/** Resolves once the spacers and the number of sheets have stayed the same for a few frames (or after ~1.5 s). */
async function layoutSettled({ content, pages }: Sheet) {
  let previous = ''
  for (let frame = 0, steady = 0; frame < MAX_SETTLE_FRAMES && steady < STEADY_FRAMES; frame += 1) {
    await nextFrame()
    const gaps = Array.from(content.querySelectorAll<HTMLElement>(':scope > .exam-doc-page-gap'), (gap) => gap.style.height)
    const current = `${pages.querySelectorAll(':scope > .exam-doc-page').length}|${content.offsetHeight}|${gaps.join(',')}`
    steady = current === previous ? steady + 1 : 0
    previous = current
  }
}

/** The node a node selection marks on the screen (a formula, a picture, a block), if any. */
function selectedNode(editor: Editor): Element | null {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection)) return null
  const dom = editor.view.nodeDOM(selection.from)
  return dom instanceof Element ? dom : null
}

/**
 * The screen blocks of the answer key: the top-level nodes the key writer tags with `examKey`. The tag is not always on
 * the top-level element (a table's is on the table, inside its wrapper), so the nodes are asked for their blocks.
 */
function answerKeyBlocks(editor: Editor): Element[] {
  const blocks: Element[] = []
  editor.state.doc.forEach((node, pos) => {
    const dom = node.attrs.examKey ? editor.view.nodeDOM(pos) : null
    if (dom instanceof Element) blocks.push(dom)
  })
  return blocks
}

/** The element at the place in `copy` (a deep clone of `root`) that `element` has in `root`. */
function counterpart(root: Element, copy: Element, element: Element): HTMLElement | null {
  const path: number[] = []
  for (let node = element; node !== root; ) {
    const parent = node.parentElement
    if (!parent) return null
    path.push(Array.prototype.indexOf.call(parent.children, node))
    node = parent
  }
  let found: Element | undefined = copy
  for (const index of path.reverse()) found = found?.children[index]
  return found instanceof HTMLElement ? found : null
}

/**
 * A copy of the sheets as laid out at 100%. The editor breaks its pages at the zoom it is shown at, so the paper is
 * set to 100% for the few frames it takes the editor to break them again and to copy them, then set back, scroll and all.
 */
async function copyAtFullSize(editor: Editor, sheet: Sheet) {
  const { pages, paper } = sheet
  const zoom = shownZoom(pages)
  const scroller = scrollParent(paper)
  const scroll = scroller ? { top: scroller.scrollTop, left: scroller.scrollLeft } : null
  const shown = paper.style.zoom
  const full = String((Number.parseFloat(getComputedStyle(paper).zoom) || 1) / zoom)
  const resized = Math.abs(zoom - 1) > 0.001
  if (resized) paper.style.zoom = full
  try {
    repaginate(editor)
    await layoutSettled(sheet)
    const copy = pages.cloneNode(true) as HTMLElement
    const inCopy = (element: Element | null) => (element ? counterpart(pages, copy, element) : null)
    return {
      copy,
      selected: inCopy(selectedNode(editor)),
      keyBlocks: answerKeyBlocks(editor).map(inCopy).filter((block) => block !== null),
    }
  } finally {
    // Unless the sheet was given a new zoom meanwhile, which then stands.
    if (resized && paper.style.zoom === full) {
      paper.style.zoom = shown
      repaginate(editor)
      if (scroller && scroll) {
        scroller.scrollTop = scroll.top
        scroller.scrollLeft = scroll.left
      }
    }
  }
}

/**
 * Holds the copy off screen while it is captured: laid out (not hidden, which the capture would copy into every
 * element) and beside the paper, so that the copy inherits what the sheet inherits.
 */
function mountOffscreen(copy: HTMLElement, parent: HTMLElement) {
  const host = document.createElement('div')
  host.className = 'pointer-events-none fixed top-0 -left-[100000px] h-0 w-max overflow-hidden'
  host.setAttribute('aria-hidden', 'true')
  host.inert = true
  host.append(copy)
  parent.append(host)
  return host
}

/** A frame the size of a picture with its name, as the Word export writes "[name]" for a picture it cannot read. */
function missingPicture(width: number, height: number, alt: string) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const name = `[${alt.trim() || 'Hình'}]`.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="0.5" y="0.5" width="${Math.max(0, w - 1)}" height="${Math.max(0, h - 1)}" fill="#fff" stroke="#9ca3af" stroke-dasharray="4 3"/>` +
    `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="'Times New Roman', Times, serif" font-size="14" font-style="italic" fill="#4b5563">${name}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Pictures from a web address are read into the copy, since the capture can only draw what it holds. One that cannot
 * be read (a server that refuses cross-origin reads, a broken file) keeps its size and shows its name; returns how many.
 */
async function embedImages(copy: HTMLElement): Promise<number> {
  const linked = Array.from(copy.querySelectorAll('img')).filter((image) => {
    const src = image.getAttribute('src')
    return Boolean(src) && !src?.startsWith('data:')
  })
  const failed = await Promise.all(
    linked.map(async (image) => {
      const box = image.getBoundingClientRect()
      const src = image.currentSrc || image.src
      image.removeAttribute('srcset')
      try {
        image.src = await readAsDataUrl(src)
        await image.decode()
        return false
      } catch {
        image.style.width = `${box.width}px`
        image.style.height = `${box.height}px`
        image.src = missingPicture(box.width, box.height, image.alt)
        await settleImage(image)
        return true
      }
    })
  )
  return failed.filter(Boolean).length
}

/** Takes the editor's screen marks off the copy without moving anything, so that it reads as the printed page. */
function cleanCopy(copy: HTMLElement, selected: HTMLElement | null) {
  const content = copy.querySelector('.exam-doc-content')
  content?.setAttribute('contenteditable', 'false')
  content?.classList.remove('ProseMirror-focused')
  // Placed over the text (absolutely): taking them out moves nothing.
  copy.querySelectorAll('.ProseMirror-gapcursor, .column-resize-handle').forEach((element) => element.remove())
  // Selection marks, the empty sheet's placeholder and the AI's suggestion marks come from classes.
  for (const name of ['ProseMirror-selectednode', 'selectedCell', 'is-editor-empty', 'ai-suggest-old', 'ai-pending']) {
    copy.querySelectorAll(`.${name}`).forEach((element) => element.classList.remove(name))
  }
  if (selected) {
    selected.style.outline = 'none'
    selected.style.boxShadow = 'none'
  }
  // The "Ngắt trang" label, the words the AI is still writing and its suggestions keep their room: the pages were
  // broken with them.
  copy.querySelectorAll<HTMLElement>('.exam-doc-page-break, [data-live-draft], [data-ai-suggestion]').forEach((element) => {
    element.style.visibility = 'hidden'
  })
  // Plain paper, without the sheet's border and shadow.
  copy.querySelectorAll<HTMLElement>(':scope > .exam-doc-page').forEach((page) => {
    page.style.border = '0'
    page.style.boxShadow = 'none'
  })
}

/** Marks the blocks of the text whose height comes from their content (see FLOW); formulas and drawings keep theirs. */
function markFlowBlocks(copy: HTMLElement) {
  const content = copy.querySelector('.exam-doc-content')
  if (!content) return
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      (node as Element).classList.contains('katex') || (node as Element).localName === 'svg'
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node as HTMLElement
    if (element.style.height || OWN_HEIGHT.test(element.localName)) continue
    const { display } = getComputedStyle(element)
    if (display === 'block' || display === 'list-item') element.setAttribute(FLOW, '')
  }
}

/** In the capture's copy of a marked block, the height is left to its content. */
function freeFlowHeight(cloned: Node) {
  if (!(cloned instanceof HTMLElement) || !cloned.hasAttribute(FLOW)) return
  cloned.style.removeProperty('height')
  cloned.style.removeProperty('block-size')
  cloned.removeAttribute(FLOW)
}

function pageWindows(copy: HTMLElement): PageWindow[] {
  const origin = copy.getBoundingClientRect()
  return Array.from(copy.querySelectorAll(':scope > .exam-doc-page'), (page) => {
    const box = page.getBoundingClientRect()
    return { left: box.left - origin.left, top: box.top - origin.top, width: box.width, height: box.height }
  })
}

/** A block that prints something: text, a picture, a formula, a table or a rule (not an empty line or a spacer). */
function printsSomething(block: Element) {
  if (block.matches('.exam-doc-page-gap, .exam-doc-page-break, [data-live-draft]')) return false
  return Boolean(block.textContent?.trim()) || block.matches('img, hr, table') || block.querySelector('img, svg, hr, table') !== null
}

/**
 * The exam without its answer key (written after the end line): the sheets that hold only the key are left out, as is
 * any sheet after the exam's end. The key's blocks after the exam's last printed block are left out of the capture
 * (nothing after them is printed); any other key block is hidden where it stands, so nothing moves.
 */
function examPages(copy: HTMLElement, windows: PageWindow[], keyBlocks: HTMLElement[]) {
  const skipped = new Set<Element>()
  const content = copy.querySelector('.exam-doc-content')
  if (!content) return { windows, skipped }
  const keys = new Set<Element>(keyBlocks)
  const origin = copy.getBoundingClientRect().top
  const blocks = Array.from(content.children)
  const exam = new Set<number>()
  const key = new Set<number>()
  let lastExam = -1
  blocks.forEach((block, index) => {
    const isKey = keys.has(block)
    if (!isKey && !printsSomething(block)) return
    if (!isKey) lastExam = index
    const box = block.getBoundingClientRect()
    windows.forEach((page, at) => {
      if (box.bottom - origin > page.top && box.top - origin < page.top + page.height) (isKey ? key : exam).add(at)
    })
  })
  blocks.forEach((block, index) => {
    if (!keys.has(block)) return
    if (index > lastExam) skipped.add(block)
    else if (block instanceof HTMLElement) block.style.visibility = 'hidden'
  })
  const last = Math.max(0, ...exam)
  const kept = windows.filter((_, at) => at <= last && (exam.has(at) || !key.has(at)))
  return { windows: kept.length > 0 ? kept : windows.slice(0, 1), skipped }
}

/** The capture leaves out KaTeX's MathML copy of each formula (kept for screen readers, never drawn) and `skipped`. */
const leaveOut = (skipped: Set<Element>) => (node: Node) =>
  !(node instanceof Element && (node.classList.contains('katex-mathml') || skipped.has(node)))

/**
 * The copy's SVG as one picture, decoded once; each sheet is then drawn from it through its window (only that window is
 * drawn), so no canvas is ever taller than a sheet. Its size is rounded up to whole pixels, so a window in CSS px maps
 * onto it exactly. A data URL, not a blob URL: Chromium treats an SVG with HTML inside read from a blob URL as foreign
 * and would refuse to export the canvas.
 */
async function svgPicture(markup: string, width: number, height: number) {
  const w = Math.ceil(width)
  const h = Math.ceil(height)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${markup}</svg>`
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  return image
}

/** One sheet as JPEG: the picture seen through the sheet's window, drawn at SCALE. */
async function drawPage(picture: HTMLImageElement, page: PageWindow, canvas: HTMLCanvasElement, redraws: number) {
  const width = Math.round(page.width * SCALE)
  const height = Math.round(page.height * SCALE)
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No 2D canvas')
  for (let draw = 0; draw <= redraws; draw += 1) {
    if (draw) await delay(REDRAW_DELAY_MS)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(picture, page.left, page.top, page.width, page.height, 0, 0, width, height)
  }
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!jpeg) throw new Error('The page could not be encoded')
  return new Uint8Array(await jpeg.arrayBuffer())
}

const renderInBrowser: Renderer = async (editor, { title, examOnly }) => {
  // The libraries load while the sheet settles.
  const libraries = Promise.all([import('modern-screenshot'), import('jspdf')])
  libraries.catch(() => undefined)
  const sheet = sheetOf(editor)
  await contentReady(sheet.content)
  const { copy, selected, keyBlocks } = await copyAtFullSize(editor, sheet)
  const host = mountOffscreen(copy, sheet.paper.parentElement ?? document.body)
  try {
    await Promise.all(Array.from(copy.querySelectorAll('img'), settleImage))
    const missingImages = await embedImages(copy)
    cleanCopy(copy, selected)
    markFlowBlocks(copy)
    const sheets = pageWindows(copy)
    const { windows, skipped } = examOnly ? examPages(copy, sheets, keyBlocks) : { windows: sheets, skipped: new Set<Element>() }
    const [{ domToForeignObjectSvg }, { jsPDF }] = await libraries
    // Web fonts (KaTeX's) are embedded in every format they come in: the library's `preferredFormat` filter drops the
    // source of every other font face, and formulas would then be set in a fallback font.
    const svg = await domToForeignObjectSvg(copy, {
      backgroundColor: '#fff',
      filter: leaveOut(skipped),
      onCloneEachNode: freeFlowHeight,
    })
    const box = copy.getBoundingClientRect()
    const picture = await svgPicture(new XMLSerializer().serializeToString(svg).replace(NOT_XML, ''), box.width, box.height)
    const redraws = LATE_PICTURES && copy.querySelector('img') ? REDRAWS : 0
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true, putOnlyUsedFonts: true })
    pdf.setProperties({ title, creator: 'Hocluc' })
    const canvas = document.createElement('canvas')
    for (const [index, page] of windows.entries()) {
      const jpeg = await drawPage(picture, page, canvas, redraws)
      if (index > 0) pdf.addPage('a4', 'portrait')
      pdf.addImage(jpeg, 'JPEG', 0, 0, A4_MM.width, A4_MM.height)
    }
    return { blob: pdf.output('blob'), pages: windows.length, missingImages }
  } finally {
    host.remove()
  }
}

/**
 * The server's PDF of the document (the editor's HTML, without the answer key for `examOnly`), or null when the
 * server did not make one.
 */
async function renderOnServer(editor: Editor, { title, examOnly }: RenderOptions) {
  const { html, missingImages } = await buildServerPdfHtml(editor, { examOnly })
  const pdf = await requestExamPdf({ html, title })
  return pdf ? { ...pdf, missingImages } : null
}

/** The server's PDF; the browser's when the server cannot make it (not deployed yet, an error, slow, signed out). */
const renderBest: Renderer = async (editor, options) => {
  const printed = await renderOnServer(editor, options).catch(() => null)
  return printed ?? renderInBrowser(editor, options)
}

const RENDERERS: Record<PdfRender, Renderer> = {
  client: renderInBrowser,
  auto: renderBest,
}

/**
 * Downloads what the sheet of `editor` shows as an A4 PDF named after the title: "…-Ma-<code>.pdf" for a variant,
 * "…-khong-dap-an.pdf" for the exam without its answer key.
 */
export async function exportPdf(
  editor: Editor,
  { code = null, examOnly = false, render = 'auto' }: PdfOptions = {}
): Promise<PdfResult> {
  const doc = editor.getJSON()
  const { blob, ...result } = await RENDERERS[render](editor, { title: documentTitle(doc) ?? 'Đề thi', examOnly })
  const fileName = fileNameFor(doc, 'pdf', code)
  downloadBlob(blob, examOnly ? fileName.replace(/\.pdf$/, '-khong-dap-an.pdf') : fileName)
  return result
}
