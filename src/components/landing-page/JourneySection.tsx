import { journey, practiceOperations } from '../../data/landing-content'
import Icon from './Icon'

export default function JourneySection({
  onStart,
  onOpenOperation,
}: {
  onStart: () => void
  onOpenOperation: (id: string) => void
}) {
  return (
    <section className="section journey" id="lo-trinh" aria-labelledby="journey-title">
      <div className="container">
        <div className="section-heading">
          <div>
            <h2 id="journey-title">
              Từng bước nhỏ.
              <br />
              <span className="accent">Một hướng đi rõ ràng.</span>
            </h2>
            <p>Hiểu mình đang ở đâu, chọn phần cần học và luyện tập mỗi ngày.</p>
          </div>
          <button type="button" className="text-link" onClick={onStart}>
            Xem gợi ý nhanh <Icon name="arrow-up-right" />
          </button>
        </div>
        <ol className="journey-steps">
          {journey.steps.map((step, index) => (
            <li className="journey-step" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="practice-compact">
          <span>Cùng bạn trong từng bước học</span>
          <div className="practice-pills">
            {practiceOperations.map((operation) => (
              <button
                key={operation.id}
                type="button"
                onClick={() => onOpenOperation(operation.id)}
              >
                {operation.label}
                <Icon name="arrow-up-right" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
