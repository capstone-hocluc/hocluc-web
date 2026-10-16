import { closingCta, faq, landingFooterNav } from '../../data/landing-content'
import AppLink from './AppLink'
import AuthLink from './AuthLink'
import Icon from './Icon'
import LandingLogo from './LandingLogo'

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
          <a className="btn btn-secondary" href="#cac-khoa-hoc">
            {closingCta.secondary}
          </a>
        </div>
      </div>
    </section>
  )
}

// Shared footer of the landing page and the public course pages.
export function LandingFooter({ onLanding = true }: { onLanding?: boolean }) {
  return (
    <footer className="footer" aria-label="Chân trang">
      <div className="container footer-compact">
        {onLanding ? (
          <a className="logo" href="#top" aria-label="Về đầu trang hocluc.com">
            <LandingLogo size={24} />
          </a>
        ) : (
          <AppLink className="logo" href="/" aria-label="Về trang chủ hocluc.com">
            <LandingLogo size={24} />
          </AppLink>
        )}
        <nav className="footer-nav" aria-label="Điều hướng cuối trang">
          {landingFooterNav.map((link) => {
            if (onLanding) {
              return (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              )
            }
            return link.pageHref ? (
              <AppLink key={link.href} href={link.pageHref}>
                {link.label}
              </AppLink>
            ) : (
              <a key={link.href} href={`/${link.href}`}>
                {link.label}
              </a>
            )
          })}
          <AuthLink>Đăng nhập</AuthLink>
          <a href="/console/login">Đăng nhập nhân sự</a>
        </nav>
        <span className="footer-copyright">© 2026 hocluc.com</span>
      </div>
    </footer>
  )
}
