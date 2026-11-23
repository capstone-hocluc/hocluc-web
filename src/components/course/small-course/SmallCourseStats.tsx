import type { CourseFact } from '../course-facts'

// The facts of a course that is not a bundle as a row of tinted tiles, study time and size first.
const ORDER: CourseFact['key'][] = ['duration', 'chapters', 'lessons', 'gifts', 'start', 'exam', 'access']

export default function SmallCourseStats({ facts }: { facts: CourseFact[] }) {
  const sorted = [...facts].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
  return (
    <dl className="sc-stats">
      {sorted.map((fact, index) => (
        <div key={fact.key} className={`sc-stat sc-tone-${index % 4}`}>
          <dt>{fact.label}</dt>
          <dd>
            {fact.value}
            {fact.note && <span className="sc-stat-note"> · {fact.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
