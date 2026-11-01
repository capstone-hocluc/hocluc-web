import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { END_LINE, TAIL_HEADING } from './variants/parse-exam'

/**
 * Ties blocks of the free document to the AI draft they came from, so later AI questions can be placed under their
 * own part, a shared passage is written once, and "Xem trong đề" finds a question:
 * - a part heading carries `examPart` (draft part id);
 * - a passage's lead line carries `examGroup` (draft group id);
 * - a question's "Câu n." line carries `examItem` (draft item id).
 * The document itself keeps `deliveredItems`: every draft item ever written into it. A question the teacher deleted
 * stays in that list, so it is not written back; one that arrived while the document was closed is not in it yet.
 */
export const ExamTags = Extension.create({
  name: 'examTags',
  addGlobalAttributes() {
    const tag = (name: string, attribute: string) => ({
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute(attribute),
      renderHTML: (attributes: Record<string, unknown>) =>
        attributes[name] ? { [attribute]: String(attributes[name]) } : {},
    })
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          examPart: tag('examPart', 'data-exam-part'),
          examGroup: tag('examGroup', 'data-exam-group'),
          examItem: tag('examItem', 'data-exam-item'),
        },
      },
      {
        types: ['doc'],
        attributes: {
          // Never rendered: it only travels in the saved JSON.
          deliveredItems: { default: null, rendered: false },
        },
      },
    ]
  },
})

/** The draft items already written into the document; null for a document made before items were tracked. */
export function deliveredItems(doc: ProseMirrorNode): Set<string> | null {
  const value = doc.attrs.deliveredItems as unknown
  return Array.isArray(value) ? new Set(value.filter((id): id is string => typeof id === 'string')) : null
}

/** The first block after the questions: the "--- HẾT ---" line, or an answer key / marking scheme heading. */
function endsQuestions(node: ProseMirrorNode) {
  const text = node.textContent.trim()
  if (node.type.name === 'heading') return END_LINE.test(text) || TAIL_HEADING.test(text)
  return node.type.name === 'paragraph' && END_LINE.test(text)
}

/**
 * Where a new draft question of `partId` goes: after the last block of its part (before the next heading at the same
 * or a higher level, or the next part), and never after the end of the questions. A part the document has no heading
 * for gets its questions just before that end.
 */
export function questionInsertPos(doc: ProseMirrorNode, partId: string): number {
  const blocks: Array<{ node: ProseMirrorNode; pos: number }> = []
  doc.forEach((node, pos) => blocks.push({ node, pos }))
  const end = blocks.findIndex(({ node }) => endsQuestions(node))
  const stop = end === -1 ? blocks.length : end
  const at = (index: number) => (index < blocks.length ? blocks[index].pos : doc.content.size)
  const part = blocks.findIndex(({ node }) => node.attrs.examPart === partId)
  if (part === -1 || part >= stop) return at(stop)
  const level = Number(blocks[part].node.attrs.level ?? 2)
  for (let index = part + 1; index < stop; index++) {
    const { node } = blocks[index]
    if (node.type.name === 'heading' && (Number(node.attrs.level ?? 2) <= level || node.attrs.examPart)) return at(index)
  }
  return at(stop)
}

/** Position of the top-level block tagged with `attr` = `value`, or null. */
export function findTagged(doc: ProseMirrorNode, attr: 'examPart' | 'examGroup' | 'examItem', value: string): number | null {
  let found: number | null = null
  doc.forEach((node, offset) => {
    if (found === null && node.attrs[attr] === value) found = offset
  })
  return found
}
