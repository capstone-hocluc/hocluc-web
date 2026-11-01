import type { AnyExtension } from '@tiptap/core'
import { ChoiceCell, ChoiceGrid } from './choice-grid'
import { ExamHeader, HeaderColumn } from './exam-header'
import { SnippetDrop } from './snippet-drop'

/** Exam-specific nodes (choice grid, exam header…) the editor registers after its base extensions. */
export const EXAM_NODES: AnyExtension[] = [ChoiceGrid, ChoiceCell, ExamHeader, HeaderColumn, SnippetDrop]
