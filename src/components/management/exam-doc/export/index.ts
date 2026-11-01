import type { Editor } from '@tiptap/core'
import { showErrorToast } from '../../../../lib/toastBus'
import type { VariantDoc } from '../variants/build-variants'
import type { FormulaReport } from './docx-math'

/*
 * What Tệp ▸ Mở file / Tải xuống call. The converters (docx, mammoth, the Markdown parser) load on first use, so
 * the editor screen does not carry them.
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
