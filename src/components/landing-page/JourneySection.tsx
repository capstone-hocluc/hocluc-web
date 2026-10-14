import { journey } from '../../data/landing-content'
import Icon from './Icon'

function JourneySection({ onStart }: { onStart: () => void }) {
  return (
    <section className="section journey" id="lo-trinh">
      <div className="container journey-layout">
        <div className="journey-copy">
          <h2>
            {journey.title}
            <br />
            <span className="accent">{journey.accent}</span>
          </h2>
          <p>{journey.text}</p>
          <button type="button" className="btn btn-primary" data-start onClick={onStart}>
            {journey.cta}
            <Icon name="arrow-right" />
          </button>
        </div>
        <div className="journey-steps">
          {journey.steps.map((step, index) => (
            <article key={step.title} className="journey-step">
              <span className="step-number">{index + 1}</span>
              <div className="step-body">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
        <figure className="journey-avatar-pair" aria-label={journey.avatars.label}>
          {journey.avatars.images.map((image) => (
            <img
              key={image.src}
              src={image.src}
              width={160}
              height={160}
              alt={image.alt}
              loading="lazy"
            />
          ))}
        </figure>
      </div>
    </section>
  )
}

export default JourneySection
