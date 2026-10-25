export interface ExamFileDraft {
  file: File | null
  /** Hand the PDF to the AI as soon as the draft is saved. */
  read: boolean
  fromPage: string
  toPage: string
  hints: string
}

export const emptyExamFileDraft: ExamFileDraft = { file: null, read: true, fromPage: '', toPage: '', hints: '' }
