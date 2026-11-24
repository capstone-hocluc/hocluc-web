import { createValueStore, useStoreValue } from '../../../lib/value-store'

const STORAGE_KEY = 'hocluc.quizEditor.layout'

/**
 * Where a quiz or exam editor opens: `workspace` takes the whole window in the frame of the AI assistant (header,
 * panels as cards on a grey canvas); `console` stays inside the console, its sidebar and header kept.
 */
export type EditorLayout = 'console' | 'workspace'

function remembered(): EditorLayout {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'console' ? 'console' : 'workspace'
  } catch {
    // Storage unavailable: the assistant's frame.
    return 'workspace'
  }
}

// One store for every editor and its loading placeholder, so a change shows in all of them at once.
const layoutStore = createValueStore<EditorLayout>(remembered())
const whole = (layout: EditorLayout) => layout

function setLayout(next: EditorLayout) {
  layoutStore.set(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not kept for the next visit; this visit still uses it.
  }
}

/** The layout the viewer chose for the editors, kept between visits. */
export function useEditorLayout() {
  return [useStoreValue(layoutStore, whole), setLayout] as const
}
