// `$$…$$` is a display formula; `$…$` an inline one that must start and end on a non-space, so "5$ và 6$" stays text.
const FORMULA = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<!\\)\$(?=[^\s$])((?:\\.|[^$\\\n])*?)(?<=\S)\$/g

/**
 * The marks a question's words may carry, the way an exam marks the words it points at: `<u>…</u>` underlines (the
 * parts of an error-finding sentence), `<b>…</b>` sets bold (a word asked about in a reading). `<strong>` and `**…**`
 * are read as bold too. Tags inside a formula are the formula's own (`$0<x<15$`) and are left alone.
 */
export type TextMark = 'bold' | 'underline'

export type TextRun = { text: string; marks?: TextMark[] }

export type Piece = TextRun | { formula: string; display: boolean }

const MARK = /<(\/?)(u|b|strong)>|\*\*/gi

/** Whether a text holds a mark tag. */
export const hasMarkTags = (text: string) => /<\/?(?:u|b|strong)>|\*\*/i.test(text)

/**
 * Reads the mark tags out of one passage's text runs, in order, keeping what is open from one run to the next (a
 * formula may sit inside an underline). A `**` only counts when the passage holds them in pairs, so a lone one stays.
 */
export class MarkReader {
  private underline = 0
  private bold = 0
  private starBold = false
  private readonly stars: boolean

  constructor(runs: readonly string[]) {
    this.stars = runs.reduce((count, run) => count + run.split('**').length - 1, 0) % 2 === 0
  }

  read(text: string): TextRun[] {
    const out: TextRun[] = []
    const push = (run: string) => {
      if (!run) return
      const marks: TextMark[] = []
      if (this.bold > 0 || this.starBold) marks.push('bold')
      if (this.underline > 0) marks.push('underline')
      out.push(marks.length ? { text: run, marks } : { text: run })
    }
    let at = 0
    for (const match of text.matchAll(MARK)) {
      if (match[0] === '**' && !this.stars) continue
      push(text.slice(at, match.index))
      at = match.index + match[0].length
      if (match[0] === '**') this.starBold = !this.starBold
      else if (match[2].toLowerCase() === 'u') this.underline = Math.max(0, this.underline + (match[1] ? -1 : 1))
      else this.bold = Math.max(0, this.bold + (match[1] ? -1 : 1))
    }
    push(text.slice(at))
    return out
  }
}

/** Cuts a text into formulas (`$…$`, `$$…$$`) and text runs, each run with the marks its tags set. */
export function splitText(text: string): Piece[] {
  const pieces: Piece[] = []
  let last = 0
  for (const match of text.matchAll(FORMULA)) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) })
    pieces.push({ formula: match[1] ?? match[2], display: match[1] !== undefined })
    last = match.index + match[0].length
  }
  if (last < text.length) pieces.push({ text: text.slice(last) })
  const runs = pieces.flatMap((piece) => ('text' in piece ? [piece.text.replaceAll('\\$', '$')] : []))
  const reader = new MarkReader(runs)
  return pieces.flatMap<Piece>((piece) => ('text' in piece ? reader.read(piece.text.replaceAll('\\$', '$')) : [piece]))
}
