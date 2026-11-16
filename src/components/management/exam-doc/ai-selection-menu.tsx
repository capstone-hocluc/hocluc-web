import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import Button from '../../console/button'
import { Sparkles } from '../../console/icons'
import { cancelAiEdit, pendAiEdit, resolveAiEdit } from './nodes/ai-suggestions'
import { blockText, inlineText, sheetQuestions } from './doc-snapshot'

/** What the teacher selected: where, and its words (formulas as $…$) for the AI and as the sheet reads them. */
interface Selected {
  from: number
  to: number
  text: string
  left: number
  top: number
}

/** The selection's words: within one paragraph its runs side by side, across blocks one block a line. */
function selectedText(editor: Editor, from: number, to: number) {
  const { doc } = editor.state
  const $from = doc.resolve(from)
  if ($from.sameParent(doc.resolve(to)) && $from.parent.isTextblock) {
    // The selected part of one paragraph: its runs and formulas, read as the paragraph would be.
    return inlineText($from.parent.cut($from.parentOffset, $from.parentOffset + (to - from))).trim()
  }
  const parts: string[] = []
  doc.slice(from, to).content.forEach((node) => {
    parts.push(node.isTextblock ? inlineText(node) : blockText(node))
  })
  return parts.join('\n').trim()
}

/** The question around the selection (its passage, stem and options), so the rewrite still fits it. */
function contextOf(editor: Editor, from: number) {
  const question = sheetQuestions(editor.state.doc).find((entry) => from >= entry.from && from < entry.to)
  if (question) return [question.context, question.text].filter(Boolean).join('\n\n')
  return editor.state.doc.resolve(from).parent.textContent
}

/**
 * "Nhờ AI sửa" beside a selection on the sheet: the teacher says what to change and the selection stays marked while
 * the AI rewrites it, so they may go on editing elsewhere. The AI's words then show beside it as a suggestion to
 * accept (one edit Ctrl+Z takes back) or turn down.
 */
export default function AiSelectionMenu({
  editor,
  enabled,
  onRewrite,
  onError,
}: {
  editor: Editor | null
  enabled: boolean
  onRewrite: (request: { selection: string; context: string; instruction: string }) => Promise<string>
  onError: (message: string) => void
}) {
  const [selected, setSelected] = useState<Selected | null>(null)
  const [asking, setAsking] = useState(false)
  const [instruction, setInstruction] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editor || !enabled) return
    const update = () => {
      const { from, to, empty } = editor.state.selection
      if (empty || !editor.isEditable) {
        setSelected(null)
        setAsking(false)
        return
      }
      const text = selectedText(editor, from, to)
      if (!text) {
        setSelected(null)
        return
      }
      const end = editor.view.coordsAtPos(to)
      setSelected({ from, to, text, left: end.left, top: end.bottom + 6 })
    }
    const close = () => {
      setSelected(null)
      setAsking(false)
    }
    editor.on('selectionUpdate', update)
    const scroller = editor.view.dom.closest('main')
    scroller?.addEventListener('scroll', close, { passive: true })
    return () => {
      editor.off('selectionUpdate', update)
      scroller?.removeEventListener('scroll', close)
    }
  }, [editor, enabled])

  useEffect(() => {
    if (asking) input.current?.focus()
  }, [asking])

  if (!editor || !enabled || !selected) return null

  async function submit() {
    if (!editor || !selected || !instruction.trim()) return
    const { from, to, text } = selected
    const $from = editor.state.doc.resolve(from)
    const shape = $from.sameParent(editor.state.doc.resolve(to)) && $from.parent.isTextblock ? 'inline' : 'blocks'
    const request = { selection: text, context: contextOf(editor, from), instruction: instruction.trim() }
    const id = pendAiEdit(editor, from, to)
    if (!id) {
      onError('Đoạn này đang chờ hoặc đang có gợi ý của AI. Hãy xử lý gợi ý đó trước.')
      return
    }
    setSelected(null)
    setAsking(false)
    setInstruction('')
    // The marked piece stays marked; the caret leaves it so the teacher can go on writing elsewhere.
    editor.chain().focus().setTextSelection(to).run()
    try {
      const replacement = await onRewrite(request)
      if (!resolveAiEdit(editor, id, { replacement, shape })) {
        onError('Đoạn đã chọn vừa bị sửa nên chưa hiện gợi ý của AI. Hãy chọn lại và thử lại.')
      }
    } catch (error) {
      cancelAiEdit(editor, id)
      onError(error instanceof Error && error.message ? error.message : 'Trợ lý AI chưa sửa được đoạn này.')
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      setAsking(false)
      editor?.commands.focus()
    }
  }

  return createPortal(
    <div
      className="exam-doc-ui fixed z-50 flex items-center gap-1.5 rounded-lg border border-card-border bg-card-background p-1 shadow-lg"
      style={{ left: selected.left, top: selected.top }}
      // Pressing here must not move the caret off the selection.
      onMouseDown={(event) => {
        if (event.target !== input.current) event.preventDefault()
      }}
    >
      {asking ? (
        <>
          <input
            ref={input}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Sửa thế nào? Ví dụ: đổi số liệu"
            aria-label="Yêu cầu sửa đoạn đã chọn"
            className="h-8 w-64 rounded-md border border-input-border bg-transparent px-2 text-sm text-text-primary outline-none focus:border-input-primary-focus-border"
          />
          <Button size="sm" disabled={!instruction.trim()} onClick={() => void submit()}>
            Sửa
          </Button>
        </>
      ) : (
        <Button size="sm" appearance="ghost" onClick={() => setAsking(true)}>
          <Sparkles size={15} aria-hidden />
          Nhờ AI sửa
        </Button>
      )}
    </div>,
    document.body
  )
}
