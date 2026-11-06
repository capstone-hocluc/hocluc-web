/*
 * The expressions of a function graph (`AiFunctionChart`), read by a small recursive-descent parser into a function
 * of x: nothing is run as code. The grammar is the server's (`ai/compose/ChartSpec`):
 *
 *   sum     = product (("+" | "-") product)*
 *   product = factor (("*" | "/") factor | factor)*   (a factor without * only when a name or "(" opens it)
 *   factor  = ("+" | "-") factor | power
 *   power   = primary ("^" factor)?
 *   primary = number | "x" | "pi" | "e" | function "(" sum ")" | "(" sum ")"
 *
 * with the functions sqrt abs sin cos tan ln log exp; log is base 10. So -x^2 is -(x^2), 2^3^2 is 2^9, 1/2x is (1/2)x.
 * A run of letters is read as names one by one, taking at each step the longest name it starts with, so pix is pi*x,
 * xsin(x) is x*sin(x) and xe^x is x*e^x.
 */

export type RealFunction = (x: number) => number

/** The longest expression a graph keeps. */
export const MAX_EXPRESSION = 120

const FUNCTIONS = new Map<string, (value: number) => number>([
  ['sqrt', Math.sqrt],
  ['abs', Math.abs],
  ['sin', Math.sin],
  ['cos', Math.cos],
  ['tan', Math.tan],
  ['ln', Math.log],
  ['log', Math.log10],
  ['exp', Math.exp],
])

/** Every name of the grammar, the longest first: a run of letters is split into these. */
const NAMES = ['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'exp', 'ln', 'pi', 'x', 'e']

/** An expression as it is kept: lower case, single spaces, and the signs typed in Unicode written in ASCII. */
export function normalizeExpression(text: string): string | null {
  const value = text
    .trim()
    .toLowerCase()
    .replace(/[−–]/g, '-')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\s+/g, ' ')
  return value && value.length <= MAX_EXPRESSION ? value : null
}

/** Where an expression breaks the grammar, said for the teacher typing it (in Vietnamese). */
class ExpressionError extends Error {}

const ENDS_TOO_SOON = 'Biểu thức chưa viết xong.'

const isDigit = (char: string | undefined) => char !== undefined && char >= '0' && char <= '9'
const isLetter = (char: string | undefined) => char !== undefined && char >= 'a' && char <= 'z'

/** `text` (already normalized) as a function of x; throws an ExpressionError where it breaks the grammar. */
function read(text: string): RealFunction {
  let at = 0

  const skipSpaces = () => {
    while (text[at] === ' ') at += 1
  }
  const take = (char: string) => {
    skipSpaces()
    if (text[at] !== char) return false
    at += 1
    return true
  }
  const expect = (char: string) => {
    if (take(char)) return
    throw new ExpressionError(at >= text.length && char === ')' ? `Thiếu dấu ')' ở cuối.` : at >= text.length ? ENDS_TOO_SOON : `Thiếu dấu '${char}'.`)
  }
  // A name or "(" next: a product written without its * (2x, x(x-1), x sin(x)).
  const startsFactor = () => {
    skipSpaces()
    return text[at] === '(' || isLetter(text[at])
  }

  function sum(): RealFunction {
    let f = product()
    for (;;) {
      const left = f
      if (take('+')) {
        const right = product()
        f = (x) => left(x) + right(x)
      } else if (take('-')) {
        const right = product()
        f = (x) => left(x) - right(x)
      } else {
        return f
      }
    }
  }

  function product(): RealFunction {
    let f = factor()
    for (;;) {
      const left = f
      if (take('*') || startsFactor()) {
        const right = factor()
        f = (x) => left(x) * right(x)
      } else if (take('/')) {
        const right = factor()
        f = (x) => left(x) / right(x)
      } else {
        return f
      }
    }
  }

  function factor(): RealFunction {
    if (take('-')) {
      const inner = factor()
      return (x) => -inner(x)
    }
    if (take('+')) return factor()
    return power()
  }

  function power(): RealFunction {
    const base = primary()
    if (!take('^')) return base
    const exponent = factor()
    return (x) => Math.pow(base(x), exponent(x))
  }

  function primary(): RealFunction {
    if (take('(')) {
      const inner = sum()
      expect(')')
      return inner
    }
    if (isDigit(text[at]) || text[at] === '.') {
      const value = number()
      return () => value
    }
    const name = readName()
    if (name === 'x') return (x) => x
    if (name === 'pi') return () => Math.PI
    if (name === 'e') return () => Math.E
    const apply = FUNCTIONS.get(name)
    if (!apply) throw new ExpressionError(`Không hiểu "${name}".`)
    expect('(')
    const argument = sum()
    expect(')')
    return (x) => apply(argument(x))
  }

  function number(): number {
    const start = at
    while (isDigit(text[at])) at += 1
    if (text[at] === '.') {
      at += 1
      while (isDigit(text[at])) at += 1
    }
    const written = text.slice(start, at)
    if (written === '.') throw new ExpressionError("Dấu '.' đứng một mình.")
    return Number(written)
  }

  function readName(): string {
    const name = NAMES.find((candidate) => text.startsWith(candidate, at))
    if (name) {
      at += name.length
      return name
    }
    const start = at
    while (isLetter(text[at])) at += 1
    if (start === at) throw at < text.length ? unexpected(text[at]) : new ExpressionError(ENDS_TOO_SOON)
    throw new ExpressionError(`Không hiểu "${text.slice(start, at)}": chỉ dùng x, số, pi, e và sqrt abs sin cos tan ln log exp.`)
  }

  const f = sum()
  skipSpaces()
  if (at < text.length) throw unexpected(text[at])
  return f
}

function unexpected(char: string): ExpressionError {
  if (char === ',') return new ExpressionError('Số thập phân viết bằng dấu chấm (0.5), không dùng dấu phẩy.')
  if (char === ')') return new ExpressionError("Thừa dấu ')' hoặc thiếu số trước nó.")
  return new ExpressionError(`Ký tự "${char}" không dùng được ở đây.`)
}

/** Why `expression` cannot be drawn, in Vietnamese for the teacher typing it; null when it is written in the grammar. */
export function expressionProblem(expression: string): string | null {
  if (!expression.trim()) return 'Nhập biểu thức của hàm số.'
  const text = normalizeExpression(expression)
  if (text === null) return `Biểu thức dài quá ${MAX_EXPRESSION} ký tự.`
  try {
    read(text)
    return null
  } catch (error) {
    if (error instanceof ExpressionError) return error.message
    throw error
  }
}

/** `expression` as a function of x (NaN where it has no value); null when it is not written in the grammar. */
export function compileExpression(expression: string): RealFunction | null {
  const text = normalizeExpression(expression)
  if (text === null) return null
  try {
    return read(text)
  } catch (error) {
    if (error instanceof ExpressionError) return null
    throw error
  }
}
