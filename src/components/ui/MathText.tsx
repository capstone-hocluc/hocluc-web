import { useEffect, useMemo, useState } from 'react'
import type katex from 'katex'
import { splitFormulas as split, type Piece } from './math-split'

type Katex = typeof katex

let katexLoad: Promise<Katex> | null = null

/** KaTeX and its fonts are fetched the first time a text with a formula is shown, never for plain text. */
function loadKatex() {
  katexLoad ??= Promise.all([
    import('katex'),
    // mhchem adds the `\ce{…}` macro the chemistry formula tab saves; other formulas render as before.
    import('katex/contrib/mhchem'),
    import('katex/dist/katex.min.css'),
  ]).then(([module]) => module.default)
  return katexLoad
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
