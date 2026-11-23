import type { JourneyStat } from './journey-content'

// A row of figures, each a large number over its unit.
export default function JourneyStats({ stats }: { stats: JourneyStat[] }) {
  return (
    <dl className="cj-stats">
      {stats.map((stat) => (
        <div key={stat.unit}>
          <dt>{stat.unit}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
