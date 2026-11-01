import { ImageRun, Math as DocxMath, TextRun, type ParagraphChild } from 'docx'
import { latexToMath } from 'docx/math'
import { loadKatex, type Katex } from './katex-loader'

/** How the formulas of one export were written: Word equations, pictures, or their LaTeX as text. */
export interface FormulaReport {
  equations: number
  pictures: number
  texts: number
}

/** Commands Word's converter does not know, written as ones it does. */
const SUBSTITUTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\\vartriangle(?![a-zA-Z])/g, '\\triangle'],
  [/\\lt(?![a-zA-Z])/g, '<'],
  [/\\gt(?![a-zA-Z])/g, '>'],
  [/\\(?:kern|mkern|hskip|mskip)\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s*(?:em|ex|mu|pt|px|cm|mm|in)/g, '\\,'],
]

const CHEMISTRY = /\\(?:ce|pu)\s*\{/g
const HAS_CHEMISTRY = /\\(?:ce|pu)\s*\{/

/** Index just after the `}` closing the `{` at `open`, or -1. */
function closingBrace(latex: string, open: number): number {
  let depth = 0
  for (let index = open; index < latex.length; index += 1) {
    const char = latex[index]
    if (char === '\\') index += 1
    else if (char === '{') depth += 1
    else if (char === '}' && --depth === 0) return index + 1
  }
  return -1
}

/** Token texts back to TeX, a space kept between a control word and a letter after it. */
function joinTokens(texts: string[]): string {
  let tex = ''
  for (const text of texts) {
    if (/\\[a-zA-Z]+$/.test(tex) && /^[a-zA-Z]/.test(text)) tex += ' '
    tex += text
  }
  return tex
}

interface MacroContext {
  consumeArgs: (count: number) => Array<Array<{ text: string }>>
}

/**
 * mhchem's TeX for one `\ce{…}`: KaTeX expands the command once into a macro that keeps its argument. The phantoms
 * mhchem adds to line up indices are dropped, so "H_2O" stays a plain subscript in Word.
 */
function expandChemistry(engine: Katex, command: string): string | null {
  const captured: { tex: string | null } = { tex: null }
  try {
    engine.renderToString(`\\expandafter\\hlcapture\\expandafter{${command}}`, {
      throwOnError: false,
      macros: {
        '\\hlcapture': (context: MacroContext) => {
          captured.tex = joinTokens(context.consumeArgs(1)[0].slice().reverse().map((token) => token.text))
          return ''
        },
      },
    })
  } catch {
    return null
  }
  return captured.tex?.replace(/\{\\vphantom\{X\}\}/g, '').replace(/\\smash\[[tb]\]/g, '') ?? null
}

function expandAllChemistry(engine: Katex, latex: string): string {
  const spans: Array<{ start: number; end: number }> = []
  for (const match of latex.matchAll(CHEMISTRY)) {
    const end = closingBrace(latex, match.index + match[0].length - 1)
    if (end > 0) spans.push({ start: match.index, end })
  }
  let result = latex
  for (const { start, end } of spans.reverse()) {
    const expanded = expandChemistry(engine, result.slice(start, end))
    if (expanded !== null) result = result.slice(0, start) + `{${expanded}}` + result.slice(end)
  }
  return result
}

/** The same box style on the page (to measure) and in the SVG (to draw), so both lay the formula out alike. */
const PICTURE_STYLE = "display:inline-block;padding:2px;color:#000;background:#fff;font-family:'Times New Roman',serif;font-size:11.5pt;line-height:normal"

/**
 * The formula set by the browser's own MathML (KaTeX's MathML output, which needs no web fonts, without KaTeX's
 * stylesheet, which the SVG cannot load), measured on the page and rasterised at 3x through an SVG foreignObject.
 */
async function formulaPicture(engine: Katex, latex: string, display: boolean): Promise<ImageRun | null> {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;${PICTURE_STYLE}`
  host.innerHTML = engine.renderToString(latex, { output: 'mathml', displayMode: display, throwOnError: false, strict: 'ignore' })
  document.body.append(host)
  try {
    const math = host.querySelector('math')
    if (!math) return null
    host.replaceChildren(math)
    const box = host.getBoundingClientRect()
    const width = Math.max(1, Math.ceil(box.width))
    const height = Math.max(1, Math.ceil(box.height))
    const markup = new XMLSerializer().serializeToString(math)
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="${PICTURE_STYLE}">${markup}</div>` +
      '</foreignObject></svg>'
    const image = new Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    await image.decode()
    const scale = 3
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.scale(scale, scale)
    context.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return null
    // The LaTeX goes in the picture's description, where "Mở file" finds it to make the formula again.
    const source = display ? `$$${latex}$$` : `$${latex}$`
    return new ImageRun({
      type: 'png',
      data: new Uint8Array(await blob.arrayBuffer()),
      transformation: { width, height },
      altText: { name: 'Công thức', description: source, title: source },
    })
  } catch {
    return null
  } finally {
    host.remove()
  }
}

/**
 * A formula for Word: an equation Word edits as its own (docx's LaTeX converter, `\ce{…}` expanded by mhchem
 * first); a picture of the KaTeX rendering when the converter refuses the LaTeX; its LaTeX as text as a last resort.
 */
export async function formulaRun(latex: string, display: boolean, report: FormulaReport): Promise<ParagraphChild> {
  let tex = SUBSTITUTIONS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), latex.trim())
  if (HAS_CHEMISTRY.test(tex)) tex = expandAllChemistry(await loadKatex(), tex)
  try {
    const children = latexToMath(tex)
    report.equations += 1
    return new DocxMath({ children })
  } catch {
    // Not a command Word's converter knows: a picture of the formula instead.
  }
  const picture = await formulaPicture(await loadKatex(), latex, display).catch(() => null)
  if (picture) {
    report.pictures += 1
    return picture
  }
  report.texts += 1
  return new TextRun({ text: display ? `$$${latex}$$` : `$${latex}$`, font: 'Cambria Math' })
}
