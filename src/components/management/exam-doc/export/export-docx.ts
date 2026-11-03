import type { Editor, JSONContent } from '@tiptap/core'
import { normalizeLinkHref } from '../link-url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type IParagraphOptions,
  type IRunOptions,
  type ParagraphChild,
} from 'docx'
import { chartPicture, normalizeChart } from '../chart-data'
import { readIndents } from '../indents'
import { CHOICE_LABELS } from '../nodes/choice-grid'
import { loadImage, shownSize, type LoadedImage } from './docx-images'
import { formulaRun, type FormulaReport } from './docx-math'
import { documentTitle, downloadBlob, fileNameFor } from './file-name'

/* The sheet as exam-doc.css prints it: A4, margins 2 / 1.5 / 2 / 2 cm, Times New Roman 11.5pt, line height 1.5. */
const PAGE = { width: 11906, height: 16838, top: 1134, right: 850, bottom: 1134, left: 1134 }
const TEXT_WIDTH = PAGE.width - PAGE.left - PAGE.right
const TWIPS_PER_PX = 15
/** One list level, Word's 1.27 cm. */
const INDENT_STEP = 720
const TWIPS_PER_CM = 567
const FONT = 'Times New Roman'
const BASE_SIZE = 23
const SHEET_LINE_HEIGHT = 1.5
/** The 12px between options and between the header columns. */
const COLUMN_GAP = 180
const MAX_LIST_LEVEL = 8
const BULLET = 'hl-bullet'
const BULLET_SIGNS = ['•', '◦', '▪']

/** Word's single line for Times New Roman is 1.15 em, so a CSS line height n is n / 1.15 Word lines. */
const lineTwips = (lineHeight: number) => Math.round((240 * lineHeight) / 1.15)
/** A CSS length in em of text at `sizePt`, in twips. */
const em = (value: number, sizePt = 11.5) => Math.round(value * sizePt * 20)

const ALIGNMENTS: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
}

const HEADINGS = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 } as const

const LINE = { style: BorderStyle.SINGLE, size: 6, color: '111111' } as const
const TABLE_LINES = {
  top: LINE,
  bottom: LINE,
  left: LINE,
  right: LINE,
  insideHorizontal: LINE,
  insideVertical: LINE,
}

type Block = Paragraph | Table
type ParagraphFormat = Omit<IParagraphOptions, 'children' | 'text'>

/** Where blocks are written. */
interface Place {
  /** Room for pictures and tables, in twips. */
  width: number
  /** List level of the item the blocks belong to; -1 outside lists. */
  level: number
  /** Header cells: their text is bold. */
  bold?: boolean
  /** Line spacing of the place (the exam header is tighter than the sheet). */
  lineHeight?: number
}

export interface DocxResult {
  blob: Blob
  fileName: string
  formulas: FormulaReport
  /** Pictures that could not be read (written as their name instead). */
  missingImages: number
}

/* ---------- Formatting ---------- */

