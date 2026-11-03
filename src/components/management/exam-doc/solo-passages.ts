import type { Editor } from '@tiptap/react'
import { isSoloGroup, type ExamPaper } from '../ai-assistant/exam-format'
import { questionsToBlocks } from './draft-to-doc'
import { findTagged } from './exam-tags'

/**
 * Exams written before a question's own passage was printed hold such a question without it (a bank question's
 * reading text, function or rules). When the exam opens, the passage goes back just above the question's line, led
 * like any passage. A question the teacher deleted stays deleted. Not an edit: the caret stays and Ctrl+Z does not
 * undo it; the document saves it like an edit, once. Returns whether the document changed.
 */
export function restoreSoloPassages(editor: Editor, paper: ExamPaper): boolean {
  const tr = editor.state.tr
  for (const question of paper.questions) {
    if (!question.groupId || !isSoloGroup(question.groupId)) continue
    if (findTagged(tr.doc, 'examGroup', question.groupId) !== null) continue
    const at = findTagged(tr.doc, 'examItem', question.id)
    if (at === null) continue
    // The question's blocks open with its passage; everything before its own "Câu n." line is that passage.
    const blocks = questionsToBlocks(paper, [question], { complete: true })
    const line = blocks.findIndex((block) => block.attrs?.examItem === question.id)
    if (line <= 0) continue
    tr.insert(at, blocks.slice(0, line).map((block) => editor.schema.nodeFromJSON(block)))
  }
  if (!tr.docChanged) return false
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  return true
}
