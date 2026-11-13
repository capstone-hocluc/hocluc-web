import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { questionInsertPos } from '../exam-tags'
import type { LiveDraftView } from '../live-draft'

/** What the sheet shows of the unit being written: its part and the words so far; null shows nothing. */
export interface LiveDraftShown {
  partId: string
  view: LiveDraftView
  /** The line above the words; "Trợ lý AI đang viết…" when not given. */
  label?: string
  /** The printed number of each question, when it is known (a paper being read); "…" otherwise. */
  numbers?: number[]
}

interface LiveDraft {
  shown: LiveDraftShown | null
  key: string
  set: DecorationSet | null
}

const NOTHING: LiveDraft = { shown: null, key: '', set: null }

/** Set with a transaction meta: what to show (`LiveDraftShown`), or null to show nothing. */
export const liveDraftKey = new PluginKey<LiveDraft>('examLiveDraft')

function text(tag: string, className: string, content: string) {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = content
  return element
}

function draftElement({ view, label = 'Trợ lý AI đang viết…', numbers }: LiveDraftShown) {
  const box = document.createElement('div')
  box.setAttribute('data-live-draft', '')
  box.setAttribute('contenteditable', 'false')
  box.setAttribute('aria-live', 'polite')
  box.className =
    'my-2 select-none rounded-md border border-dashed border-primary-text/35 bg-badge-primary-background/40 px-3 py-2 text-text-secondary'
  box.append(text('p', 'mb-1 text-[0.85em] font-semibold italic text-primary-text', label))
  if (view.passage) box.append(text('p', 'mb-1 whitespace-pre-line', view.passage))
  view.questions.forEach((question, index) => {
    const stem = text('p', 'mb-0.5', '')
    stem.append(text('strong', '', numbers?.[index] !== undefined ? `Câu ${numbers[index]}. ` : 'Câu … '), document.createTextNode(question.stem))
    box.append(stem)
    question.options.forEach((option, at) => {
      const line = text('p', 'mb-0.5 pl-4', '')
      line.append(text('strong', '', `${String.fromCharCode(65 + at)}. `), document.createTextNode(option))
      box.append(line)
    })
    if (index === view.questions.length - 1) {
      const caret = text('span', 'ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-primary-text motion-safe:animate-pulse', '')
      ;(box.lastElementChild ?? box).append(caret)
    }
  })
  if (view.questions.length === 0 && !view.passage) {
    box.append(text('span', 'inline-block h-[1em] w-[2px] bg-primary-text motion-safe:animate-pulse', ''))
  }
  return box
}

/**
 * Shows the words of the question the AI is writing where it will land in the document (under its part, before the
 * end line), as a decoration: it is not part of the document, so it is never saved, never undone, and the caret
 * cannot enter it. The page sets it with a transaction meta on {@link liveDraftKey}.
 */
export const LiveDraftWidget = Extension.create({
  name: 'examLiveDraft',
  addProseMirrorPlugins() {
    // Each new set of words gets a new key, so the widget is drawn again for it. Through any other transaction (the
    // page breaks, the caret, a question landing) it keeps its key and so its drawing; only its place is found again.
    let drawn = 0
    const place = (doc: ProseMirrorNode, shown: LiveDraftShown, key: string): LiveDraft => ({
      shown,
      key,
      set: DecorationSet.create(doc, [
        Decoration.widget(questionInsertPos(doc, shown.partId), () => draftElement(shown), {
          side: -1,
          ignoreSelection: true,
          key,
        }),
      ]),
    })
    return [
      new Plugin<LiveDraft>({
        key: liveDraftKey,
        state: {
          init: () => NOTHING,
          apply: (tr, previous) => {
            const next = tr.getMeta(liveDraftKey) as LiveDraftShown | null | undefined
            if (next !== undefined) return next ? place(tr.doc, next, `live-draft-${(drawn += 1)}`) : NOTHING
            if (!previous.shown || !tr.docChanged) return previous
            // A question landing in the part moves where the words go.
            return place(tr.doc, previous.shown, previous.key)
          },
        },
        props: {
          decorations: (state) => liveDraftKey.getState(state)?.set ?? null,
        },
      }),
    ]
  },
})
