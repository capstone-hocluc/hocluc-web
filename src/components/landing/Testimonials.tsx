import { Reveal } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { testimonials } from '../../data/content'
import Avatar from '../ui/Avatar'
import { getInitials } from '../../lib/initials'

function Testimonials() {
  return (
    <section
      style={{
        position: 'relative',
        padding: '90px 0',
        background: '#F6F8FE',
        backgroundImage:
          'linear-gradient(rgba(28, 176, 246,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(28, 176, 246,.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Phản hồi"
          banner="Thí sinh nói gì"
          subtitle="Phản hồi từ thí sinh trên khắp 63 tỉnh thành Việt Nam."
        />

        <div
          className="hl-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26 }}
        >
          {testimonials.map((t, i) => (
            <Reveal
              key={t.id}
              delay={i * 110}
              className="hl-card"
              style={{
                background: '#fff',
                border: '1.5px solid #E4E9F5',
                borderRadius: 18,
                padding: '28px 26px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 24,
                  fontSize: 54,
                  lineHeight: 1,
                  color: 'rgba(28, 176, 246,.12)',
                  fontWeight: 900,
                }}
              >
                ”
              </span>
              <div style={{ color: 'var(--color-accent-dark)', letterSpacing: 2, fontSize: 16, marginBottom: 16 }}>
                ★★★★★
              </div>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: '#2A3354',
                  margin: '0 0 22px',
                  fontStyle: 'italic',
                }}
              >
                “{t.quote}”
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderTop: '1px solid #EEF1F8',
                  paddingTop: 18,
                }}
              >
                <Avatar
                  aria-label={t.name}
                  fallback={getInitials(t.name)}
                  className="size-[46px] text-sm"
                />
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: 'var(--color-heading)',
                      textTransform: 'uppercase',
                      letterSpacing: '.2px',
                    }}
                  >
                    {t.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-body)' }}>{t.loc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
