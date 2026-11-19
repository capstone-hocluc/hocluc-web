import type { Editor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/** Headings are levels 1-3; question lines ("Câu 1. …") are level 4. */
export type OutlineLevel = 1 | 2 | 3 | 4

export interface OutlineItem {
  id: string
  level: OutlineLevel
  text: string
  /** Position just before the block in the document. */
  pos: number
}

export interface DocTextStats {
  words: number
  characters: number
}

/** "Câu 12", "câu 3:", "CÂU 1." - checked on NFC text, since pasted Vietnamese can be decomposed. */
const QUESTION_LINE = /^câu\s+\d+/iu
const QUESTION_HEAD = /^\s*c/iu

// Documents are immutable, so a result per document instance is safe to reuse; selection-only
// transactions then cost a map lookup.
const outlineCache = new WeakMap<ProseMirrorNode, OutlineItem[]>()
const statsCache = new WeakMap<ProseMirrorNode, DocTextStats>()

function blockText(node: ProseMirrorNode): string {
  return node.textContent.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/**
 * Headings (1-3) and question lines, in document order. Tables and the answer guide are skipped (answer keys repeat
 * "Câu n").
 */
export function outlineOf(doc: ProseMirrorNode): OutlineItem[] {
  const cached = outlineCache.get(doc)
  if (cached) return cached

  const items: OutlineItem[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'table') return false
    if (!node.isTextblock) return true

    if (node.type.name === 'heading') {
      const level = Number(node.attrs.level)
      const text = blockText(node)
      if (text && level >= 1 && level <= 3) {
        items.push({ id: `outline-${items.length}`, level: level as OutlineLevel, text, pos })
      }
    } else if (node.type.name === 'paragraph' && !node.attrs.examKey) {
      // The answer guide's "Câu n. Chọn A." lines name questions already listed; they are no questions.
      const head = node.firstChild?.isText ? (node.firstChild.text ?? '') : ''
      if (QUESTION_HEAD.test(head)) {
        const text = blockText(node)
        if (QUESTION_LINE.test(text))
          items.push({ id: `outline-${items.length}`, level: 4, text, pos })
      }
    }
    return false
  })

  outlineCache.set(doc, items)
  return items
}

/** The outline item the caret is in: the last one starting before it, or -1. */
export function activeOutlineIndex(items: OutlineItem[], selectionFrom: number): number {
  let active = -1
  for (let index = 0; index < items.length && items[index].pos < selectionFrom; index += 1) {
    active = index
  }
  return active
}

/**
 * Words and characters of the document. Blocks are joined with a line break (and formulas, images
 * with a space) so words never run together across paragraphs, which `doc.textContent` would do.
 */
export function docTextStats(doc: ProseMirrorNode): DocTextStats {
  const cached = statsCache.get(doc)
  if (cached) return cached

  const text = doc.textBetween(0, doc.content.size, '\n', ' ')
  const words = text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
  const characters = Array.from(doc.textContent).length
  const stats = { words, characters }
  statsCache.set(doc, stats)
  return stats
}

/** Puts the caret at the start of the block at `pos` and scrolls the sheet so the block is in view. */
export function scrollToPos(editor: Editor, pos: number) {
  if (editor.isDestroyed) return
  const size = editor.state.doc.content.size
  const target = Math.max(0, Math.min(pos, size))

  editor
    .chain()
    .focus(Math.min(target + 1, size), { scrollIntoView: false })
    .run()

  const dom = editor.view.nodeDOM(target)
  if (!(dom instanceof HTMLElement)) return
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  dom.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
}
