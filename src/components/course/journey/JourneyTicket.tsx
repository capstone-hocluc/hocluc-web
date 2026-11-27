import type { JourneyCourse } from './journey-content'

interface JourneyTicketProps {
  course: JourneyCourse
  picked: boolean
  /** Its place among the stage's tickets; later ones slide in a little later. */
  order: number
  onPick: () => void
}

// One course of a stage as a ticket: its hours on the stub, its subject and title beside it.
export default function JourneyTicket({ course, picked, order, onPick }: JourneyTicketProps) {
  const { subject } = course
  return (
    <button
      type="button"
      className="cj-ticket"
      style={{ animationDelay: `${140 + order * 50}ms` }}
      aria-pressed={picked}
      title={course.title}
      data-testid="journey-course"
      onClick={onPick}
    >
      <span
        className="cj-ticket-stub"
        style={{ background: subject.soft, color: subject.tone, borderColor: `${subject.tone}55` }}
      >
        <b>{course.figure.value}</b>
        {course.figure.unit}
      </span>
      <span className="cj-ticket-main">
        <em style={{ color: subject.tone }}>{course.subjectName}</em>
        <strong>{course.title}</strong>
      </span>
    </button>
  )
}
