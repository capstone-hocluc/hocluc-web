import { memo, useState } from 'react'
import Icon from '../../landing-page/Icon'
import LandingLink from '../../landing-page/LandingLink'
import type { JourneyCompanion, JourneyStage as Stage } from './journey-content'
import { toneVars, type JourneyTone } from './journey-tones'
import JourneyCoursePeek from './JourneyCoursePeek'
import JourneyStats from './JourneyStats'
import JourneyTicket from './JourneyTicket'

interface JourneyStageProps {
  stage: Stage
  number: number
  stageCount: number
  tone: JourneyTone
  /** Courses studied alongside every stage. */
  companions: JourneyCompanion[]
  shown: boolean
}

// One stop of the trip: the stage's name and size on the left, its courses as tickets on the
// right. Picking a ticket shows that course under the tickets.
function JourneyStage({ stage, number, stageCount, tone, companions, shown }: JourneyStageProps) {
  const [picked, setPicked] = useState(0)
  const course = stage.courses[Math.min(picked, stage.courses.length - 1)]
  const alongside = stageCount > 1 ? `Học xuyên suốt cả ${stageCount} chặng` : 'Học xuyên suốt lộ trình'
  return (
    <div className={`cj-stage${shown ? ' is-on' : ''}`} style={toneVars(tone)} data-testid="journey-stage">
      <div className="cj-head">
        <span className="cj-badge">
          Chặng {number} / {stageCount}
        </span>
        <h3>{stage.name}</h3>
        {stage.description && <p>{stage.description}</p>}
        <JourneyStats stats={stage.stats} />
        {companions.length > 0 && (
          <ul className="cj-companions">
            {companions.map((companion) => (
              <li key={companion.id}>
                <Icon name="rotate-ccw" />
                <span>
                  <LandingLink href={companion.href}>{companion.title}</LandingLink>
                  {[alongside, companion.facts].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cj-side">
        <div className="cj-tickets">
          {stage.courses.map((item, index) => (
            <JourneyTicket
              key={item.id}
              course={item}
              picked={item === course}
              order={index}
              onPick={() => setPicked(index)}
            />
          ))}
        </div>
        <JourneyCoursePeek course={course} />
      </div>
    </div>
  )
}

export default memo(JourneyStage)
