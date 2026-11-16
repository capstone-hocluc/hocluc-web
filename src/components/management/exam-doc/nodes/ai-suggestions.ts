import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { StepMap } from '@tiptap/pm/transform'
import { splitText } from '../../../ui/math-split'
import { loadKatex } from '../../../ui/katex-loader'
import { inlineContent, textBlocks } from '../draft-to-doc'

/*
 * What the AI would change on the sheet, shown before it is changed: the words it would replace struck through and
 * its words beside them, with ✓ / ✗. Nothing here is part of the document, so it is never saved and never exported;
 * only an accepted suggestion becomes an edit (Ctrl+Z takes it back). A piece of the sheet sent to the AI is marked
 * while the answer is on its way, and follows the edits made meanwhile.
 */

/** A piece of the sheet the AI is working on. */
export interface AiEditRange {
  id: string
  from: number
  to: number
}

export type AiSuggestionShape = 'inline' | 'blocks'

export interface AiSuggestion extends AiEditRange {
  /** The words to put in place of the range, formulas between $…$; empty removes the range. */
  replacement: string
  /** Fixed when the piece was taken: words within one line, or whole lines. */
  shape: AiSuggestionShape
  reason?: string
  /** A short name of the kind of change, shown before the reason ("Chính tả"). */
  label?: string
  source: 'rewrite' | 'proofread'
}

export interface AiSuggestionsState {
  pending: AiEditRange[]
  suggestions: AiSuggestion[]
}

type Action =
  | { type: 'pend'; range: AiEditRange }
  | { type: 'resolve'; suggestion: Omit<AiSuggestion, 'from' | 'to'> }
  | { type: 'add'; suggestions: AiSuggestion[] }
  | { type: 'remove'; ids: string[] }
  | { type: 'clear'; source?: AiSuggestion['source'] }

export const aiSuggestionsKey = new PluginKey<AiSuggestionsState>('aiSuggestions')

const EMPTY: AiSuggestionsState = { pending: [], suggestions: [] }

/**
 * The range after an edit, or null when the edit wrote inside it (its words are no longer those the AI read) or took
 * it away. Words typed right before or after it leave it as it is.
 */
export function mapRange<T extends AiEditRange>(range: T, maps: readonly StepMap[]): T | null {
  let { from, to } = range
  for (const map of maps) {
    let touched = false
    map.forEach((oldStart, oldEnd) => {
      if (oldStart < to && oldEnd > from) touched = true
    })
    if (touched) return null
    const start = map.mapResult(from, 1)
    const end = map.mapResult(to, -1)
    if (start.deleted || end.deleted) return null
    from = start.pos
    to = end.pos
    if (from >= to) return null
  }
  return { ...range, from, to }
}

const overlaps = (a: AiEditRange, b: AiEditRange) => a.from < b.to && b.from < a.to

function apply(tr: Transaction, previous: AiSuggestionsState): AiSuggestionsState {
  const action = tr.getMeta(aiSuggestionsKey) as Action | undefined
  let state = previous
  if (tr.docChanged && (state.pending.length || state.suggestions.length)) {
    const maps = tr.mapping.maps
    state = {
      pending: state.pending.map((range) => mapRange(range, maps)).filter((range) => range !== null),
      suggestions: state.suggestions.map((range) => mapRange(range, maps)).filter((range) => range !== null),
    }
  }
  if (!action) return state
  const taken = [...state.pending, ...state.suggestions]
  switch (action.type) {
    case 'pend':
      return taken.some((range) => overlaps(range, action.range)) ? state : { ...state, pending: [...state.pending, action.range] }
    case 'resolve': {
      const range = state.pending.find((entry) => entry.id === action.suggestion.id)
      if (!range) return state
      return {
        pending: state.pending.filter((entry) => entry.id !== range.id),
        suggestions: [...state.suggestions, { ...action.suggestion, from: range.from, to: range.to }],
      }
    }
    case 'add': {
      const added: AiSuggestion[] = []
      for (const suggestion of action.suggestions) {
        if ([...taken, ...added].some((range) => overlaps(range, suggestion))) continue
        added.push(suggestion)
      }
      return added.length ? { ...state, suggestions: [...state.suggestions, ...added] } : state
    }
    case 'remove': {
      const ids = new Set(action.ids)
      return {
        pending: state.pending.filter((range) => !ids.has(range.id)),
        suggestions: state.suggestions.filter((range) => !ids.has(range.id)),
      }
    }
    case 'clear':
      return action.source
        ? { ...state, suggestions: state.suggestions.filter((suggestion) => suggestion.source !== action.source) }
        : { pending: [], suggestions: [] }
  }
}

