import JSZip from 'jszip'
import type { VariantDoc } from '../variants/build-variants'
import { buildDocx } from './export-docx'
import type { FormulaReport } from './docx-math'
import { baseFileName, downloadBlob } from './file-name'

export interface VariantsResult {
  fileName: string
  formulas: FormulaReport
  missingImages: number
}

/**
 * Every exam variant as its own .docx ("<title>-Ma-<code>.docx": the code's exam, a page break, then its answer key),
 * all in one .zip download.
 */
export async function exportVariants(variants: VariantDoc[]): Promise<VariantsResult> {
  const zip = new JSZip()
  const formulas: FormulaReport = { equations: 0, pictures: 0, texts: 0 }
  let missingImages = 0
  for (const variant of variants) {
    const content = [...(variant.content.content ?? []), { type: 'pageBreak' }, ...variant.answerKey.content]
    const result = await buildDocx({ ...variant.content, type: 'doc', content }, { code: variant.code })
    zip.file(result.fileName, result.blob)
    formulas.equations += result.formulas.equations
    formulas.pictures += result.formulas.pictures
    formulas.texts += result.formulas.texts
    missingImages += result.missingImages
  }
  const fileName = `${baseFileName(variants[0]?.content ?? { type: 'doc' })}-Tat-ca-ma-de.zip`
  downloadBlob(await zip.generateAsync({ type: 'blob' }), fileName)
  return { fileName, formulas, missingImages }
}
