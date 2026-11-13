import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ApiError } from '../../../lib/api'
import { proofreadAiSheet, type ProofreadKind } from '../../../services/aiAssistantService'
import { addAiSuggestions, clearAiSuggestions } from './nodes/ai-suggestions'
import { locate, packUnits, sheetUnits } from './proofread-units'

const labels: Record<ProofreadKind, string> = { SPELLING: 'Chính tả', MATH: 'Công thức', OPTION: 'Phương án', WORDING: 'Diễn đạt', CONSISTENCY: 'Số liệu' }
const initial = { running: false, started: false, completed: 0, total: 0, added: 0, notLocated: 0, notChecked: 0 }

export function useProofread(editor: Editor | null, ensureConversation: () => Promise<string>, onError: (message: string) => void) {
  const [state, setState] = useState(initial)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => { active.current?.abort() }, [editor])
  const stop = useCallback(() => active.current?.abort(), [])
  const close = useCallback(() => { if (!active.current) setState(initial) }, [])
  const start = useCallback(async () => {
    if (!editor || editor.isDestroyed || active.current) return
    const controller = new AbortController()
    active.current = controller
    clearAiSuggestions(editor, 'proofread')
    const { batches, skipped } = packUnits(sheetUnits(editor.state.doc))
    setState({ ...initial, started: true, running: true, total: batches.length, notChecked: skipped })
    try {
      const conversation = await ensureConversation()
      let next = 0
      let checkedUnits = 0
      let reportedError = false
      const worker = async () => {
        while (!controller.signal.aborted && next < batches.length) {
          const batch = batches[next++]
          try {
            const input = batch.map(({ ref, kind, text, context }) => ({ ref, kind, text, ...(context ? { context } : {}) }))
            let suggestions
            try { suggestions = await proofreadAiSheet(conversation, input, controller.signal) }
            catch (error) {
              if (!(error instanceof ApiError) || error.status !== 429 || controller.signal.aborted) throw error
              await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(resolve, 3000)
                controller.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
              })
              suggestions = await proofreadAiSheet(conversation, input, controller.signal)
            }
            if (controller.signal.aborted || editor.isDestroyed) return
            let missing = 0
            const mapped = suggestions.flatMap((suggestion) => {
              const unit = batch.find((item) => item.ref === suggestion.ref)
              const range = unit && locate(editor.state.doc, unit, suggestion.find)
              if (!range) { missing++; return [] }
              return [{ ...range, replacement: suggestion.replace, shape: 'inline' as const, source: 'proofread' as const, reason: suggestion.reason, label: labels[suggestion.kind] }]
            })
            const added = addAiSuggestions(editor, mapped)
            checkedUnits += batch.length
            setState((s) => ({ ...s, completed: s.completed + 1, added: s.added + added, notLocated: s.notLocated + missing + mapped.length - added }))
          } catch (error) {
            if (!controller.signal.aborted) {
              if (!reportedError) {
                reportedError = true
                onError(error instanceof Error ? error.message : 'Không thể soát đề.')
              }
              checkedUnits += batch.length
              setState((s) => ({ ...s, completed: s.completed + 1, notChecked: s.notChecked + batch.length }))
            }
          }
        }
      }
      await Promise.all([worker(), worker()])
      if (controller.signal.aborted) setState((s) => ({ ...s, notChecked: s.notChecked + batches.flat().length - checkedUnits }))
    } catch (error) {
      if (!controller.signal.aborted) {
        setState((s) => ({ ...s, notChecked: s.notChecked + batches.flat().length }))
        onError(error instanceof Error ? error.message : 'Không thể soát đề.')
      }
    } finally {
      if (active.current === controller) { active.current = null; setState((s) => ({ ...s, running: false })) }
    }
  }, [editor, ensureConversation, onError])
  return { ...state, start, stop, close }
}
