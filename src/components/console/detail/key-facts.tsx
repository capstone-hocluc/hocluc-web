import type { ReactNode } from 'react'

export interface KeyFact {
  label: string
  value: ReactNode
  /** A business-required field shows "—" when empty instead of being hidden. */
  required?: boolean
}

const MAX_FACTS = 6

const isEmpty = (value: ReactNode) =>
  value === null || value === undefined || value === false || value === ''

// The few facts that matter most, two columns (one under 640px). Empty facts are hidden,
// not written as "Chưa cập nhật", so what remains is all signal.
export default function KeyFacts({ facts }: { facts: KeyFact[] }) {
  const shown = facts.filter((fact) => fact.required || !isEmpty(fact.value)).slice(0, MAX_FACTS)
  if (!shown.length) return null
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {shown.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className="text-xs text-text-tertiary">{fact.label}</dt>
          <dd className="mt-1 text-sm font-medium break-words text-text-primary">
            {isEmpty(fact.value) ? '—' : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
