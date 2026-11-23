import type { CSSProperties } from 'react'
import type { LandingIconName } from '../../../data/landing-content'
import Icon from '../../landing-page/Icon'
import PartSection from './PartSection'
import type { CoursePart } from './small-course-content'

const METHOD_ICONS: LandingIconName[] = ['lightbulb', 'pen-line', 'book-open', 'puzzle']

/** "Cách học": each way of studying on a card with its own icon. */
export default function MethodPart({ part }: { part: CoursePart }) {
  return (
    <PartSection heading={part.heading} lines={part.lines} notes={part.notes}>
      <ul className="sc-method" style={{ '--sc-columns': Math.min(part.items.length, 3) } as CSSProperties}>
        {part.items.map((item, index) => (
          <li key={index} className={`sc-tone-${index % 4}`}>
            <span className="sc-method-icon" aria-hidden="true">
              <Icon name={METHOD_ICONS[index % METHOD_ICONS.length]} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </PartSection>
  )
}
