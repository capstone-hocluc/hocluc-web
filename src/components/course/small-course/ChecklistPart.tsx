import Icon from '../../landing-page/Icon'
import PartSection from './PartSection'
import type { CoursePart } from './small-course-content'

// What the course teaches ("Bạn sẽ học / luyện / biết") as a tinted panel of ticked items in two
// columns; any other list keeps the same shape on white.
export default function ChecklistPart({ part, tinted = false }: { part: CoursePart; tinted?: boolean }) {
  return (
    <PartSection heading={part.heading} lines={part.lines} notes={part.notes}>
      <ul className={`sc-checklist${tinted ? ' is-tinted' : ''}`}>
        {part.items.map((item, index) => (
          <li key={index}>
            <span className="ab-tick" aria-hidden="true">
              <Icon name="check" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </PartSection>
  )
}
