/** Word's equations (OMML) as LaTeX, for the formulas of an imported .docx. */

const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math'

const NARY: Record<string, string> = {
  '∑': '\\sum',
  '∏': '\\prod',
  '∐': '\\coprod',
  '∫': '\\int',
  '∬': '\\iint',
  '∭': '\\iiint',
  '∮': '\\oint',
  '⋃': '\\bigcup',
  '⋂': '\\bigcap',
  '⋁': '\\bigvee',
  '⋀': '\\bigwedge',
  '⨁': '\\bigoplus',
  '⨂': '\\bigotimes',
}

/** A character by code point: combining accents and special spaces are invisible in source. */
const char = (code: number) => String.fromCharCode(code)

/** The circumflex Word puts over a letter when an accent names no character. */
const DEFAULT_ACCENT = char(0x302)

/** Accent characters: the command for one letter, then the one stretching over several. */
const ACCENTS: Record<string, readonly [string, string]> = Object.fromEntries(
  (
    [
      [0x302, '\\hat', '\\widehat'],
      [0x5e, '\\hat', '\\widehat'],
      [0x303, '\\tilde', '\\widetilde'],
      [0x7e, '\\tilde', '\\widetilde'],
      [0x304, '\\bar', '\\overline'],
      [0x305, '\\bar', '\\overline'],
      [0xaf, '\\bar', '\\overline'],
      [0x20d7, '\\vec', '\\overrightarrow'],
      [0x2192, '\\vec', '\\overrightarrow'],
      [0x20d6, '\\overleftarrow', '\\overleftarrow'],
      [0x20e1, '\\overleftrightarrow', '\\overleftrightarrow'],
      [0x307, '\\dot', '\\dot'],
      [0x308, '\\ddot', '\\ddot'],
      [0x30c, '\\check', '\\check'],
      [0x301, '\\acute', '\\acute'],
      [0x300, '\\grave', '\\grave'],
      [0x306, '\\breve', '\\breve'],
      [0x30a, '\\mathring', '\\mathring'],
    ] as const
  ).map(([code, single, wide]) => [char(code), [single, wide] as const])
)

const DELIMITERS: Record<string, string> = {
  '': '.',
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '|': '|',
  '{': '\\{',
  '}': '\\}',
  '‖': '\\|',
  '⟨': '\\langle',
  '〈': '\\langle',
  '⟩': '\\rangle',
  '〉': '\\rangle',
  '⌊': '\\lfloor',
  '⌋': '\\rfloor',
  '⌈': '\\lceil',
  '⌉': '\\rceil',
}

/** Matrix environments by their brackets. */
const MATRICES: Record<string, string> = { '()': 'pmatrix', '[]': 'bmatrix', '||': 'vmatrix', '‖‖': 'Vmatrix', '{}': 'Bmatrix' }

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln',
  'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'arg', 'det', 'deg', 'dim', 'gcd', 'hom', 'ker', 'Pr', 'liminf', 'limsup',
])

const SYMBOLS: Record<string, string> = {
  '{': '\\{',
  '}': '\\}',
  '%': '\\%',
  '#': '\\#',
  '&': '\\&',
  _: '\\_',
  $: '\\$',
  '\\': '\\backslash ',
  '^': '\\hat{}',
  '~': '\\sim ',
  '−': '-',
  '∘': '\\circ ',
  '′': "'",
  '″': "''",
  '·': '\\cdot ',
  '⋅': '\\cdot ',
  '…': '\\ldots ',
  '⋯': '\\cdots ',
  // Zero-width, no-break, en, em, four-per-em, six-per-em, thin and hair spaces.
  [char(0x200b)]: '',
  [char(0xa0)]: '\\ ',
  [char(0x2002)]: '\\enspace ',
  [char(0x2003)]: '\\quad ',
  [char(0x2005)]: '\\;',
  [char(0x2006)]: '\\,',
  [char(0x2009)]: '\\,',
  [char(0x200a)]: '\\,',
}

const SCRIPTS: Record<string, string> = {
  'double-struck': '\\mathbb',
  script: '\\mathcal',
  fraktur: '\\mathfrak',
  'sans-serif': '\\mathsf',
  monospace: '\\mathtt',
}

const STYLES: Record<string, string> = { p: '\\mathrm', b: '\\mathbf', bi: '\\boldsymbol' }

function elements(parent: Element, name?: string): Element[] {
  return Array.from(parent.children).filter((child) => child.namespaceURI === M && (!name || child.localName === name))
}

function first(parent: Element, name: string): Element | null {
  return elements(parent, name)[0] ?? null
}

function value(element: Element | null): string | null {
  if (!element) return null
  return element.getAttributeNS(M, 'val') ?? element.getAttribute('m:val')
}

/** A property of an element, e.g. `<m:naryPr><m:chr m:val="∑"/></m:naryPr>`; `undefined` when absent. */
function property(element: Element, properties: string, name: string): string | null | undefined {
  const group = first(element, properties)
  const item = group ? first(group, name) : null
  return item ? value(item) : undefined
}

