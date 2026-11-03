import { closingCta, faq, landingFooterNav } from '../../data/landing-content'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'
import LandingLink from './LandingLink'

// Icon tile and title shared by the three ways to get help. The title is an h3 for the first two, so
// it needs `!` to beat the landing's element rule for h3.
const supportTile =
  'grid size-11 shrink-0 place-items-center rounded-xl bg-(--blue-soft) text-(--blue-text)'
const supportTitle = 'text-[1.125rem]! leading-snug!'

// Where learners can get help understanding a lesson. The photo sits left at desktop width through grid
// placement, so the heading still comes first for a screen reader and on a phone.
export function LearningSupportSection() {
  return (
    <section
      className="section support-section bg-(--soft)"
      id="ho-tro"
      aria-labelledby="support-title"
    >
      <div className="container support-layout grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 xl:gap-x-24">
        <h2 id="support-title" className="lg:col-start-2 lg:row-start-1">
          Có thêm cách
          <br />
          để hiểu bài.
        </h2>

        {/* The image fills its box instead of sizing it, so at desktop width the photo takes the height of
            the heading and the list beside it. */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-[0_30px_60px_-36px_rgba(11,35,72,0.5)] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:aspect-auto">
          <img
            src="/landing-v2/assets/mentor-session-v3.webp"
            srcSet="/landing-v2/assets/mentor-session-v3-800.webp 800w, /landing-v2/assets/mentor-session-v3.webp 1365w"
            sizes="(max-width: 1023px) 100vw, 580px"
            alt="Cô giáo hướng dẫn một nam sinh giải bài toán bên bàn học"
            width={1365}
            height={1024}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </div>

        <ul className="support-items flex flex-col divide-y divide-(--line) overflow-hidden rounded-3xl bg-white ring-1 ring-(--line) lg:col-start-2 lg:row-start-2">
          <li className="flex items-start gap-4 p-5 sm:p-6">
            <span className={supportTile}>
              <Icon name="message-circle" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className={supportTitle}>Trao đổi cùng Mentor</h3>
              <p className="text-[0.9375rem] leading-relaxed">
                Hỏi mentor những phần bạn chưa hiểu trong lúc học. Mức hỗ trợ tùy từng khóa, ghi rõ
                trong thông tin khóa học.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 p-5 sm:p-6">
            <span className={supportTile}>
              <Icon name="sparkles" />
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className={supportTitle}>Khám phá cùng gia sư AI</h3>
              <p className="text-[0.9375rem] leading-relaxed">
                Dùng được khi bạn có khóa học đã mua và còn hạn. Xem điều kiện sử dụng trong tài
                khoản học tập.
              </p>
            </div>
          </li>
          <li>
            <a
              className="group flex items-center gap-4 rounded-b-3xl p-5 transition-colors hover:bg-(--soft) focus-visible:-outline-offset-4! sm:p-6"
              href="#ung-dung"
            >
              <span className={supportTile}>
                <Icon name="smartphone" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <span className="text-[1.125rem] leading-snug font-semibold tracking-[-0.02em] text-(--ink)">
                  Học trên ứng dụng Hocluc
                </span>
                <span className="text-[0.9375rem] leading-relaxed text-(--muted)">
                  Khóa học, lịch học và máy tính CW-880 trên điện thoại Android.
                </span>
              </span>
              <span className="text-(--blue-text) transition-transform duration-200 group-hover:translate-x-1">
                <Icon name="arrow-right" />
              </span>
            </a>
          </li>
        </ul>
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
            Sẵn sàng ôn V-ACT?
            <br />
            Bắt đầu ngay hôm nay.
          </h2>
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

export function LandingFooter({ onLanding = true }: { onLanding?: boolean }) {
  return (
    <footer className="footer" aria-label="Chân trang">
      <div className="container">
        <div className="footer-top">
          <div>
            <LandingLink className="logo" href={onLanding ? "#top" : "/"} aria-label="Về trang chủ hocluc.com">
              <LandingLogo size={26} />
            </LandingLink>
            <p>
              Mỗi ngày một chút,
              <br />
              tiến xa một bước.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Điều hướng cuối trang">
            {landingFooterNav.map((link) => (
              <LandingLink key={link.href} href={onLanding ? link.href : (link.pageHref ?? `/${link.href}`)}>
                {link.label}
              </LandingLink>
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
