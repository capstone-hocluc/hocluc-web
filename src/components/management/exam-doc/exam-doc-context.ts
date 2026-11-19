import { createContext, useContext } from 'react'
import type { Editor } from '@tiptap/react'

export type DocMode = 'STRUCTURED' | 'FREE'
/**
 * - `saved`: the server holds what is on the sheet; `saving`: a save is waiting or on its way;
 * - `unsaved`: a new exam with edits whose conversation is still being created;
 * - `error`: the last save failed (`saveError` says why; network/server errors are retried by themselves);
 * - `conflict`: another tab saved a newer version - the sheet is read-only until the user picks one (see `conflict`).
 */
export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict'

/** What the editor chrome (header, menubar, toolbar, side panels, status bar) shares about the open document. */
export interface ExamDocContextValue {
  /** The editor on the sheet; a read-only one for a loaded paper, so controls that check `isEditable` turn off. Null until mounted. */
  editor: Editor | null
  mode: DocMode
  setMode: (mode: DocMode) => void
  saveState: SaveState
  /** Why the last save failed, in Vietnamese, when `saveState` is `error`. */
  saveError: string | null
  /** True while the document of the open exam is being read (the sheet shows a skeleton, the editor is not ready). */
  loading: boolean
  /** Sheet scale, 0.5..2. */
  zoom: number
  setZoom: (zoom: number) => void
  showRuler: boolean
  setShowRuler: (show: boolean) => void
  /** Opens the formula dialog; on save the formula is inserted at the selection. */
  openFormula: (kind: 'math' | 'chem') => void
  /** Page count from the paginated sheet (1 before it is measured). */
  pages: number
}

export const ExamDocContext = createContext<ExamDocContextValue | null>(null)

export function useExamDoc(): ExamDocContextValue {
  const value = useContext(ExamDocContext)
  if (!value) throw new Error('useExamDoc must be used inside ExamDocContext')
  return value
}

export const ZOOM_LEVELS = [0.5, 0.75, 0.9, 1, 1.25, 1.5, 2] as const
export const FONT_FAMILIES = ['Times New Roman', 'Arial', 'Cambria', 'Calibri'] as const
export const LINE_HEIGHTS = ['1.0', '1.15', '1.5', '2.0'] as const
export const DEFAULT_FONT_SIZE_PT = 11.5

