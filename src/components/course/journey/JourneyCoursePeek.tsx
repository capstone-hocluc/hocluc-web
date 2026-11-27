import Icon from '../../landing-page/Icon'
import LandingLink from '../../landing-page/LandingLink'
import type { JourneyCourse } from './journey-content'

// The picked course in a little more detail: its size, where it sits in the exam, the first
// things it teaches, and the way to its own page.
export default function JourneyCoursePeek({ course }: { course: JourneyCourse }) {
  return (
    <div className="cj-peek" data-testid="journey-course-detail">
      <h4>{course.title}</h4>
      {course.facts && <p>{course.facts}</p>}
      {course.summary && <p>{course.summary}</p>}
      {course.highlights && (
        <>
          {course.highlights.heading && <h5>{course.highlights.heading}</h5>}
          <ul>
            {course.highlights.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <LandingLink className="text-link" href={course.href}>
        Xem chi tiết khóa học <Icon name="arrow-right" />
      </LandingLink>
    </div>
  )
}
