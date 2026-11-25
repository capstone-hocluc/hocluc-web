import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'

export type QuizFieldError = 'title' | 'duration' | 'attempts' | 'target' | 'questions'

/** An error's message, followed by the field errors the server listed with it. */
export function formatApiError(error: unknown) {
  const details = error instanceof ApiError
    ? Object.values(error.errors ?? {}).filter(Boolean).join('; ')
    : ''
  return details ? getErrorMessage(error) + ': ' + details : getErrorMessage(error)
}

/** A create that may have reached the server: retrying it could make a second quiz. */
export function isAmbiguousCreateFailure(error: unknown) {
  if (!(error instanceof ApiError)) return true
  return error.status === 0 || error.status === 408 || error.status >= 500
}

/** The server's field errors, put on the form field each one is about; the rest are returned to show together. */
export function mapTeacherQuizValidationErrors(errors: Record<string, string>) {
  const fields: Partial<Record<QuizFieldError, string>> = {}
  const unmapped: string[] = []

  for (const [key, message] of Object.entries(errors)) {
    if (!message) continue
    const normalizedKey = key.replace(/[^a-z]/gi, '').toLowerCase()
    const field: QuizFieldError | undefined = normalizedKey.includes('title')
      ? 'title'
      : normalizedKey.includes('duration')
        ? 'duration'
        : normalizedKey.includes('attempt')
          ? 'attempts'
          : normalizedKey.includes('course') || normalizedKey.includes('chapter') || normalizedKey.includes('lesson') || normalizedKey === 'type'
            ? 'target'
            : normalizedKey.includes('question') || normalizedKey.includes('option')
              ? 'questions'
              : undefined

    if (field) fields[field] = fields[field] ? `${fields[field]}; ${message}` : message
    else unmapped.push(message)
  }

  return { fields, unmapped }
}

export function getResourceErrorMessage(status: string, errorMessage: string, resource: string) {
  if (status === 'forbidden') return `Bạn không có quyền xem ${resource}.`
  if (status === 'not-found') return `Không tìm thấy ${resource}.`
  return errorMessage || `Không thể tải ${resource}.`
}
