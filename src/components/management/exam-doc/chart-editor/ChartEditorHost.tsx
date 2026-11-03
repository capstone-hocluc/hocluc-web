import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Transaction } from '@tiptap/pm/state'
import { sameChart, type ChartValue } from '../chart-data'
import { chartValueOf, onChartEdit } from '../nodes/chart'
import ChartEditorDialog from './ChartEditorDialog'

interface Editing {
  editor: Editor
  value: ChartValue
}

/**
 * The chart editor of the document on the sheet. A chart asks for it (its button, a double click, Enter) through
 * `openChartEditor`. "Lưu" writes the chart back as one undo step wherever it is by then: the AI may write questions
 * in while the dialog is open. Either way the document gets focus back with the chart selected, so Ctrl+Z works.
 */
export default function ChartEditorHost({ editor }: { editor: Editor | null }) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const open = useRef(false)
  // The chart's position, mapped through every change of the document while the dialog is open; null once it is gone.
  const position = useRef<number | null>(null)

  useEffect(() => {
    if (!editor) return
    const stopListening = onChartEdit(editor, (pos) => {
      if (open.current || editor.isDestroyed || !editor.isEditable) return
      const node = editor.state.doc.nodeAt(pos)
      if (node?.type.name !== 'chart') return
      open.current = true
      position.current = pos
      setEditing({ editor, value: chartValueOf(node) })
    })
    const follow = ({ transaction }: { transaction: Transaction }) => {
      if (!open.current || position.current === null || !transaction.docChanged) return
      const mapped = transaction.mapping.mapResult(position.current, 1)
      position.current = mapped.deleted ? null : mapped.pos
    }
    editor.on('transaction', follow)
    return () => {
      stopListening()
      editor.off('transaction', follow)
      open.current = false
      position.current = null
    }
  }, [editor])

  function close(): number | null {
    const at = position.current
    open.current = false
    position.current = null
    setEditing(null)
    return at
  }

  /** The chart at `at`, if it is still there. */
  const chartAt = (at: number | null) =>
    editor && at !== null && editor.state.doc.nodeAt(at)?.type.name === 'chart' ? editor.state.doc.nodeAt(at) : null

  function cancel() {
    const at = close()
    if (!editor || editor.isDestroyed) return
    // Tiptap focuses on the next frame, once the dialog has let go of focus.
    if (chartAt(at) && at !== null) editor.chain().setNodeSelection(at).focus().run()
    else editor.commands.focus()
  }

  function save(value: ChartValue) {
    const at = close()
    if (!editor || editor.isDestroyed || !editor.isEditable) return
    const node = chartAt(at)
    if (node && at !== null) {
      const chain = editor.chain()
      if (sameChart(chartValueOf(node), value)) chain.setNodeSelection(at)
      else chain.updateChart(at, value)
      chain.focus().run()
    } else {
      // The chart went away while the dialog was open; the edited one is not lost.
      editor.chain().insertChart(value).focus().run()
    }
  }

  if (!editing || editing.editor !== editor) return null
  return <ChartEditorDialog initial={editing.value} onCancel={cancel} onSave={save} />
}