function hexColor(value: unknown): string | undefined {
  const text = String(value ?? '').trim()
  let match = /^#([0-9a-f]{3})$/i.exec(text)
  if (match) return Array.from(match[1], (digit) => digit + digit).join('').toUpperCase()
  match = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(text)
  if (match) return match[1].toUpperCase()
  match = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(text)
  if (match) {
    return match
      .slice(1, 4)
      .map((part) => Math.min(255, Number(part)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return undefined
}

/** '15px' or '11.5pt' in Word's half-points. */
function halfPoints(value: unknown): number | undefined {
  const match = /^(\d+(?:\.\d+)?)\s*(px|pt)?$/i.exec(String(value ?? '').trim())
  if (!match || !(Number(match[1]) > 0)) return undefined
  const points = match[2]?.toLowerCase() === 'pt' ? Number(match[1]) : Number(match[1]) * 0.75
  return Math.round(points * 2)
}

function fontName(value: unknown): string | undefined {
  const name = String(value ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '')
  return name || undefined
}

/** A link's address as the editor would allow it today; an unsafe stored one (e.g. `javascript:`) becomes plain text. */
function linkOf(node: JSONContent): string | null {
  const href = node.marks?.find((mark) => mark.type === 'link')?.attrs?.href
  return typeof href === 'string' && href ? normalizeLinkHref(href) : null
}

function runFormat(marks: JSONContent['marks'] = [], bold: boolean | undefined, linked: boolean): IRunOptions {
  const has = (type: string) => marks.some((mark) => mark.type === type)
  const style = marks.find((mark) => mark.type === 'textStyle')?.attrs ?? {}
  const color = hexColor(style.color) ?? (linked ? '1D4ED8' : undefined)
  const fill = hexColor(style.backgroundColor)
  const size = halfPoints(style.fontSize)
  const font = fontName(style.fontFamily)
  return {
    ...(bold || has('bold') ? { bold: true } : {}),
    ...(has('italic') ? { italics: true } : {}),
    ...(has('underline') || linked ? { underline: { type: UnderlineType.SINGLE } } : {}),
    ...(has('strike') ? { strike: true } : {}),
    ...(has('subscript') ? { subScript: true } : {}),
    ...(has('superscript') ? { superScript: true } : {}),
    ...(color ? { color } : {}),
    ...(fill ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill } } : {}),
    ...(size ? { size } : {}),
    ...(font ? { font } : {}),
    ...(has('boxed') ? { border: { style: BorderStyle.SINGLE, size: 4, color: 'auto', space: 1 } } : {}),
  }
}

/** The paragraph's indents (cm on the sheet) as Word's `w:ind`, in twips; a negative first line is a hanging indent. */
function paragraphIndent(attrs: Record<string, unknown>): ParagraphFormat {
  const { left, right, firstLine } = readIndents(attrs)
  if (!left && !right && !firstLine) return {}
  const twips = (cm: number) => Math.round(cm * TWIPS_PER_CM)
  return {
    indent: {
      ...(left ? { left: twips(left) } : {}),
      ...(right ? { right: twips(right) } : {}),
      ...(firstLine > 0 ? { firstLine: twips(firstLine) } : firstLine < 0 ? { hanging: twips(-firstLine) } : {}),
    },
  }
}

function paragraphFormat(node: JSONContent, place: Place): ParagraphFormat {
  const attrs = node.attrs ?? {}
  const lineHeight = Number(attrs.lineSpacing) || place.lineHeight
  return {
    alignment: ALIGNMENTS[String(attrs.textAlign)] ?? AlignmentType.JUSTIFIED,
    ...paragraphIndent(attrs),
    ...(lineHeight ? { spacing: { line: lineTwips(lineHeight), lineRule: LineRuleType.AUTO } } : {}),
  }
}

/** An empty line exactly `twips` high: space under the exam header, and between two tables Word would join. */
function spacer(twips: number): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: 0, line: twips, lineRule: LineRuleType.EXACT }, run: { size: 2 } })
}

function equalWidths(count: number, total: number): number[] {
  const width = Math.floor(total / count)
  return Array.from({ length: count }, (_, index) => (index === count - 1 ? total - width * (count - 1) : width))
}

function scaledWidths(widths: number[], total: number): number[] {
  const sum = widths.reduce((a, b) => a + b, 0)
  const scaled = widths.map((width) => Math.max(1, Math.floor((width / sum) * total)))
  scaled[scaled.length - 1] += total - scaled.reduce((a, b) => a + b, 0)
  return scaled
}

/** Options per row of a grid that does not say: the editor's guess from the longest option. */
function estimateColumns(cells: JSONContent[]): 1 | 2 | 4 {
  let longest = 0
  for (const cell of cells) {
    let length = 0
    for (const child of cell.content ?? []) {
      if (child.type === 'text') length += child.text?.length ?? 0
      else if (child.type === 'math') length += Math.ceil(String(child.attrs?.latex ?? '').length / 2) + 2
    }
    longest = Math.max(longest, length)
  }
  return longest <= 18 ? 4 : longest <= 40 ? 2 : 1
}

