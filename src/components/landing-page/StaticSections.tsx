import { calculatorLink, closingCta, faq, landingFooterNav } from '../../data/landing-content'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'
import LandingLink from './LandingLink'

export function LearningSupportSection() {
  return (
    <section className="section support-section" id="ho-tro" aria-labelledby="support-title">
      <div className="container support-layout">
        <div className="support-intro">
          <span className="eyebrow">Hỗ trợ khi học</span>
          <h2 id="support-title">
            Có thêm cách
            <br />
            để hiểu bài.
          </h2>
          <p>Khám phá hình thức hỗ trợ dành cho học viên trong thông tin từng khóa học.</p>
        </div>
        <div className="support-items">
          <article>
            <Icon name="languages" />
            <div>
              <h3>Trao đổi cùng Mentor</h3>
              <p>
                Trao đổi những phần chưa hiểu trong quá trình học. Quyền hỗ trợ theo khóa học bạn
                tham gia.
              </p>
            </div>
          </article>
          <article>
            <Icon name="book-open" />
            <div>
              <h3>Khám phá cùng gia sư AI</h3>
              <p>
                Dành cho học viên có khóa đã mua còn hiệu lực. Xem điều kiện sử dụng trong tài khoản
                học tập.
              </p>
            </div>
          </article>
          <a
            className="calculator-link"
            href={calculatorLink.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="calculator" />
            <span>
              Luyện thao tác máy tính với ClassPad.net
              <small>Công cụ bên ngoài · Mở trong tab mới</small>
            </span>
            <Icon name="arrow-up-right" />
          </a>
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section className="section faq-section" id="faq" aria-labelledby="faq-title">
      <div className="container faq-layout">
        <div className="faq-intro">
          <h2 id="faq-title">
            Bạn đang
            <br />
            băn khoăn điều gì?
          </h2>
        </div>
        <div className="faq-list">
          {faq.items.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <span aria-hidden="true">+</span>
              </summary>
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
          <h2 id="closing-cta-title">
            Bước tiếp theo,
            <br />
            bắt đầu từ hôm nay.
          </h2>
          <p>Chọn một khóa học, thử một câu hỏi.</p>
        </div>
        <div className="closing-cta-actions">
          <AuthLink mode="signup" className="btn btn-primary">
            Bắt đầu miễn phí <Icon name="arrow-right" />
          </AuthLink>
          <a className="btn btn-secondary" href="#khoa-hoc">
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
      <div className="container">
        <div className="footer-top">
          <div>
            <a className="logo" href="#top" aria-label="Về đầu trang hocluc.com">
              <LandingLogo size={26} />
            </a>
            <p>
              Mỗi ngày một chút,
              <br />
              tiến xa một bước.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Điều hướng cuối trang">
            {landingFooterNav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} hocluc.com</span>
          <div>
            <AuthLink>Đăng nhập</AuthLink>
            <LandingLink href="/console/login">
              Dành cho nhân sự <Icon name="arrow-up-right" />
            </LandingLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
