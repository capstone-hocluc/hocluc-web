import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface Fact {
  label: string
  value: ReactNode
  wide?: boolean
}

// Every field of the profile is listed, "—" when empty, so an admin sees what the account is missing.
export default function FactGrid({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className={cn('min-w-0', fact.wide && 'sm:col-span-2')}>
          <dt className="text-xs text-text-tertiary">{fact.label}</dt>
          <dd className="mt-1 text-sm font-medium break-words whitespace-pre-line text-text-primary">
            {fact.value === null || fact.value === undefined || fact.value === false || fact.value === '' ? '—' : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
