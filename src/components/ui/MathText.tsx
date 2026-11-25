import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadedKatex, loadKatex, type Katex } from './katex-loader'
import { splitText as split, type Piece, type TextMark } from './math-split'

/** A text run with its marks: underlined as `<u>`, bold as `<strong>`. */
function Run({ text, marks }: { text: string; marks?: TextMark[] }) {
  let run: ReactNode = text
  if (marks?.includes('underline')) run = <u>{run}</u>
  if (marks?.includes('bold')) run = <strong>{run}</strong>
  return <span>{run}</span>
}

/**
 * Where a formula goes while KaTeX is on its way: a shimmer about its size, never the `$…$` the author typed. Marked, so
 * a copy of the text (a paper cut into printed pages) can wait until every formula is set.
 */
function PendingFormula({ formula, display, failed }: { formula: string; display: boolean; failed: boolean }) {
  // KaTeX could not be fetched (offline, a stale chunk after a deploy): the formula as typed, readable, and set.
  if (failed) return <span>{display ? '$$' + formula + '$$' : '$' + formula + '$'}</span>
  const width = `${Math.min(Math.max(formula.length * 0.5, 2), display ? 24 : 12)}em`
  return (
    <span
      data-math-pending=""
      className={display ? 'my-2 flex justify-center' : 'inline-block align-middle'}
    >
      <span aria-hidden className="inline-block h-[1.1em] animate-pulse-custom rounded-md bg-skeleton-gradient-50" style={{ width }} />
      <span className="sr-only">{formula}</span>
    </span>
  )
}

function Formulas({ pieces }: { pieces: Piece[] }) {
  // KaTeX is fetched once: a formula shown after that is set in the first paint.
  const [katex, setKatex] = useState<Katex | null>(loadedKatex)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (katex) return
    let live = true
    loadKatex().then((module) => { if (live) setKatex(module) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [katex])
  const html = useMemo(() => pieces.map((piece) => 'formula' in piece && katex
    ? katex.renderToString(piece.formula, { displayMode: piece.display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    : null), [pieces, katex])
  return pieces.map((piece, index) => 'text' in piece
    ? <Run key={index} text={piece.text} marks={piece.marks} />
    : html[index] === null
      ? <PendingFormula key={index} formula={piece.formula} display={piece.display} failed={failed} />
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
