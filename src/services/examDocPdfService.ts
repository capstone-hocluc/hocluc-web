import { API_BASE_URL, ensureFreshAccessToken, getAccessToken } from '../lib/api'

/*
 * The server's PDF of an exam document (POST /api/v1/exam-docs/pdf): A4 with real, selectable text. The caller
 * falls back to the PDF the browser draws, so every failure here (no backend yet, a 4xx/5xx, a timeout, an answer
 * that is not a PDF) is quiet: it resolves to null and never signs the person out.
 */

export const EXAM_PDF_PATH = '/api/v1/exam-docs/pdf'
/** The server refuses larger bodies (413); such a document goes straight to the browser renderer. */
export const EXAM_PDF_MAX_BYTES = 5 * 1024 * 1024
export const EXAM_PDF_TIMEOUT_MS = 30_000

export interface ExamPdfRequest {
  /** The document body as HTML (see exam-doc/export/exam-pdf-html.ts). */
  html: string
  title: string
}

/** A token that is still valid, refreshed when it is about to expire; never ends the session on failure. */
async function bearerToken(): Promise<string | null> {
  try {
    return await ensureFreshAccessToken(false, false)
  } catch {
    return getAccessToken()
  }
}

export interface ExamPdf {
  blob: Blob
  /** Its number of pages (the X-Page-Count header); 0 when the server did not say. */
  pages: number
}

/** The PDF the server made, or null when it did not make one. */
export async function requestExamPdf(body: ExamPdfRequest): Promise<ExamPdf | null> {
  const payload = JSON.stringify(body)
  if (new Blob([payload]).size > EXAM_PDF_MAX_BYTES) return null
  const token = await bearerToken()
  if (!token) return null
  try {
    const response = await fetch(`${API_BASE_URL}${EXAM_PDF_PATH}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/pdf, application/json',
        Authorization: `Bearer ${token}`,
      },
      body: payload,
      signal: AbortSignal.timeout(EXAM_PDF_TIMEOUT_MS),
    })
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) return null
    const pdf = await response.blob()
    // A proxy or a page fallback can answer 200 with something else: only a real PDF is kept.
    const head = new TextDecoder().decode(await pdf.slice(0, 5).arrayBuffer())
    if (head !== '%PDF-') return null
    const pages = Number.parseInt(response.headers.get('X-Page-Count') ?? '', 10)
    return { blob: new Blob([pdf], { type: 'application/pdf' }), pages: Number.isFinite(pages) && pages > 0 ? pages : 0 }
  } catch {
    return null
  }
}