export function aiSuggestions(state: EditorState): AiSuggestionsState {
  return aiSuggestionsKey.getState(state) ?? EMPTY
}

function dispatch(editor: Editor, action: Action) {
  if (editor.isDestroyed) return
  editor.view.dispatch(editor.state.tr.setMeta(aiSuggestionsKey, action).setMeta('addToHistory', false))
}

let nextId = 0
const newId = () => `ai-${Date.now().toString(36)}-${(nextId++).toString(36)}`

/** Marks `from`–`to` as sent to the AI; null when part of it is already waiting for or showing a suggestion. */
export function pendAiEdit(editor: Editor, from: number, to: number): string | null {
  const range = { id: newId(), from, to }
  dispatch(editor, { type: 'pend', range })
  return aiSuggestions(editor.state).pending.some((entry) => entry.id === range.id) ? range.id : null
}

/** The AI's answer for a marked range, shown as a suggestion; false when the range was edited meanwhile. */
export function resolveAiEdit(
  editor: Editor,
  id: string,
  answer: { replacement: string; shape: AiSuggestionShape; reason?: string; label?: string }
): boolean {
  if (editor.isDestroyed || !aiSuggestions(editor.state).pending.some((entry) => entry.id === id)) return false
  dispatch(editor, { type: 'resolve', suggestion: { id, source: 'rewrite', ...answer } })
  return aiSuggestions(editor.state).suggestions.some((entry) => entry.id === id)
}

/** Suggestions found elsewhere (the sheet being proofread); those overlapping one already shown are left out. */
export function addAiSuggestions(editor: Editor, suggestions: Array<Omit<AiSuggestion, 'id'>>): number {
  if (editor.isDestroyed) return 0
  const withIds = suggestions.map((suggestion) => ({ ...suggestion, id: newId() }))
  const before = aiSuggestions(editor.state).suggestions.length
  dispatch(editor, { type: 'add', suggestions: withIds })
  return aiSuggestions(editor.state).suggestions.length - before
}

export function cancelAiEdit(editor: Editor, id: string) {
  dispatch(editor, { type: 'remove', ids: [id] })
}

export function rejectAiSuggestions(editor: Editor, ids?: string[]) {
  const all = aiSuggestions(editor.state).suggestions.map((suggestion) => suggestion.id)
  dispatch(editor, { type: 'remove', ids: ids ?? all })
}

export function clearAiSuggestions(editor: Editor, source?: AiSuggestion['source']) {
  dispatch(editor, { type: 'clear', source })
}

/**
 * Puts the suggestions' words in place as one edit (one Ctrl+Z), the last one in the document first so the others'
 * positions still hold. All of them when no ids are given.
 */
export function acceptAiSuggestions(editor: Editor, ids?: string[]) {
  if (editor.isDestroyed) return
  const wanted = ids ? new Set(ids) : null
  const chosen = aiSuggestions(editor.state)
    .suggestions.filter((suggestion) => !wanted || wanted.has(suggestion.id))
    .sort((a, b) => b.from - a.from)
  if (chosen.length === 0) return
  let chain = editor.chain().focus()
  for (const suggestion of chosen) {
    const range = { from: suggestion.from, to: suggestion.to }
    const content = suggestion.shape === 'inline' ? inlineContent(suggestion.replacement) : textBlocks(suggestion.replacement)
    chain = content.length ? chain.insertContentAt(range, content) : chain.deleteRange(range)
  }
  chain
    .command(({ tr }) => {
      tr.setMeta(aiSuggestionsKey, { type: 'remove', ids: chosen.map((suggestion) => suggestion.id) } satisfies Action)
      return true
    })
    .run()
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag)
  element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

