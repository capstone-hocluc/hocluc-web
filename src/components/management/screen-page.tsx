import type { ReactNode } from 'react'
import type { LucideIcon } from '../console/icons'
import PageHeading from '../console/page-heading'
import StatCard from '../ui/StatCard'

export type Stat = { label: string; value: ReactNode; icon: LucideIcon; tone?: 'info' | 'success' | 'warning' | 'danger' }

// Page frame for role screens: heading with breadcrumb, an optional tab row, optional stat tiles, then content.
export default function Page({ title, navigation, stats, children }: {
  title: string
  navigation?: ReactNode
  stats?: Stat[]
  children: ReactNode
}) {
  return (
    <section className="space-y-5">
      <PageHeading title={title} />
      {navigation}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}
      {children}
    </section>
  )
}