function isOn(flag: string | null | undefined): boolean {
  return flag !== undefined && flag !== '0' && flag !== 'off' && flag !== 'false'
}

/** Pieces of LaTeX side by side, a space kept after a control word followed by a letter. */
function join(parts: string[]): string {
  let latex = ''
  for (const part of parts) {
    if (!part) continue
    if (/\\[a-zA-Z]+$/.test(latex) && /^[a-zA-Z]/.test(part)) latex += ' '
    latex += part
  }
  return latex
}

/** A script's base: one token as it is, anything longer in braces. */
function base(latex: string): string {
  const text = latex.trim()
  return /^([A-Za-z0-9]|\\[A-Za-z]+|\\[A-Za-z]+\{[^{}]*\})$/.test(text) ? text : `{${text}}`
}

function mathText(text: string): string {
  return Array.from(text, (char) => SYMBOLS[char] ?? char).join('')
}

class OmmlReader {
  /** Inside a function's name: words are function names (`\sin`, `\operatorname{tg}`). */
  private functionName = false

  read(element: Element | null): string {
    if (!element) return ''
    return join(elements(element).map((child) => this.node(child)))
  }

  /** A child part; inside a function's name only the base is the name (in "lim_{x→0}" the x is a variable). */
  private part(element: Element, name: string): string {
    const outer = this.functionName
    if (name !== 'e' && name !== 'fName') this.functionName = false
    const latex = this.read(first(element, name))
    this.functionName = outer
    return latex
  }

  node(element: Element): string {
    const name = element.localName
    if (name.endsWith('Pr')) return ''
    switch (name) {
      case 'r':
        return this.run(element)
      case 'f':
        return this.fraction(element)
      case 'rad': {
        const degree = this.part(element, 'deg').trim()
        const body = this.part(element, 'e')
        return isOn(property(element, 'radPr', 'degHide')) || !degree ? `\\sqrt{${body}}` : `\\sqrt[${degree}]{${body}}`
      }
      case 'sSup':
        return `${base(this.part(element, 'e'))}^{${this.part(element, 'sup')}}`
      case 'sSub':
        return `${base(this.part(element, 'e'))}_{${this.part(element, 'sub')}}`
      case 'sSubSup':
        return `${base(this.part(element, 'e'))}_{${this.part(element, 'sub')}}^{${this.part(element, 'sup')}}`
      case 'sPre':
        return `{}_{${this.part(element, 'sub')}}^{${this.part(element, 'sup')}}${this.part(element, 'e')}`
      case 'nary':
        return this.nary(element)
      case 'd':
        return this.delimiters(element)
      case 'm':
        return this.matrix(element, 'matrix')
      case 'eqArr':
        return `\\begin{gathered}${elements(element, 'e').map((row) => this.read(row)).join(' \\\\ ')}\\end{gathered}`
      case 'acc': {
        const accent = property(element, 'accPr', 'chr') ?? DEFAULT_ACCENT
        const body = this.part(element, 'e')
        const [single, wide] = ACCENTS[accent] ?? ACCENTS[DEFAULT_ACCENT]
        return `${(first(element, 'e')?.textContent ?? '').length > 1 ? wide : single}{${body}}`
      }
      case 'bar':
        return `${property(element, 'barPr', 'pos') === 'top' ? '\\overline' : '\\underline'}{${this.part(element, 'e')}}`
      case 'groupChr':
        return this.groupCharacter(element)
      case 'limLow':
        return this.lowerLimit(element)
      case 'limUpp':
        return this.upperLimit(element)
      case 'func':
        return this.func(element)
      case 'borderBox':
        return `\\boxed{${this.part(element, 'e')}}`
      case 'phant':
        return property(element, 'phantPr', 'show') !== undefined && !isOn(property(element, 'phantPr', 'show'))
          ? `\\phantom{${this.part(element, 'e')}}`
          : this.part(element, 'e')
      default:
        // oMath, e, num, den, box, sub, sup…: their content.
        return this.read(element)
    }
  }

  private run(element: Element): string {
    const text = elements(element, 't').map((item) => item.textContent ?? '').join('')
    if (!text) return ''
    const properties = first(element, 'rPr')
    const normal = properties ? first(properties, 'nor') : null
    if (normal && isOn(value(normal))) {
      return `\\text{${text.replace(/[{}\\]/g, (char) => (char === '\\' ? '\\textbackslash{}' : `\\${char}`))}}`
    }
    if (this.functionName && /^[A-Za-z]+$/.test(text)) {
      return FUNCTIONS.has(text) ? `\\${text}` : `\\operatorname{${text}}`
    }
    const latex = mathText(text)
    const script = properties ? SCRIPTS[value(first(properties, 'scr')) ?? ''] : undefined
    const style = properties ? STYLES[value(first(properties, 'sty')) ?? ''] : undefined
    if (script) return `${script}{${latex}}`
    if (style && /[A-Za-z0-9]/.test(text)) return `${style}{${latex}}`
    return latex
  }

