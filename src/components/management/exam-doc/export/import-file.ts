import type { Editor, JSONContent } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Selection } from '@tiptap/pm/state'
import { showErrorToast } from '../../../../lib/toastBus'
import { inlineContent } from '../draft-to-doc'
import { confirmReplace } from './confirm-replace'
import { parseExamHtml } from './exam-html'
import { DOC_FORMAT } from './export-text'

export type ImportKind = 'docx' | 'markdown' | 'json' | 'text'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const BYTE_ORDER_MARK = new RegExp(`^${String.fromCharCode(0xfeff)}`)

export function importKind(fileName: string): ImportKind | null {
  const extension = /\.([^.]+)$/.exec(fileName.toLowerCase())?.[1]
  if (extension === 'docx') return 'docx'
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (extension === 'json') return 'json'
  if (extension === 'txt') return 'text'
  return null
}

class ImportError extends Error {}

/** Our export's envelope, or a bare Tiptap document, checked against the editor's schema. */
function jsonDocument(editor: Editor, text: string): ProseMirrorNode {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('Tệp JSON không hợp lệ')
  }
  const envelope = data as { format?: unknown; content?: unknown } | null
  const content = (envelope?.format === DOC_FORMAT ? envelope.content : data) as JSONContent | null
  if (content?.type !== 'doc') throw new ImportError('Tệp JSON không phải đề thi')
  try {
    const doc = editor.schema.nodeFromJSON(content)
    // nodeFromJSON builds the nodes; check() holds them to the schema's content rules.
    doc.check()
    return doc
  } catch {
    throw new ImportError('Tệp JSON có nội dung đề không đọc được')
  }
}

/** A line per paragraph; `$…$` formulas become formulas, as in the AI drafts. */
function textDocument(editor: Editor, text: string): ProseMirrorNode {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
  const content = lines.map((line) => {
    const inline = inlineContent(line)
    return inline.length ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
  })
  return editor.schema.nodeFromJSON({ type: 'doc', content })
}

async function readDocument(editor: Editor, file: File, kind: ImportKind): Promise<ProseMirrorNode> {
  if (kind === 'docx') {
    const { docxToElement } = await import('./import-docx')
    return parseExamHtml(editor.schema, await docxToElement(await file.arrayBuffer()))
  }
  const text = (await file.text()).replace(BYTE_ORDER_MARK, '')
  if (kind === 'json') return jsonDocument(editor, text)
  if (kind === 'text') return textDocument(editor, text)
  const { markdownToElement } = await import('./import-markdown')
  return parseExamHtml(editor.schema, markdownToElement(text))
}

function isBlank(doc: ProseMirrorNode): boolean {
  return doc.childCount === 0 || (doc.childCount === 1 && doc.firstChild?.isTextblock === true && doc.firstChild.content.size === 0)
}

/**
 * Opens a .docx, .md, .json or .txt file in place of the document, after asking when the document has content.
 * The replacement is one step of the editor's history, so Ctrl+Z brings the previous document back.
 */
export async function importDocumentFile(editor: Editor, file: File) {
  const kind = importKind(file.name)
  if (!kind) {
    showErrorToast('Chỉ mở được tệp Word (.docx), Markdown (.md), JSON (.json) hoặc văn bản (.txt)')
    return
  }
  if (file.size > MAX_IMPORT_BYTES) {
    showErrorToast('Tệp lớn hơn 10 MB')
    return
  }
  let doc: ProseMirrorNode
  try {
    doc = await readDocument(editor, file, kind)
  } catch (error) {
    showErrorToast(error instanceof ImportError ? error.message : 'Không đọc được tệp này')
    return
  }
  if (isBlank(doc)) {
    showErrorToast('Tệp không có nội dung')
    return
  }
  if (editor.isDestroyed || !editor.isEditable) return
  // The menu handed focus back to its trigger; the dialog returns focus to where it was opened from, so the
  // editor takes it first, and Ctrl+Z right after the import undoes it.
  editor.commands.focus(null, { scrollIntoView: false })
  if (!editor.isEmpty && !(await confirmReplace(file.name))) return
  if (editor.isDestroyed) return
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.replaceWith(0, tr.doc.content.size, doc.content)
      tr.setSelection(Selection.atStart(tr.doc))
      return true
    })
    .scrollIntoView()
    .run()
}
