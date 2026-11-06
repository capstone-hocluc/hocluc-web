import type { ReactNode } from 'react'
import { errorId } from './figure-controls'

/** What is wrong with a field, under it; nothing when `message` is empty. */
export function FieldError({ fieldKey, message }: { fieldKey: string; message: string | null | undefined }) {
  if (!message) return null
  return (
    <p id={errorId(fieldKey)} className="text-xs leading-4 font-normal text-danger">
      {message}
    </p>
  )
}

/** A quieter line under a field: true, but not in the way of saving. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-4 font-normal text-text-tertiary">{children}</p>
}
