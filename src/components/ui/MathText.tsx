import { useEffect, useMemo, useState } from 'react'
import type katex from 'katex'

type Katex = typeof katex

let katexLoad: Promise<Katex> | null = null

/** KaTeX and its fonts are fetched the first time a text with a formula is shown, never for plain text. */
function loadKatex() {
  katexLoad ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([module]) => module.default)
  return katexLoad
}

// `$$…$$` is a display formula; `$…$` an inline one that must start and end on a non-space, so "5$ và 6$" stays text.
const FORMULA = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<!\\)\$(?=[^\s$])((?:\\.|[^$\\\n])*?)(?<=\S)\$/g

type Piece = { text: string } | { formula: string; display: boolean }

function split(text: string): Piece[] {
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

function Formulas({ pieces }: { pieces: Piece[] }) {
  const [katex, setKatex] = useState<Katex | null>(null)
  useEffect(() => {
    let live = true
    loadKatex().then((loaded) => { if (live) setKatex(loaded) }, () => undefined)
    return () => { live = false }
  }, [])
  const html = useMemo(() => pieces.map((piece) => 'formula' in piece && katex
    ? katex.renderToString(piece.formula, { displayMode: piece.display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    : null), [pieces, katex])
  return pieces.map((piece, index) => 'text' in piece
    ? <span key={index}>{piece.text}</span>
    // Until KaTeX arrives the formula shows as the author typed it - marked, so a copy of the text (a paper cut into
    // printed pages) can wait until every formula is set.
    : html[index] === null
      ? <span key={index} data-math-pending="">{piece.display ? '$$' + piece.formula + '$$' : '$' + piece.formula + '$'}</span>
      // relative: KaTeX's hidden MathML copy is absolutely placed; without a positioned box around it, it escapes any
      // scrolling panel the formula sits in and stretches the whole page below its content
      : <span key={index} className="relative" dangerouslySetInnerHTML={{ __html: html[index] }} />)
}

/** Text with `$…$` and `$$…$$` formulas set as math; text without one is shown as it is. */
export default function MathText({ children }: { children: string }) {
  const pieces = useMemo(() => split(children), [children])
  return pieces.some((piece) => 'formula' in piece) ? <Formulas pieces={pieces} /> : <>{pieces.map((piece) => 'text' in piece ? piece.text : '').join('')}</>
}
