import type { CourseOutcomeView } from '../../../services/courseService'
import AudiencePart from './AudiencePart'
import ChecklistPart from './ChecklistPart'
import MethodPart from './MethodPart'
import OutcomesPart from './OutcomesPart'
import type { SmallCourseContent } from './small-course-content'

// The body of a course page that is not a bundle: every part of the description as its own
// section, in the description's order, each shaped for what it says. The learning outcomes join
// the description's "Học xong bạn làm được" part, or follow the parts when there is none.
export default function SmallCourseOverview({
  content,
  outcomes,
}: {
  content: SmallCourseContent
  outcomes: CourseOutcomeView[]
}) {
  const outcomePart = content.parts.find((part) => part.kind === 'outcome') ?? null
  return (
    <>
      {content.parts.map((part, index) => {
        switch (part.kind) {
          case 'audience':
            return <AudiencePart key={index} part={part} />
          case 'learn':
            return <ChecklistPart key={index} part={part} tinted />
          case 'method':
            return <MethodPart key={index} part={part} />
          case 'outcome':
            if (part === outcomePart) return <OutcomesPart key={index} part={part} outcomes={outcomes} />
            return <ChecklistPart key={index} part={part} />
          default:
            return <ChecklistPart key={index} part={part} />
        }
      })}
      {!outcomePart && outcomes.length > 0 && <OutcomesPart part={null} outcomes={outcomes} />}
    </>
  )
}
