/*
 * What every drawing of a chart on the exam sheet shares: the sheet's serif, the inks, the palettes and SVG text.
 * The drawings carry no ids (no <defs>, markers or clip paths): the PDF export puts them all in one HTML document.
 */

export const FONT = `'Times New Roman', Times, serif`
export const INK = '#1f2328'
export const GRID = '#d0d4da'
/** Guide lines (asymptotes, a point's coordinates): darker than the grid, lighter than the drawing. */
export const GUIDE = '#6b7280'

export type ChartPalette = 'print' | 'color'

export const PALETTES: Record<ChartPalette, readonly string[]> = {
  // Greys far enough apart to tell in black and white: dark, light, middle, lightest.
  print: ['#262626', '#8c8c8c', '#4d4d4d', '#c4c4c4'],
  // Hues in a fixed order whose neighbours stay apart for colour-blind readers too.
  color: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
}

export const colorAt = (colors: readonly string[], index: number) => colors[index % colors.length]

export const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const text = (x: number, y: number, value: string, attrs = '') =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${attrs}>${escape(value)}</text>`

export const line = (x1: number, y1: number, x2: number, y2: number, stroke = INK, width = 1, attrs = '') =>
  `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${width}"${attrs ? ` ${attrs}` : ''}/>`

/** A filled arrowhead with its tip at (x, y), pointing from (fromX, fromY). */
export function arrowHead(x: number, y: number, fromX: number, fromY: number, color = INK) {
  const length = Math.hypot(x - fromX, y - fromY) || 1
  const [dx, dy] = [(x - fromX) / length, (y - fromY) / length]
  const [baseX, baseY] = [x - dx * 7, y - dy * 7]
  const [nx, ny] = [-dy * 3.2, dx * 3.2]
  return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${(baseX + nx).toFixed(1)} ${(baseY + ny).toFixed(1)}L${(baseX - nx).toFixed(1)} ${(baseY - ny).toFixed(1)}Z" fill="${color}"/>`
}

/** Numbers as a Vietnamese reader writes them: comma decimals, at most two places. */
export function formatNumber(value: number) {
  const rounded = Math.round(value * 100) / 100
  return String(rounded).replace('.', ',')
}

/** A tick value as an axis prints it: like {@link formatNumber}, with more places when the step is finer. */
export function formatTick(value: number, step: number) {
  if (step >= 0.01) return formatNumber(value)
  const places = Math.min(8, Math.max(0, -Math.floor(Math.log10(step))))
  return value.toFixed(places).replace('.', ',')
}

/** A round step for about `count` gridlines over `span`. */
export function niceStep(span: number, count: number) {
  const raw = span / count || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
}
