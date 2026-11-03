/**
 * Paragraph indents in centimetres, as Word keeps them: left and right from the text margins, and the first line
 * from the left indent (negative for a hanging indent).
 *
 * Documents written before indents were free carry `indent: n` (or `data-indent="n"`), n whole steps of 1.27 cm.
 * That attribute is still read; every write sets the cm attributes and puts it back to 0.
 */
export interface Indents {
  left: number
  right: number
  firstLine: number
}

/** One indent step, as in Word: 1.27 cm. The indent buttons and Tab go up to 8 steps. */
export const INDENT_STEP_CM = 1.27
export const MAX_INDENT_STEPS = 8
/** Width of the sheet's text, A4 less the 2 cm and 1.5 cm side margins. */
export const TEXT_WIDTH_CM = 17.5
/** The least width indents leave for the text. */
export const MIN_TEXT_WIDTH_CM = 3

export const NO_INDENTS: Indents = { left: 0, right: 0, firstLine: 0 }

const round = (cm: number) => Math.round(cm * 100) / 100

const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** Whole steps of the old `indent` attribute, in 0..8. */
export const legacySteps = (value: unknown) => Math.min(MAX_INDENT_STEPS, Math.max(0, Math.trunc(finite(value) ?? 0)))

/** Keeps indents inside the text width: left and right ≥ 0, at least 3 cm of text, the first line inside it too. */
export function clampIndents({ left, right, firstLine }: Indents, width = TEXT_WIDTH_CM): Indents {
  const room = Math.max(0, width - MIN_TEXT_WIDTH_CM)
  const nextRight = round(Math.min(room, Math.max(0, right)))
  const nextLeft = round(Math.min(room - nextRight, Math.max(0, left)))
  const nextFirst = round(Math.min(room - nextRight - nextLeft, Math.max(-nextLeft, firstLine)))
  return { left: nextLeft, right: nextRight, firstLine: nextFirst || 0 }
}

/** The indents of a paragraph or heading, from its attributes (the old step count when no cm value was written). */
export function readIndents(attrs: Record<string, unknown> | null | undefined): Indents {
  if (!attrs) return NO_INDENTS
  const left = finite(attrs.indentLeft) ?? legacySteps(attrs.indent) * INDENT_STEP_CM
  return clampIndents({ left, right: finite(attrs.indentRight) ?? 0, firstLine: finite(attrs.indentFirst) ?? 0 })
}

/** The attributes that store `indents`; the old step count goes back to 0. */
export const indentAttrs = ({ left, right, firstLine }: Indents) => ({
  indent: 0,
  indentLeft: left || null,
  indentRight: right || null,
  indentFirst: firstLine || null,
})

export const sameIndents = (a: Indents, b: Indents) =>
  a.left === b.left && a.right === b.right && a.firstLine === b.firstLine

/** The CSS the sheet, print and PDF show the indents with. */
export function indentStyle({ left, right, firstLine }: Indents): string {
  return [
    left ? `margin-left: ${left}cm` : '',
    right ? `margin-right: ${right}cm` : '',
    firstLine ? `text-indent: ${firstLine}cm` : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/** The left indent one step in (`delta` 1) or out (-1) on the 1.27 cm grid, or null when it cannot move. */
export function stepLeft(indents: Indents, delta: 1 | -1, width = TEXT_WIDTH_CM): Indents | null {
  const steps = indents.left / INDENT_STEP_CM
  const target = delta > 0 ? Math.floor(steps + 1e-6) + 1 : Math.ceil(steps - 1e-6) - 1
  const left = round(Math.min(MAX_INDENT_STEPS, Math.max(0, target)) * INDENT_STEP_CM)
  const next = clampIndents({ ...indents, left }, width)
  return (delta > 0 ? next.left > indents.left : next.left < indents.left) ? next : null
}

const between = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high))

/**
 * `current` with the values in `patch`, each kept inside the room the others leave (dragging the right indent never
 * pushes the left one). Left and first line together are a hanging-indent move: the first line keeps its place.
 */
export function patchIndents(current: Indents, patch: Partial<Indents>, width = TEXT_WIDTH_CM): Indents {
  const room = Math.max(0, width - MIN_TEXT_WIDTH_CM)
  let { left, right, firstLine } = clampIndents(current, width)
  if (patch.right !== undefined) right = between(patch.right, 0, room - left - Math.max(0, firstLine))
  if (patch.left !== undefined && patch.firstLine !== undefined) {
    const start = between(patch.left + patch.firstLine, 0, room - right)
    left = between(patch.left, 0, room - right)
    firstLine = start - left
  } else if (patch.left !== undefined) {
    left = between(patch.left, Math.max(0, -firstLine), room - right - Math.max(0, firstLine))
  } else if (patch.firstLine !== undefined) {
    firstLine = between(patch.firstLine, -left, room - right - left)
  }
  return clampIndents({ left, right, firstLine }, width)
}

/** "2,5 cm": centimetres the way the page writes numbers. */
export function formatCm(cm: number): string {
  const value = round(cm)
  return `${(Object.is(value, -0) ? 0 : value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} cm`
}
