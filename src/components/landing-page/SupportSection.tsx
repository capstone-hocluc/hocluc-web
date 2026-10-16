import type { CSSProperties } from 'react'
import { support } from '../../data/landing-content'
import Icon from './Icon'

// What helps while learning: mentor and AI tutor (both need a purchased course) plus the free
// CASIO calculator emulator.
function SupportSection() {
  return (
    <section className="section support-section" id="ho-tro" aria-labelledby="support-title">
      <div className="container">
        <div className="catalog-heading">
          <div>
            <h2 id="support-title">{support.title}</h2>
            <p>{support.text}</p>
          </div>
        </div>
        <ul className="support-grid">
          {support.items.map((item) => (
            <li
              key={item.id}
              className="support-card"
              style={{ '--tone': item.tone, '--soft': item.soft } as CSSProperties}
            >
              <span className="support-icon" aria-hidden="true">
                <Icon name={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <small>{item.note}</small>
              {item.link && (
                <a className="text-link" href={item.link.href} target="_blank" rel="noreferrer">
                  {item.link.label} <Icon name="arrow-up-right" />
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default SupportSection