function fixedColumns(value: unknown): 1 | 2 | 4 | null {
  const columns = Number(value)
  return columns === 1 || columns === 2 || columns === 4 ? columns : null
}

/* ---------- Writer ---------- */

class DocxWriter {
  readonly formulas: FormulaReport = { equations: 0, pictures: 0, texts: 0 }
  missingImages = 0
  readonly orderedStarts = new Set<number>([1])
  private instance = 0
  private readonly images = new Map<string, Promise<LoadedImage | null>>()
  /** Options per row of each 'auto' grid as the sheet shows it, in document order. */
  private readonly shownColumns: number[]

  constructor(shownColumns: number[]) {
    this.shownColumns = [...shownColumns]
  }

  async blocks(nodes: JSONContent[] = [], place: Place): Promise<Block[]> {
    const out: Block[] = []
    for (const node of nodes) {
      const blocks = await this.block(node, place)
      // Two tables that touch become one in Word.
      if (blocks[0] instanceof Table && out[out.length - 1] instanceof Table) out.push(spacer(em(0.5)))
      out.push(...blocks)
    }
    return out
  }

  private async block(node: JSONContent, place: Place): Promise<Block[]> {
    switch (node.type) {
      case 'paragraph':
        // "Tiêu đề" is Word's Title style; "Phụ đề" stays a plain paragraph, Word has no matching heading
        return [await this.paragraph(node, place, node.attrs?.paragraphStyle === 'title' ? { heading: HeadingLevel.TITLE } : {})]
      case 'heading':
        return [await this.paragraph(node, place, { heading: HEADINGS[node.attrs?.level as 1 | 2 | 3 | 4] ?? HeadingLevel.HEADING_3 })]
      case 'bulletList':
        return this.list(node, place, false)
      case 'orderedList':
        return this.list(node, place, true)
      case 'table':
        return [await this.table(node, place)]
      case 'image':
        return [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: em(0.4), after: em(0.4) },
            children: [await this.image(node, place)],
          }),
        ]
      case 'chart': {
        // The chart's drawing as a picture, as wide a share of the place as on the sheet.
        const picture = chartPicture(normalizeChart(node.attrs), place.width / TWIPS_PER_PX)
        return [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: em(0.4), after: em(0.4) },
            children: [await this.image({ type: 'image', attrs: picture }, place)],
          }),
        ]
      }
      case 'pageBreak':
        return [new Paragraph({ children: [new PageBreak()] })]
      case 'horizontalRule':
        return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto', space: 1 } } })]
      case 'choiceGrid':
        return [await this.choiceGrid(node, place)]
      case 'examHeader':
        return [await this.examHeader(node, place), spacer(em(0.6))]
      default:
        // A block this writer does not know: its content, so no text is lost.
        return this.blocks(node.content, place)
    }
  }

  private async paragraph(node: JSONContent, place: Place, extra: ParagraphFormat = {}): Promise<Paragraph> {
    const content = node.content ?? []
    const children = await this.inline(content, place.bold)
    // A display formula alone on its line is centred, as on the sheet.
    const displayOnly = content.length === 1 && content[0].type === 'math' && content[0].attrs?.display
    return new Paragraph({
      ...paragraphFormat(node, place),
      ...(displayOnly ? { alignment: AlignmentType.CENTER } : {}),
      ...extra,
      children,
    })
  }

  private async inline(nodes: JSONContent[], bold?: boolean): Promise<ParagraphChild[]> {
    const children: ParagraphChild[] = []
    let link: { href: string; runs: ParagraphChild[] } | null = null
    for (const node of nodes) {
      const href = linkOf(node)
      if (link && link.href !== href) {
        children.push(new ExternalHyperlink({ link: link.href, children: link.runs }))
        link = null
      }
      const run = await this.inlineNode(node, bold, href !== null)
      if (!run) continue
      if (href) {
        link ??= { href, runs: [] }
        link.runs.push(run)
      } else {
        children.push(run)
      }
    }
    if (link) children.push(new ExternalHyperlink({ link: link.href, children: link.runs }))
    return children
  }

  private async inlineNode(node: JSONContent, bold: boolean | undefined, linked: boolean): Promise<ParagraphChild | null> {
    switch (node.type) {
      case 'text':
        return new TextRun({ text: node.text ?? '', ...runFormat(node.marks, bold, linked) })
      case 'hardBreak':
        return new TextRun({ break: 1 })
      case 'math':
        return formulaRun(String(node.attrs?.latex ?? ''), Boolean(node.attrs?.display), this.formulas)
      case 'image':
        return this.image(node, { width: TEXT_WIDTH, level: -1 })
      default:
        return null
    }
  }

  private async image(node: JSONContent, place: Place): Promise<ParagraphChild> {
    const src = String(node.attrs?.src ?? '')
    const alt = String(node.attrs?.alt ?? '').trim()
    let loading = this.images.get(src)
    if (!loading) {
      loading = src ? loadImage(src) : Promise.resolve(null)
      this.images.set(src, loading)
    }
    const image = await loading
    if (!image) {
      this.missingImages += 1
      return new TextRun({ text: `[${alt || 'Hình'}]`, italics: true })
    }
    return new ImageRun({
      type: image.type,
      data: image.data,
      transformation: shownSize(image, node.attrs, place.width / TWIPS_PER_PX),
      ...(alt ? { altText: { name: alt, description: alt, title: alt } } : {}),
    })
  }

  private orderedReference(start: number): string {
    this.orderedStarts.add(start)
    return `hl-ordered-${start}`
  }

  /** Each list is its own numbering instance, so every question's list starts again at 1 (or its start). */
  private async list(node: JSONContent, place: Place, ordered: boolean): Promise<Block[]> {
    const level = Math.min(MAX_LIST_LEVEL, place.level + 1)
    const start = Math.max(1, Math.round(Number(node.attrs?.start) || 1))
    const reference = ordered ? this.orderedReference(start) : BULLET
    const instance = (this.instance += 1)
    const inner: Place = { ...place, level, width: Math.max(INDENT_STEP, place.width - INDENT_STEP) }
    const items = node.content ?? []
    const out: Block[] = []
    for (const [index, item] of items.entries()) {
      let numbered = false
      const children = item.content ?? []
      for (const [childIndex, child] of children.entries()) {
        if (child.type !== 'paragraph' && child.type !== 'heading') {
          out.push(...(await this.block(child, inner)))
          continue
        }
        const edge = place.level < 0 && !numbered
        const spacing = {
          ...(edge && index === 0 ? { before: em(0.25) } : {}),
          ...(edge && index === items.length - 1 && childIndex === children.length - 1 ? { after: em(0.25) } : {}),
        }
        const format = paragraphFormat(child, inner)
        out.push(
          await this.paragraph(child, inner, {
            ...(numbered
              ? { indent: { left: (level + 1) * INDENT_STEP } }
              : { numbering: { reference, level, instance } }),
            ...(Object.keys(spacing).length ? { spacing: { ...format.spacing, ...spacing } } : {}),
          })
        )
        numbered = true
      }
    }
    return out
  }

  private async table(node: JSONContent, place: Place): Promise<Table> {
    const rows = (node.content ?? []).filter((row) => row.type === 'tableRow')
    const widths: number[] = []
    for (const cell of rows[0]?.content ?? []) {
      const span = Math.max(1, Number(cell.attrs?.colspan) || 1)
      const set: unknown[] = Array.isArray(cell.attrs?.colwidth) ? cell.attrs.colwidth : []
      for (let index = 0; index < span; index += 1) widths.push(Number(set[index]) > 0 ? Number(set[index]) : 0)
    }
    const count = Math.max(1, widths.length)
    const columns = widths.length && widths.every((width) => width > 0) ? scaledWidths(widths, place.width) : equalWidths(count, place.width)
    // Columns still covered by a cell from a row above (rowspan), counted down row by row.
    const covered = new Array<number>(count).fill(0)
    const tableRows: TableRow[] = []
    for (const [rowIndex, row] of rows.entries()) {
      const cells: TableCell[] = []
      let column = 0
      for (const cell of row.content ?? []) {
        while (column < count && covered[column] > 0) column += 1
        const colspan = Math.max(1, Number(cell.attrs?.colspan) || 1)
        const rowspan = Math.max(1, Number(cell.attrs?.rowspan) || 1)
        const width = columns.slice(column, column + colspan).reduce((a, b) => a + b, 0) || columns[columns.length - 1]
        for (let index = column; index < Math.min(count, column + colspan); index += 1) covered[index] = rowspan
        column += colspan
        const inner: Place = { width: Math.max(INDENT_STEP, width - 180), level: -1, bold: cell.type === 'tableHeader' }
        const blocks = await this.blocks(cell.content, inner)
        if (!(blocks[blocks.length - 1] instanceof Paragraph)) blocks.push(new Paragraph({}))
        cells.push(
          new TableCell({
            children: blocks,
            width: { size: width, type: WidthType.DXA },
            margins: { top: 30, bottom: 30, left: 90, right: 90 },
            ...(colspan > 1 ? { columnSpan: colspan } : {}),
            ...(rowspan > 1 ? { rowSpan: rowspan } : {}),
          })
        )
      }
      for (let index = 0; index < count; index += 1) covered[index] = Math.max(0, covered[index] - 1)
      const header = rowIndex === 0 && (row.content ?? []).every((cell) => cell.type === 'tableHeader')
      tableRows.push(new TableRow({ children: cells, ...(header ? { tableHeader: true } : {}) }))
    }
    return new Table({
      rows: tableRows,
      columnWidths: columns,
      width: { size: place.width, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: TABLE_LINES,
    })
  }

  /** Options A, B, C… as a borderless table, as many per row as the sheet shows, each starting with its bold letter. */
  private async choiceGrid(node: JSONContent, place: Place): Promise<Table> {
    const cells = (node.content ?? []).filter((cell) => cell.type === 'choiceCell')
    const shown = fixedColumns(this.shownColumns.shift())
    const perRow = fixedColumns(node.attrs?.columns) ?? shown ?? estimateColumns(cells)
    const widths = equalWidths(perRow, place.width)
    const rows: TableRow[] = []
    for (let first = 0; first < cells.length; first += perRow) {
      const row: TableCell[] = []
      for (let column = 0; column < perRow; column += 1) {
        const index = first + column
        const cell = cells[index]
        const children = cell
          ? [
              new TextRun({ text: `${String(cell.attrs?.label ?? CHOICE_LABELS[index] ?? index + 1)}.`, bold: true }),
              new TextRun({ text: ' ' }),
              ...(await this.inline(cell.content ?? [], place.bold)),
            ]
          : []
        row.push(
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children })],
            width: { size: widths[column], type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: column < perRow - 1 ? COLUMN_GAP : 0 },
          })
        )
      }
      rows.push(new TableRow({ children: row }))
    }
    return new Table({
      rows,
      columnWidths: widths,
      width: { size: place.width, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
    })
  }

  /** The exam header: a borderless two-column table, the left column (school) 2/5 wide, the right (exam) 3/5. */
  private async examHeader(node: JSONContent, place: Place): Promise<Table> {
    const columns = (node.content ?? []).filter((column) => column.type === 'headerColumn')
    const left = Math.round((place.width * 2) / 5)
    const widths = [left, place.width - left]
    const cells: TableCell[] = []
    for (const [index, width] of widths.entries()) {
      const inner: Place = { width: width - COLUMN_GAP / 2, level: -1, lineHeight: 1.35 }
      const blocks = await this.blocks(columns[index]?.content, inner)
      cells.push(
        new TableCell({
          children: blocks.length ? blocks : [new Paragraph({})],
          width: { size: width, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: index ? COLUMN_GAP / 2 : 0, right: index ? 0 : COLUMN_GAP / 2 },
        })
      )
    }
    return new Table({
      rows: [new TableRow({ children: cells })],
      columnWidths: widths,
      width: { size: place.width, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
    })
  }
}

