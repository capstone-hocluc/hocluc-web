import type { CSSProperties } from 'react'
import Icon from '../../landing-page/Icon'
import PartSection from './PartSection'
import type { CoursePart } from './small-course-content'

/** "Khóa dành cho ai": each kind of student on a tinted card of its own, side by side. */
export default function AudiencePart({ part }: { part: CoursePart }) {
  return (
    <PartSection heading={part.heading} lines={part.lines} notes={part.notes}>
      <ul className="sc-audience" style={{ '--sc-columns': Math.min(part.items.length, 3) } as CSSProperties}>
        {part.items.map((item, index) => (
          <li key={index} className={`sc-tone-${index % 4}`}>
            <span className="sc-audience-icon" aria-hidden="true">
              <Icon name="user-round" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </PartSection>
  )
}
