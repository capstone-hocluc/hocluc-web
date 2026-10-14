import {
  calculatorLink,
  closingCta,
  faq,
  landingFooterNav,
  learningCycle,
} from '../../data/landing-content'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'

export function CalculatorLinkSection() {
  return (
    <section className="section calculator-section calculator-official" id="may-tinh">
      <div className="container calculator-link-card">
        <div>
          <span className="calculator-label">{calculatorLink.label}</span>
          <h2>{calculatorLink.title}</h2>
          <p>{calculatorLink.text}</p>
        </div>
        <a className="btn btn-primary" href={calculatorLink.href} target="_blank" rel="noreferrer">
          {calculatorLink.cta}
          <Icon name="arrow-right" />
        </a>
      </div>
    </section>
  )
}

export function LearningCycleSection() {
  return (
    <section
      className="section learning-cycle"
      id="chu-trinh"
      aria-labelledby="learning-cycle-title"
    >
      <div className="container">
        <div className="catalog-heading">
          <div>
            <h2 id="learning-cycle-title">{learningCycle.title}</h2>
            <p>{learningCycle.text}</p>
          </div>
        </div>
        <ol className="learning-cycle-list">
          {learningCycle.steps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section className="section faq-section" id="faq" aria-labelledby="faq-title">
      <div className="container faq-layout">
        <div className="faq-intro">
          <h2 id="faq-title">{faq.title}</h2>
          <p>{faq.text}</p>
        </div>
        <div className="faq-list">
          {faq.items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ClosingCtaSection() {
  return (
    <section className="closing-cta" aria-labelledby="closing-cta-title">
      <div className="container closing-cta-inner">
        <div>
          <h2 id="closing-cta-title">{closingCta.title}</h2>
          <p>{closingCta.text}</p>
        </div>
        <div className="closing-cta-actions">
          <AuthLink className="btn btn-primary">
            {closingCta.primary}
            <Icon name="arrow-right" />
          </AuthLink>
          <a className="btn btn-secondary" href="#chuong-trinh">
            {closingCta.secondary}
          </a>
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="footer" aria-label="Chân trang">
      <div className="container footer-compact">
        <a className="logo" href="#top" aria-label="Về đầu trang hocluc.com">
          <LandingLogo size={24} />
        </a>
        <nav className="footer-nav" aria-label="Điều hướng cuối trang">
          {landingFooterNav.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <AuthLink>Đăng nhập</AuthLink>
          <a href="/console/login">Đăng nhập nhân sự</a>
        </nav>
        <span className="footer-copyright">© 2026 hocluc.com</span>
      </div>
    </footer>
  )
}
