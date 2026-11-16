import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import Button from '../../console/button'
import { scrollToPos } from './doc-outline'
import { acceptAiSuggestions, aiSuggestions, rejectAiSuggestions } from './nodes/ai-suggestions'
import type { useProofread } from './use-proofread'

export default function AiSuggestionBar({ editor, proofread }: { editor: Editor | null; proofread: ReturnType<typeof useProofread> }) {
  const [, refresh] = useState(0)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!editor) return
    const update = () => refresh((n) => n + 1)
    editor.on('transaction', update)
    return () => { editor.off('transaction', update) }
  }, [editor])
  if (!editor || !proofread.started) return null
  const suggestions = aiSuggestions(editor.state).suggestions.filter((suggestion) => suggestion.source === 'proofread').sort((a, b) => a.from - b.from)
  if (!proofread.running && proofread.added > 0 && !suggestions.length && !proofread.notLocated && !proofread.notChecked) return null
  const ids = suggestions.map((suggestion) => suggestion.id)
  const jump = (direction: number) => {
    if (!suggestions.length) return
    const next = (index + direction + suggestions.length) % suggestions.length
    setIndex(next)
    scrollToPos(editor, suggestions[next].from)
  }
  return <div className="flex flex-wrap items-center gap-2 border-b border-card-border bg-card-background px-3 py-1 text-sm">
    <span aria-live="polite">{proofread.running ? `Đang soát ${proofread.completed}/${proofread.total} phần…` : proofread.added === 0 && proofread.notChecked === 0 && proofread.notLocated === 0 ? 'AI không thấy lỗi nào' : 'Đã soát đề'}</span>
    <span>{suggestions.length} gợi ý</span>
    {proofread.notLocated > 0 && <span>{proofread.notLocated} không định vị được</span>}
    {proofread.notChecked > 0 && <span>{proofread.notChecked} không soát được</span>}
    <Button size="sm" appearance="ghost" aria-label="Gợi ý trước" disabled={!suggestions.length} onClick={() => jump(-1)}>←</Button>
    <Button size="sm" appearance="ghost" aria-label="Gợi ý tiếp theo" disabled={!suggestions.length} onClick={() => jump(1)}>→</Button>
    <Button size="sm" appearance="outline" disabled={!suggestions.length} onClick={() => acceptAiSuggestions(editor, ids)}>Chấp nhận tất cả</Button>
    <Button size="sm" appearance="outline" disabled={!suggestions.length} onClick={() => rejectAiSuggestions(editor, ids)}>Bỏ tất cả</Button>
    {proofread.running ? <Button size="sm" appearance="outline" onClick={proofread.stop}>Dừng</Button> : <Button size="sm" appearance="ghost" aria-label="Đóng thanh soát đề" onClick={proofread.close}>✕</Button>}
  </div>
}
