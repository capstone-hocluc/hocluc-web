import { examFacts, type ExamIntro } from '../../data/landing-content'
import Icon from './Icon'

// One-line summary of the exam right under the hero; the full explanation sits near the end.
function ExamFactsStrip({ exam }: { exam: ExamIntro }) {
  const facts = [
    { value: String(exam.totalQuestions), label: 'câu trắc nghiệm' },
    { value: String(exam.durationMinutes), label: 'phút làm bài' },
    { value: exam.totalScore, label: 'điểm tối đa' },
    { value: String(exam.parts.length), label: 'phần thi' },
  ]

  return (
    <section className="exam-facts" aria-label={examFacts.label}>
      <div className="container exam-facts-inner">
        <p className="exam-facts-label">{examFacts.label}</p>
        <dl className="exam-facts-list">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <a className="text-link" href="#ky-thi">
          {examFacts.link} <Icon name="arrow-right" />
        </a>
      </div>
    </section>
  )
}

export default ExamFactsStrip
