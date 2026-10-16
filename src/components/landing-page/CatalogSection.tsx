import type { Domain } from '../../data/landing-content'
import Icon from './Icon'

export default function CatalogSection({
  domains,
  onOpenDomain,
}: {
  domains: Domain[]
  onOpenDomain: (id: string) => void
}) {
  return (
    <section className="subjects-section" id="chuong-trinh" aria-labelledby="subjects-title">
      <div className="container">
        <div className="subjects-heading">
          <h2 id="subjects-title">Bạn muốn bắt đầu từ đâu?</h2>
          <p>Khám phá 5 nhóm kiến thức V-ACT.</p>
        </div>
        <div className="subject-list">
          {domains.map((domain) => (
            <button
              type="button"
              className="subject-item"
              key={domain.id}
              onClick={() => onOpenDomain(domain.id)}
              aria-label={`Khám phá ${domain.title}`}
            >
              <span className="subject-symbol" aria-hidden="true">
                {domain.label}
              </span>
              <span className="subject-name">{domain.title}</span>
              <Icon name="arrow-up-right" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
