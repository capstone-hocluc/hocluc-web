import type katex from 'katex'

export type Katex = typeof katex

let katexLoad: Promise<Katex> | null = null
let loaded: Katex | null = null

/** KaTeX and its fonts are fetched the first time a text with a formula is shown, never for plain text. */
export function loadKatex() {
  katexLoad ??= Promise.all([
    import('katex'),
    // mhchem adds the `\ce{…}` macro the chemistry formula tab saves; other formulas render as before.
    import('katex/contrib/mhchem'),
    import('katex/dist/katex.min.css'),
  ]).then(([module]) => (loaded = module.default))
  return katexLoad
}

/** KaTeX once it has arrived, so a formula shown again (a remount, another page) is set at once; null before. */
export function loadedKatex() {
  return loaded
}
