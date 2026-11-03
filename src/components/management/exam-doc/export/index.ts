import { useSyncExternalStore } from 'react'
import type { Editor } from '@tiptap/core'
import { showErrorToast } from '../../../../lib/toastBus'
import type { VariantDoc } from '../variants/build-variants'
import type { FormulaReport } from './docx-math'
import type * as PdfExport from './export-pdf'

/*
 * What Tệp ▸ Mở file / Tải xuống call. The converters (docx, mammoth, the Markdown parser, the PDF capture) load on
 * first use, so the editor screen does not carry them.
 */

export type DownloadFormat = 'docx' | 'md' | 'json'

function reportWordExport(formulas: FormulaReport, missingImages: number) {
  if (missingImages) showErrorToast(`Không tải được ${missingImages} hình; tệp Word ghi tên hình ở chỗ đó`)
  if (formulas.texts) showErrorToast(`${formulas.texts} công thức được ghi dưới dạng LaTeX`)
}

/** Downloads what the sheet shows: the original, or the variant `code` being viewed (named "…-Ma-<code>"). */
export async function downloadDocument(editor: Editor, format: DownloadFormat, code: string | null = null) {
  if (editor.isDestroyed) return
  try {
    if (format !== 'docx') {
      const { exportJson, exportMarkdown } = await import('./export-text')
      if (format === 'md') exportMarkdown(editor, code)
      else exportJson(editor, code)
      return
    }
    const { exportDocx } = await import('./export-docx')
    const { formulas, missingImages } = await exportDocx(editor, code)
    reportWordExport(formulas, missingImages)
  } catch {
    showErrorToast('Không tạo được tệp tải xuống')
  }
}

/** Every exam variant as a .docx with its answer key after a page break, in one .zip. */
export async function downloadVariants(variants: VariantDoc[]) {
  if (!variants.length) return
  try {
    const { exportVariants } = await import('./export-variants')
    const { formulas, missingImages } = await exportVariants(variants)
    reportWordExport(formulas, missingImages)
  } catch {
    showErrorToast('Không tạo được tệp tải xuống')
  }
}

/** The PDF being made: the whole sheet, or the exam without its answer key. */
export type PdfJob = 'full' | 'examOnly'

let pdfJob: PdfJob | null = null
const pdfListeners = new Set<() => void>()

function setPdfJob(job: PdfJob | null) {
  pdfJob = job
  pdfListeners.forEach((listener) => listener())
}

function subscribePdfJob(listener: () => void) {
  pdfListeners.add(listener)
  return () => {
    pdfListeners.delete(listener)
  }
}

/** The PDF being made, if any: the menu item that started it says so, and no PDF item takes a second click. */
export function usePdfJob(): PdfJob | null {
  return useSyncExternalStore(subscribePdfJob, () => pdfJob, () => null)
}

/** True while a PDF is being made: the menu item and the chat's button say so and take no second click. */
export function usePdfBusy(): boolean {
  return usePdfJob() !== null
}

/**
 * Downloads what the sheet shows (the original, or the variant `code` being viewed) as a PDF, one at a time; with
 * `examOnly`, the exam without its answer key.
 */
export async function downloadPdf(editor: Editor, options: PdfExport.PdfOptions = {}) {
  if (pdfJob || editor.isDestroyed) return
  setPdfJob(options.examOnly ? 'examOnly' : 'full')
  let pdf: typeof PdfExport | null = null
  try {
    pdf = await import('./export-pdf')
    const { missingImages } = await pdf.exportPdf(editor, options)
    if (missingImages) showErrorToast(`Không tải được ${missingImages} hình; tệp PDF ghi tên hình ở chỗ đó`)
  } catch (error) {
    showErrorToast(pdf && error instanceof pdf.PdfError ? error.message : 'Không tạo được tệp PDF')
  } finally {
    setPdfJob(null)
  }
}

/** The document holds an answer key (the blocks the key writer tags), so it can also be downloaded without it. */
export function hasAnswerKey(editor: Editor | null): boolean {
  if (!editor || editor.isDestroyed) return false
  let found = false
  editor.state.doc.forEach((node) => {
    if (node.attrs.examKey) found = true
  })
  return found
}

const ACCEPT = [
  '.docx',
  '.md',
  '.markdown',
  '.json',
  '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'application/json',
  'text/plain',
].join(',')

let picker: HTMLInputElement | null = null

/** Opens the file picker (it must open within the click), then reads the chosen file into the editor. */
export function openDocumentFile(editor: Editor) {
  if (!picker) {
    picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = ACCEPT
    picker.hidden = true
    picker.tabIndex = -1
    picker.setAttribute('aria-hidden', 'true')
    picker.setAttribute('data-exam-doc-import', '')
    document.body.append(picker)
  }
  const input = picker
  input.onchange = () => {
    const file = input.files?.[0]
    // Cleared so choosing the same file again still fires a change.
    input.value = ''
    if (!file) return
    import('./import-file')
      .then(({ importDocumentFile }) => importDocumentFile(editor, file))
      .catch(() => showErrorToast('Không đọc được tệp này'))
  }
  input.click()
}
