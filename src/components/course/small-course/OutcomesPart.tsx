import type { CSSProperties } from 'react'
import type { LandingIconName } from '../../../data/landing-content'
import type { CourseOutcomeView } from '../../../services/courseService'
import Icon from '../../landing-page/Icon'
import PartSection from './PartSection'
import type { CoursePart } from './small-course-content'

const HIGHLIGHT_ICONS: LandingIconName[] = ['trending-up', 'sparkles', 'chart-column-increasing', 'lightbulb']

// What a student can do after the course, on one dark panel: the description's own "Học xong bạn
// làm được" items side by side, then the course's learning outcomes as a numbered list. Either may
// be missing.
export default function OutcomesPart({
  part,
  outcomes,
}: {
  part: CoursePart | null
  outcomes: CourseOutcomeView[]
}) {
  const highlights = part?.items ?? []
  return (
    <PartSection heading={part?.heading ?? 'Sau khóa học, bạn sẽ'} lines={part?.lines ?? []} notes={part?.notes ?? []}>
      <div className="sc-outcomes">
        {highlights.length > 0 && (
          <ul
            className="sc-outcome-highlights"
            style={{ '--sc-columns': Math.min(highlights.length, 3) } as CSSProperties}
          >
            {highlights.map((item, index) => (
              <li key={index}>
                <span className={`ab-get-icon tone-${index % 4}`} aria-hidden="true">
                  <Icon name={HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length]} />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {outcomes.length > 0 && (
          <ol className="sc-goals">
            {outcomes.map((outcome, index) => (
              <li key={outcome.id}>
                <span className="sc-goal-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{outcome.description}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PartSection>
  )
}