function listLevels(ordered: boolean, start = 1) {
  return Array.from({ length: MAX_LIST_LEVEL + 1 }, (_, level) => ({
    level,
    format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
    text: ordered ? `%${level + 1}.` : BULLET_SIGNS[level % BULLET_SIGNS.length],
    alignment: AlignmentType.LEFT,
    ...(ordered ? { start: level === 0 ? start : 1 } : {}),
    style: { paragraph: { indent: { left: INDENT_STEP * (level + 1), hanging: 360 } } },
  }))
}

interface BuildOptions {
  /** Options per row of each 'auto' choice grid as the sheet shows it, in document order. */
  shownColumns?: number[]
  /** Code of the exam variant (mã đề), for the file name. */
  code?: string | null
}

/** The document as a Word file laid out like the printed sheet. */
export async function buildDocx(doc: JSONContent, { shownColumns = [], code = null }: BuildOptions = {}): Promise<DocxResult> {
  const writer = new DocxWriter(shownColumns)
  const children = await writer.blocks(doc.content, { width: TEXT_WIDTH, level: -1 })
  const heading = (sizePt: number, before: number, after: number) => ({
    run: { font: FONT, size: Math.round(sizePt * 2), bold: true, italics: false, color: '000000' },
    paragraph: { spacing: { before, after }, keepNext: true, keepLines: true },
  })
  const document = new Document({
    creator: 'Hocluc',
    title: documentTitle(doc) ?? 'Đề thi',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BASE_SIZE },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 0, line: lineTwips(SHEET_LINE_HEIGHT), lineRule: LineRuleType.AUTO },
          },
        },
        heading1: heading(15, 0, em(0.25, 15)),
        heading2: heading(12.5, em(0.8, 12.5), em(0.3, 12.5)),
        heading3: heading(11.5, em(0.6), em(0.25)),
      },
    },
    numbering: {
      config: [
        { reference: BULLET, levels: listLevels(false) },
        ...[...writer.orderedStarts].map((start) => ({ reference: `hl-ordered-${start}`, levels: listLevels(true, start) })),
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.top, right: PAGE.right, bottom: PAGE.bottom, left: PAGE.left },
          },
        },
        children,
      },
    ],
  })
  return {
    blob: await Packer.toBlob(document),
    fileName: fileNameFor(doc, 'docx', code),
    formulas: writer.formulas,
    missingImages: writer.missingImages,
  }
}

/** Options per row of every choice grid, as the sheet lays them out now (0 where it could not be read). */
function shownChoiceColumns(editor: Editor): number[] {
  const columns: number[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'choiceGrid') return true
    const dom = editor.view.nodeDOM(pos)
    columns.push(dom instanceof HTMLElement ? Number(dom.getAttribute('data-columns')) || 0 : 0)
    return false
  })
  return columns
}

/** Downloads the editor's document (the original, or the variant `code` being viewed) as a .docx named after its title. */
export async function exportDocx(editor: Editor, code: string | null = null): Promise<DocxResult> {
  const result = await buildDocx(editor.getJSON(), { shownColumns: shownChoiceColumns(editor), code })
  downloadBlob(result.blob, result.fileName)
  return result
}
