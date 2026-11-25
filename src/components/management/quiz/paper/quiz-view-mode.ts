import { useState } from 'react'

const STORAGE_KEY = 'hocluc.quizView.mode'

/** How a quiz's questions are read: on A4 sheets as they print, or as a dense list with each answer beside its question. */
export type QuizViewMode = 'paper' | 'list'

function remembered(): QuizViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'paper'
  } catch {
    // Storage unavailable: the sheets.
    return 'paper'
  }
}

/** The way the viewer last chose to read a quiz, kept between visits. */
export function useQuizViewMode() {
  const [mode, setMode] = useState<QuizViewMode>(remembered)
  const choose = (next: QuizViewMode) => {
    setMode(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not kept for the next visit; this visit still uses it.
    }
  }
  return [mode, choose] as const
}
