import type katex from 'katex'

export type Katex = typeof katex

let katexLoad: Promise<Katex> | null = null

/** KaTeX with mhchem (the `\ce{…}` the chemistry tab saves): the same instance the editor renders formulas with. */
export function loadKatex(): Promise<Katex> {
  katexLoad ??= Promise.all([import('katex'), import('katex/contrib/mhchem')]).then(([module]) => module.default)
  return katexLoad
}
