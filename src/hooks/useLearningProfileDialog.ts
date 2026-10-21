import { createContext, useContext } from 'react'

export const LearningProfileDialogContext = createContext<(() => void) | null>(null)

export function useLearningProfileDialog() {
  const open = useContext(LearningProfileDialogContext)
  if (!open) throw new Error('Learning profile dialog requires the student shell')
  return open
}
