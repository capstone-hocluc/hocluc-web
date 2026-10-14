import type { CSSProperties } from 'react'
import {
  catalogHeading,
  practiceHeading,
  type Domain,
  type PracticeOperation,
} from '../../data/landing-content'
import Icon from './Icon'

interface CatalogSectionProps {
  domains: Domain[]
  operations: PracticeOperation[]
  onOpenDomain: (domainId: string) => void
  onOpenOperation: (operationId: string) => void
}

function DomainArt({ domain }: { domain: Domain }) {
  const { art } = domain
  if (art.kind === 'image') {
    return (
      <img
        className="character"
        src={art.src}
        width={art.width}
        height={art.height}
        alt={art.alt}
        loading="lazy"
      />
    )
  }
  return (
    <svg className="character" aria-hidden="true">
      <use href={`#lp-${art.symbol}`} />
    </svg>
  )
}

function CatalogSection({
  domains,
  operations,
  onOpenDomain,
  onOpenOperation,
}: CatalogSectionProps) {
  return (
    <section className="section" id="chuong-trinh">
      <div className="container">
        <div className="catalog-heading">
          <div>
            <h2>{catalogHeading.title}</h2>
            <p>{catalogHeading.text}</p>
          </div>
        </div>
        <div className="catalog-grid" id="catalog">
          {domains.map((domain) => (
            <article
              key={domain.id}
              className="domain-card"
              id={domain.id}
              style={{ '--tone': domain.color, '--soft': domain.soft } as CSSProperties}
            >
              <div className="domain-art">
                <span className="art-sub">
                  {domain.part.toUpperCase()} · {domain.questions} CÂU
                </span>
                <span
                  className="art-label"
                  style={domain.labelFontSize ? { fontSize: domain.labelFontSize } : undefined}
                >
                  {domain.label}
                </span>
                <span className="art-doodle" aria-hidden="true">
                  <Icon name={domain.doodle.icon} />
                  {domain.doodle.text}
                </span>
                <DomainArt domain={domain} />
              </div>
              <div className="domain-content">
                <h3>{domain.title}</h3>
                <p>{domain.desc}</p>
                <div className="domain-meta">
                  <span>
                    <Icon name="book-open" /> {domain.modules.length} học phần
                  </span>
                </div>
                <button
                  type="button"
                  className="text-link"
                  data-domain={domain.id}
                  aria-label={`Khám phá ${domain.title}`}
                  onClick={() => onOpenDomain(domain.id)}
                >
                  Khám phá nhóm học <Icon name="arrow-right" />
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="practice-compact" id="luyen-thi">
          <h3>{practiceHeading}</h3>
          <div id="practice-options" className="practice-pills">
            {operations.map((operation) => (
              <button
                key={operation.id}
                type="button"
                className="practice-pill"
                data-operation={operation.id}
                onClick={() => onOpenOperation(operation.id)}
              >
                {operation.label} <Icon name="arrow-up-right" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CatalogSection