  private fraction(element: Element): string {
    const numerator = this.part(element, 'num')
    const denominator = this.part(element, 'den')
    const type = property(element, 'fPr', 'type')
    if (type === 'noBar') return `\\genfrac{}{}{0pt}{}{${numerator}}{${denominator}}`
    if (type === 'lin' || type === 'skw') return `${base(numerator)}/${base(denominator)}`
    return `\\frac{${numerator}}{${denominator}}`
  }

  private nary(element: Element): string {
    const char = property(element, 'naryPr', 'chr') ?? '∫'
    const operator = NARY[char] ?? mathText(char)
    const limits = property(element, 'naryPr', 'limLoc') === 'undOvr' && operator.includes('int') ? '\\limits' : ''
    const sub = isOn(property(element, 'naryPr', 'subHide')) ? '' : this.part(element, 'sub')
    const sup = isOn(property(element, 'naryPr', 'supHide')) ? '' : this.part(element, 'sup')
    return join([operator + limits, sub ? `_{${sub}}` : '', sup ? `^{${sup}}` : '', ' ', this.part(element, 'e')])
  }

  private matrix(element: Element, environment: string): string {
    const rows = elements(element, 'mr').map((row) => elements(row, 'e').map((cell) => this.read(cell)).join(' & '))
    return `\\begin{${environment}}${rows.join(' \\\\ ')}\\end{${environment}}`
  }

  private delimiters(element: Element): string {
    const open = property(element, 'dPr', 'begChr') ?? '('
    const close = property(element, 'dPr', 'endChr') ?? ')'
    const separator = property(element, 'dPr', 'sepChr') ?? '|'
    const items = elements(element, 'e')
    // A lone matrix or equation array in brackets: the LaTeX environment with those brackets.
    const inner = items.length === 1 ? elements(items[0]) : []
    const only = inner.length === 1 ? inner[0] : null
    if (only && (only.localName === 'm' || only.localName === 'eqArr')) {
      if (open === '{' && close === '') {
        const rows = only.localName === 'm' ? elements(only, 'mr').map((row) => elements(row, 'e').map((cell) => this.read(cell)).join(' & ')) : elements(only, 'e').map((row) => this.read(row))
        return `\\begin{cases}${rows.join(' \\\\ ')}\\end{cases}`
      }
      const environment = only.localName === 'm' ? MATRICES[open + close] : undefined
      if (environment) return this.matrix(only, environment)
    }
    const middle = separator === '|' ? ' \\mid ' : ` ${mathText(separator)} `
    return `\\left${DELIMITERS[open] ?? '.'} ${items.map((item) => this.read(item)).join(middle)} \\right${DELIMITERS[close] ?? '.'}`
  }

  private groupCharacter(element: Element): string {
    const char = property(element, 'groupChrPr', 'chr') ?? '⏟'
    const top = property(element, 'groupChrPr', 'pos') === 'top'
    const body = this.part(element, 'e')
    if (char === '⏟') return `\\underbrace{${body}}`
    if (char === '⏞') return `\\overbrace{${body}}`
    if (char === '→') return `\\overrightarrow{${body}}`
    if (char === '←') return `\\overleftarrow{${body}}`
    return top ? `\\overset{${mathText(char)}}{${body}}` : `\\underset{${mathText(char)}}{${body}}`
  }

  private lowerLimit(element: Element): string {
    const body = this.part(element, 'e').trim()
    const limit = this.part(element, 'lim')
    return /^\\(lim|max|min|sup|inf|liminf|limsup)$/.test(body) ? `${body}_{${limit}}` : `\\underset{${limit}}{${body}}`
  }

  private upperLimit(element: Element): string {
    const text = (first(element, 'e')?.textContent ?? '').trim()
    const limit = this.part(element, 'lim')
    if (text === '→' || text === '⟶') return `\\xrightarrow{${limit}}`
    if (text === '←' || text === '⟵') return `\\xleftarrow{${limit}}`
    if (text === '⇌' || text === '⇄' || text === '⇋') return `\\xrightleftharpoons{${limit}}`
    return `\\overset{${limit}}{${this.part(element, 'e')}}`
  }

  private func(element: Element): string {
    const outer = this.functionName
    this.functionName = true
    const name = this.part(element, 'fName')
    this.functionName = outer
    return join([name, ' ', this.part(element, 'e')])
  }
}

/** One `m:oMath` (or `m:oMathPara`) as LaTeX; '' when it holds nothing. */
export function ommlToLatex(math: Element): string {
  return new OmmlReader().read(math).trim()
}

/** The equation's characters, for a formula KaTeX cannot set. */
export function ommlText(math: Element): string {
  return Array.from(math.getElementsByTagNameNS(M, 't'), (item) => item.textContent ?? '').join('')
}
