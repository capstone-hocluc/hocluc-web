import type { AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import { Boxed, Indent, LineSpacing, MathNode, PageBreak, ParagraphStyles, type MathOptions } from './extensions'
import { ExamTags } from './exam-tags'
import { LiveDraftWidget } from './nodes/live-draft-widget'
import { AiSuggestions } from './nodes/ai-suggestions'
import { EXAM_NODES } from './nodes'
import { ExamPagination } from './pagination'

export interface ExamDocExtensionOptions {
  /** Opens the formula at `pos` for editing. Must be stable: it is fixed into the editor when the editor is built. */
  onEditFormula: MathOptions['onEdit']
  /** Page count of the A4 print layout, reported when it changes. Must be stable, like `onEditFormula`. */
  onPages: (pages: number) => void
}

/**
 * The nodes, marks and helpers of an exam document. The document editor and the read-only editor that shows an exam
 * variant are both built from this list, so a variant always holds and shows whatever the document can.
 */
export function examDocExtensions({ onEditFormula, onPages }: ExamDocExtensionOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      code: false,
      codeBlock: false,
      blockquote: false,
      link: { openOnClick: false, autolink: true },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'justify' }),
    TextStyleKit,
    Subscript,
    Superscript,
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: true }),
    // Shown only while the editor is editable (the extension's default), so never on a read-only variant.
    Placeholder.configure({ placeholder: 'Bắt đầu soạn đề…' }),
    Indent,
    LineSpacing,
    ParagraphStyles,
    Boxed,
    PageBreak,
    MathNode.configure({ onEdit: onEditFormula }),
    ExamTags,
    LiveDraftWidget,
    AiSuggestions,
    ExamPagination.configure({ onPages }),
    ...EXAM_NODES,
  ]
}
