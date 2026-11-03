import type { Editor } from '@tiptap/react'
import type { AiChart } from '../../../services/aiAssistantService'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { aiChartToValue, chartWidth, SHEET_TEXT_WIDTH_PX } from './chart-data'
import { chartAlt } from './chart-svg'

/**
 * Documents saved before charts could be edited hold each AI chart as a picture: an SVG drawing whose alt text names
 * the chart's kind and title. When the exam opens, such a picture becomes a chart node with the chart data the draft
 * keeps, so it is drawn as charts are now and can be edited. A picture the teacher replaced, or whose question is
 * gone, stays a picture; a chart node is never touched (it may hold the teacher's edits). Not an edit: the caret
 * stays and Ctrl+Z does not undo it.
 */
export function refreshChartImages(editor: Editor, paper: ExamPaper): boolean {
  const charts = new Map<string, AiChart>()
  for (const group of paper.groups) if (group.chart) charts.set(chartAlt(group.chart), group.chart)
  for (const question of paper.questions) if (question.chart) charts.set(chartAlt(question.chart), question.chart)
  const chartType = editor.schema.nodes.chart
  if (charts.size === 0 || !chartType) return false

  const { state } = editor
  const tr = state.tr
  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return
    const chart = charts.get(String(node.attrs.alt ?? ''))
    if (!chart || !String(node.attrs.src ?? '').startsWith('data:image/svg+xml')) return
    // A picture given a width keeps it, as a share of the text width.
    const width = Number(node.attrs.width) > 0 ? chartWidth(Number(node.attrs.width) / SHEET_TEXT_WIDTH_PX) : undefined
    const at = tr.mapping.map(pos)
    tr.replaceWith(at, at + node.nodeSize, chartType.create(aiChartToValue(chart, width)))
  })
  if (!tr.docChanged) return false
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  return true
}
