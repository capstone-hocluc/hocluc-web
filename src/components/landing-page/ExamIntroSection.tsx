import type { ExamIntro } from '../../data/landing-content'
import Icon from './Icon'

export function ExamFacts({ exam }: { exam: ExamIntro }) {
  return (
    <aside className="exam-facts" aria-label="Thông tin kỳ thi V-ACT">
      <div className="container">
        <span>Kỳ thi V-ACT</span>
        <p>
          <strong>{exam.totalQuestions}</strong> câu hỏi
        </p>
        <p>
          <strong>150</strong> phút
        </p>
        <p>
          <strong>{exam.totalScore}</strong> điểm tối đa
        </p>
        <a className="text-link" href="#ky-thi">
          Tìm hiểu kỳ thi <Icon name="arrow-up-right" />
        </a>
      </div>
    </aside>
  )
}

export default function ExamIntroSection({ exam }: { exam: ExamIntro }) {
  return (
    <section className="section exam-intro" id="ky-thi" aria-labelledby="exam-intro-title">
      <div className="container exam-layout">
        <div className="exam-copy">
          <span className="eyebrow">Kỳ thi ĐGNL ĐHQG-HCM</span>
          <h2 id="exam-intro-title">
            Hiểu kỳ thi.
            <br />
            Chuẩn bị vững vàng.
          </h2>
          <p>
            V-ACT đánh giá năng lực sử dụng ngôn ngữ, toán học và tư duy khoa học cho việc học đại
            học.
          </p>
          <a
            className="text-link"
            href={exam.source.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Thông tin từ ĐHQG-HCM <Icon name="arrow-up-right" />
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        </div>
        <div>
          <div className="exam-table-wrap">
            <table className="exam-table">
              <caption>Cấu trúc đề thi V-ACT</caption>
              <thead>
                <tr>
                  <th scope="col">Phần thi</th>
                  <th scope="col">Số câu</th>
                  <th scope="col">Điểm tối đa</th>
                </tr>
              </thead>
              <tbody>
                {exam.parts.map((part) => (
                  <tr key={part.id}>
                    <th scope="row">
                      {part.title}
                      {part.detail && <small>{part.detail}</small>}
                    </th>
                    <td>{part.questions}</td>
                    <td>{part.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="exam-note">{exam.scoringNote}</p>
          <details className="exam-season">
            <summary>{exam.seasonTitle}</summary>
            <ol>
              {exam.season.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </details>
          <p className="exam-source">
            Nội dung tham khảo cập nhật {exam.source.updatedAt}. Lịch thi và lệ phí xem tại nguồn
            chính thức.
          </p>
        </div>
      </div>
    </section>
  )
}
