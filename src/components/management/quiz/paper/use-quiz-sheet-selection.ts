import { useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { END_LINE } from '../../exam-doc/exam-lines'

const selection = new PluginKey<string | null>('quizSheetSelection')

export function paperQuestionId(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest('[data-quiz-question]')?.getAttribute('data-quiz-question')
    : null
}

export function useQuizSheetSelection(editor: Editor | null, enabled: boolean, selectedId: string | null) {
  useEffect(() => {
    if (!editor || !enabled) return
    editor.registerPlugin(new Plugin({
      key: selection,
      state: {
        init: () => null,
        apply: (transaction, active) => {
          const next = transaction.getMeta(selection)
          return next === undefined ? active : next
        },
      },
      props: {
        decorations(state) {
          const selected = selection.getState(state)
          const decorations: Decoration[] = []
          let questionId: string | null = null
          state.doc.forEach((block, offset) => {
            const anchor = block.attrs.examItem as string | null | undefined
            if (block.type.name === 'heading' || block.attrs.examGroup || END_LINE.test(block.textContent)) questionId = null
            if (anchor) questionId = anchor
            if (!questionId) return

            const active = questionId === selected
            const attrs: Record<string, string> = { 'data-quiz-question': questionId }
            if (active) attrs['data-quiz-selected'] = ''
            if (anchor) {
              attrs.role = 'button'
              attrs.tabindex = '0'
              if (active) attrs['aria-current'] = 'true'
            }
            decorations.push(Decoration.node(offset, offset + block.nodeSize, attrs))
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    }))
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(selection)
    }
  }, [editor, enabled])

  useEffect(() => {
    if (!editor || !enabled) return
    editor.view.dispatch(editor.state.tr.setMeta(selection, selectedId))
    if (selectedId) {
      editor.view.dom.querySelector('[data-exam-item][data-quiz-selected]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [editor, enabled, selectedId])
}
