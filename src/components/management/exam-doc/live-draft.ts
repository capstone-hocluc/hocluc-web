/**
 * The words the AI is writing for one unit (a question, or a passage group), read while its JSON answer is still
 * coming in: the passage, and each question's stem and options as far as they go. Shown on the sheet and in the chat
 * until the checked question arrives and replaces it.
 */

export interface LiveDraft {
  unit: number
  section: string
  positions: number[]
  /** The model's answer so far (raw JSON, cut anywhere). */
  text: string
}

export interface LiveDraftQuestion {
  stem: string
  options: string[]
}

export interface LiveDraftView {
  passage: string | null
  questions: LiveDraftQuestion[]
}

/** Closes what is left open in a JSON text cut short: the string being written, then every object and array. */
export function closePartialJson(text: string): string {
  const start = text.indexOf('{')
  if (start < 0) return ''
  let out = text.slice(start)
  const stack: string[] = []
  let inString = false
  let escaped = false
  for (const char of out) {
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === '{') stack.push('}')
    else if (char === '[') stack.push(']')
    else if (char === '}' || char === ']') stack.pop()
  }
  if (inString) {
    if (escaped) out = out.slice(0, -1)
    out += '"'
  }
  out = out.replace(/\s+$/, '')
  if (out.endsWith(':')) out += 'null'
  out = out.replace(/,$/, '')
  return out + stack.reverse().join('')
}

/** The partial answer as a value, or null while nothing readable has arrived yet. */
export function parsePartial(text: string): unknown {
  let source = text
  // A cut inside a key ({"ste) cannot be closed into JSON: drop back to the last complete member and try again.
  for (let tries = 0; tries < 6 && source; tries++) {
    const closed = closePartialJson(source)
    if (!closed) return null
    try {
      return JSON.parse(closed)
    } catch {
      const cut = Math.max(source.lastIndexOf(','), source.lastIndexOf('['), source.lastIndexOf('{'))
      if (cut <= 0) return null
      source = source.slice(0, cut + (source[cut] === ',' ? 0 : 1))
    }
  }
  return null
}

const words = (value: unknown) =>
  (typeof value === 'string' ? value : '')
    // formulas read without their $…$ marks while they are being written
    .replace(/\$+/g, '')
    .trim()

/** What can already be shown of the unit. */
export function liveDraftView(text: string): LiveDraftView {
  const value = parsePartial(text) as Record<string, unknown> | null
  if (!value || typeof value !== 'object') return { passage: null, questions: [] }
  const list = Array.isArray(value.questions) ? value.questions : value.stem !== undefined ? [value] : []
  const questions = list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      stem: words(item.stem ?? item.text),
      options: (Array.isArray(item.options) ? item.options : [])
        .map((option) => words(typeof option === 'object' && option ? (option as { text?: unknown }).text : option))
        .filter(Boolean),
    }))
    .filter((question) => question.stem || question.options.length)
  const passage = words(value.passage)
  return { passage: passage || null, questions }
}

/** The last words written, for a one-line progress note. */
export function liveDraftTail(view: LiveDraftView, length = 70): string {
  const last = view.questions[view.questions.length - 1]
  const text = last ? (last.options[last.options.length - 1] ?? last.stem) : (view.passage ?? '')
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > length ? `…${flat.slice(-length)}` : flat
}
