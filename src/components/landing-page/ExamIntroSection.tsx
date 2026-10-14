import type { CSSProperties } from 'react'
import type { ExamIntro } from '../../data/landing-content'
import AnswerSheet from './AnswerSheet'
import Icon from './Icon'

function ExamIntroSection({ exam }: { exam: ExamIntro }) {
  return (
    <section className="section exam-intro" id="ky-thi" aria-labelledby="exam-intro-title">
      <div className="container">
        <div className="exam-intro-top">
          <div className="exam-intro-copy">
            <span className="exam-eyebrow">{exam.eyebrow}</span>
            <h2 id="exam-intro-title">{exam.title}</h2>
            <p>{exam.summary}</p>
          </div>
          <figure className="exam-visual">
            <AnswerSheet />
            <figcaption>{exam.sheetCaption}</figcaption>
          </figure>
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
          <p className="exam-note">{exam.scoringNote}</p>
        </div>

        <div>
          <h3 className="exam-block-title">{exam.seasonTitle}</h3>
          <ol className="exam-timeline">
            {exam.season.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

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
