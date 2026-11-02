import type { Editor } from '@tiptap/react'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { chartAlt, chartImageSrc } from './chart-svg'

/**
 * Draws the document's AI charts again from the chart data the draft keeps, so a document saved with an older
 * drawing (labels running into each other) shows the current one. A chart is found by its alt text, which names its
 * kind and title; one the teacher replaced or whose question is gone is left as it is. Not an edit: the caret stays
 * and Ctrl+Z does not undo it.
 */
export function refreshChartImages(editor: Editor, paper: ExamPaper): boolean {
  const fresh = new Map<string, string>()
  for (const group of paper.groups) if (group.chart) fresh.set(chartAlt(group.chart), chartImageSrc(group.chart))
  for (const question of paper.questions) if (question.chart) fresh.set(chartAlt(question.chart), chartImageSrc(question.chart))
  if (fresh.size === 0) return false

  const { state } = editor
  const tr = state.tr
  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return
    const src = String(node.attrs.src ?? '')
    const current = fresh.get(String(node.attrs.alt ?? ''))
    if (!current || src === current || !src.startsWith('data:image/svg+xml')) return
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: current })
  })
  if (!tr.docChanged) return false
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  return true
}
