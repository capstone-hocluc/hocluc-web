import type { CSSProperties } from 'react'
import type { ExamIntro } from '../../data/landing-content'
import Icon from './Icon'

// Reference information about the exam, near the end of the page: what it is, its structure and,
// on demand, how an exam season runs.
function ExamIntroSection({ exam }: { exam: ExamIntro }) {
  return (
    <section className="section exam-intro" id="ky-thi" aria-labelledby="exam-intro-title">
      <div className="container">
        <div className="exam-intro-top">
          <div className="exam-intro-copy">
            <span className="exam-eyebrow">{exam.eyebrow}</span>
            <h2 id="exam-intro-title">{exam.title}</h2>
            <p>{exam.summary}</p>
            <p className="exam-note">{exam.scoringNote}</p>
          </div>

          <div>
            <h3 className="exam-block-title">{exam.structureTitle}</h3>
            <div className="exam-table-wrap">
              <table className="exam-table">
                <caption>Cấu trúc đề thi V-ACT: số câu và điểm tối đa của từng phần</caption>
                <thead>
                  <tr>
                    <th scope="col">Phần thi</th>
                    <th scope="col">Số câu</th>
                    <th scope="col">Điểm tối đa</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.parts.map((part) => (
                    <tr
                      key={part.id}
                      style={{ '--tone': part.tone, '--soft': part.soft } as CSSProperties}
                    >
                      <th scope="row">
                        <span className="exam-icon">
                          <Icon name={part.icon} />
                        </span>
                        <span>
                          {part.title}
                          {part.detail && <small>{part.detail}</small>}
                        </span>
                      </th>
                      <td>{part.questions}</td>
                      <td>{part.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Tổng</th>
                    <td>{exam.totalQuestions}</td>
                    <td>{exam.totalScore}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <details className="exam-season">
          <summary>{exam.seasonTitle}</summary>
          <ol className="exam-timeline">
            {exam.season.map((step) => (
              <li key={step.title}>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </details>

        <p className="exam-source">
          Nguồn:{' '}
          <a href={exam.source.href} target="_blank" rel="noopener noreferrer">
            {exam.source.label}
          </a>{' '}
          · cập nhật {exam.source.updatedAt}. {exam.source.note}
        </p>
      </div>
    </section>
  )
}

export default ExamIntroSection
