// `$$…$$` is a display formula; `$…$` an inline one that must start and end on a non-space, so "5$ và 6$" stays text.
const FORMULA = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<!\\)\$(?=[^\s$])((?:\\.|[^$\\\n])*?)(?<=\S)\$/g

export type Piece = { text: string } | { formula: string; display: boolean }

/** Cuts a text into plain runs and `$…$` / `$$…$$` formulas (MathText sets them; the exam editor turns them into nodes). */
export function splitFormulas(text: string): Piece[] {
  const pieces: Piece[] = []
  let last = 0
  for (const match of text.matchAll(FORMULA)) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) })
    pieces.push({ formula: match[1] ?? match[2], display: match[1] !== undefined })
    last = match.index + match[0].length
  }
  if (last < text.length) pieces.push({ text: text.slice(last) })
  return pieces.map((piece) => 'text' in piece ? { text: piece.text.replaceAll('\\$', '$') } : piece)
}
