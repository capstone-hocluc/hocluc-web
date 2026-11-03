import { closingCta, faq, landingFooterNav } from '../../data/landing-content'
import Icon from './Icon'
import LandingLogo from './LandingLogo'
import AuthLink from './AuthLink'
import CutoutStage from './CutoutStage'
import LandingLink from './LandingLink'

// The three ways to get help are separate white cards on the section's blue, without icons or outlines; a
// faint shadow lifts them. The title is an h3 for the first two, so it needs `!` to beat the landing's h3 rule.
const supportCard = 'rounded-3xl bg-white shadow-[0_10px_30px_-22px_rgba(11,35,72,0.35)]'
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
          Bí bài đừng lo.
          <br />
          Có người chỉ cho.
        </h2>

        {/* The teacher, the student and the AI tutor on a tablet stand on the section background, as the hero's
            students do. */}
        <CutoutStage
          src="/landing-v2/assets/cutouts/support-mentor-ai.webp"
          small="/landing-v2/assets/cutouts/support-mentor-ai-800.webp"
          width={1527}
          height={1016}
          sizes="(max-width: 1023px) 100vw, 580px"
          alt="Cô giáo chỉ bài cho một nam sinh trên vở, bên cạnh là máy tính bảng mở khung trò chuyện với gia sư AI"
          className="relative self-center lg:col-start-1 lg:row-span-2 lg:row-start-1"
        />

        <ul className="support-items flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
          <li className={`${supportCard} p-5 sm:p-6`}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className={supportTitle}>Hỏi mentor</h3>
              <p className="text-[0.9375rem] leading-relaxed">
                Gửi câu hỏi về những phần bạn chưa hiểu trong lúc học. Mức hỗ trợ tùy từng khóa, ghi
                rõ trong thông tin khóa học.
              </p>
            </div>
          </li>
          <li className={`${supportCard} p-5 sm:p-6`}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className={supportTitle}>Hỏi gia sư AI</h3>
              <p className="text-[0.9375rem] leading-relaxed">
                Dùng được khi bạn có khóa học đã mua và còn hạn. Xem điều kiện sử dụng trong tài
                khoản học tập.
              </p>
            </div>
          </li>
          <li className={supportCard}>
            <a
              className="group flex items-center gap-4 rounded-3xl p-5 transition-colors hover:bg-(--soft) focus-visible:-outline-offset-4! sm:p-6"
              href="#ung-dung"
            >
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
            Sẵn sàng ôn ĐGNL?
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
              đi xa từng bước.
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
