import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadKatex, type Katex } from './katex-loader'
import { splitText as split, type Piece, type TextMark } from './math-split'

/** A text run with its marks: underlined as `<u>`, bold as `<strong>`. */
function Run({ text, marks }: { text: string; marks?: TextMark[] }) {
  let run: ReactNode = text
  if (marks?.includes('underline')) run = <u>{run}</u>
  if (marks?.includes('bold')) run = <strong>{run}</strong>
  return <span>{run}</span>
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
    ? <Run key={index} text={piece.text} marks={piece.marks} />
    // Until KaTeX arrives the formula shows as the author typed it - marked, so a copy of the text (a paper cut into
    // printed pages) can wait until every formula is set.
    : html[index] === null
      ? <span key={index} data-math-pending="">{piece.display ? '$$' + piece.formula + '$$' : '$' + piece.formula + '$'}</span>
      // relative: KaTeX's hidden MathML copy is absolutely placed; without a positioned box around it, it escapes any
      // scrolling panel the formula sits in and stretches the whole page below its content
      : <span key={index} className="relative" dangerouslySetInnerHTML={{ __html: html[index] }} />)
}

/** Text with `$…$` and `$$…$$` formulas set as math and its underlined or bold words marked; plain text as it is. */
export default function MathText({ children }: { children: string }) {
  const pieces = useMemo(() => split(children), [children])
  if (pieces.some((piece) => 'formula' in piece)) return <Formulas pieces={pieces} />
  if (pieces.some((piece) => 'marks' in piece)) {
    return pieces.map((piece, index) => 'text' in piece && <Run key={index} text={piece.text} marks={piece.marks} />)
  }
  return <>{pieces.map((piece) => 'text' in piece ? piece.text : '').join('')}</>
}