/** The suggested words as the sheet would print them: text runs and typeset formulas. */
function renderWords(target: HTMLElement, words: string) {
  for (const piece of splitText(words)) {
    if ('text' in piece) {
      let run: Node = document.createTextNode(piece.text)
      for (const mark of piece.marks ?? []) {
        const wrapper = document.createElement(mark === 'bold' ? 'strong' : 'u')
        wrapper.append(run)
        run = wrapper
      }
      target.append(run)
      continue
    }
    const formula = el('span', 'relative', piece.display ? `$$${piece.formula}$$` : `$${piece.formula}$`)
    target.append(formula)
    loadKatex().then(
      (katex) => katex.render(piece.formula, formula, { displayMode: piece.display, throwOnError: false, strict: 'ignore' }),
      () => undefined
    )
  }
}

function button(label: string, text: string, className: string, onPress: () => void) {
  const element = el('button', `ai-suggest-button ${className}`, text)
  element.type = 'button'
  element.setAttribute('aria-label', label)
  element.title = label
  // Pressing must not move the caret; the press itself does the work.
  element.addEventListener('mousedown', (event) => event.preventDefault())
  element.addEventListener('click', (event) => {
    event.preventDefault()
    onPress()
  })
  return element
}

function suggestionElement(editor: Editor, suggestion: AiSuggestion) {
  const blocks = suggestion.shape === 'blocks'
  const box = el(blocks ? 'div' : 'span', `ai-suggest-new${blocks ? ' ai-suggest-new--block' : ''}`)
  box.setAttribute('data-ai-suggestion', '')
  box.setAttribute('contenteditable', 'false')
  box.setAttribute('role', 'group')
  box.setAttribute('aria-label', suggestion.reason ? `Gợi ý của AI: ${suggestion.label ? `${suggestion.label}: ` : ''}${suggestion.reason}` : 'Gợi ý của AI')
  if (suggestion.reason) box.title = suggestion.label ? `${suggestion.label}: ${suggestion.reason}` : suggestion.reason
  const words = el(blocks ? 'div' : 'span', 'ai-suggest-words')
  if (suggestion.replacement) renderWords(words, suggestion.replacement)
  else words.append(el('em', 'ai-suggest-empty', '(xóa đoạn này)'))
  box.append(words)
  const actions = el('span', 'ai-suggest-actions')
  actions.append(
    button('Chấp nhận gợi ý của AI', '✓', 'ai-suggest-accept', () => acceptAiSuggestions(editor, [suggestion.id])),
    button('Bỏ gợi ý của AI', '✕', 'ai-suggest-reject', () => rejectAiSuggestions(editor, [suggestion.id]))
  )
  box.append(actions)
  return box
}

function pendingElement() {
  const label = el('span', 'ai-pending-label', 'AI đang sửa…')
  label.setAttribute('data-ai-suggestion', '')
  label.setAttribute('contenteditable', 'false')
  label.setAttribute('aria-live', 'polite')
  return label
}

export const AiSuggestions = Extension.create({
  name: 'aiSuggestions',
  addProseMirrorPlugins() {
    const { editor } = this
    return [
      new Plugin<AiSuggestionsState>({
        key: aiSuggestionsKey,
        state: { init: () => EMPTY, apply },
        props: {
          decorations(state) {
            const { pending, suggestions } = aiSuggestions(state)
            if (pending.length === 0 && suggestions.length === 0) return null
            const decorations: Decoration[] = []
            for (const range of pending) {
              decorations.push(
                Decoration.inline(range.from, range.to, { class: 'ai-pending' }),
                Decoration.widget(range.to, pendingElement, { key: `pending-${range.id}`, side: 1, ignoreSelection: true })
              )
            }
            for (const suggestion of suggestions) {
              decorations.push(
                Decoration.inline(suggestion.from, suggestion.to, { class: 'ai-suggest-old' }),
                Decoration.widget(suggestion.to, () => suggestionElement(editor, suggestion), {
                  key: suggestion.id,
                  side: 1,
                  ignoreSelection: true,
                  stopEvent: () => true,
                })
              )
            }
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
