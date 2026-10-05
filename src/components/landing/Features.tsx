import { Reveal, ImageSlot } from '../common/motion'
import { features, media } from '../../data/content'

function Features() {
  return (
    <section
      id="features"
      style={{
        scrollMarginTop: 90,
        position: 'relative',
        padding: '90px 0',
        background: '#F6F8FE',
        backgroundImage:
          'linear-gradient(rgba(28, 176, 246,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(28, 176, 246,.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div
        className="hl-feat"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 60,
          alignItems: 'center',
        }}
      >
        <Reveal style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: -14,
              border: '1.5px solid rgba(28, 176, 246,.4)',
              borderRadius: 22,
            }}
          />
          <div
            style={{
              position: 'relative',
              height: 430,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 30px 60px -28px rgba(28, 176, 246,.5)',
            }}
          >
            <ImageSlot src={media.feature} alt="Nhóm học tập" />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -26,
              left: 30,
              background: '#fff',
              borderRadius: 16,
              padding: '16px 20px',
              boxShadow: '0 20px 44px -18px rgba(28, 176, 246,.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              animation: 'hl-bob 4s ease-in-out infinite',
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg,var(--color-primary),var(--color-brand))',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              ↑
            </span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--color-primary)' }}>+38%</div>
              <div style={{ fontSize: 12, color: 'var(--color-body)' }}>Điểm trung bình</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h2
            style={{
              fontSize: 'clamp(34px,4.4vw,56px)',
              fontWeight: 900,
              color: 'var(--color-primary)',
              letterSpacing: '-1px',
              margin: '0 0 16px',
              textTransform: 'uppercase',
            }}
          >
            Tại sao chọn chúng tôi
          </h2>
          <p style={{ color: 'var(--color-body)', fontSize: 16, margin: '18px 0 30px', maxWidth: 480 }}>
            Giải pháp ôn thi đánh giá năng lực toàn diện, phục vụ mọi lĩnh vực và mọi vùng miền tại
            Việt Nam.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((ft, i) => (
              <Reveal
                key={ft.title}
                delay={i * 90}
                className="hl-slide"
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px 18px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid #E8ECF7',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg,var(--color-primary),var(--color-brand))',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                <div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--color-heading)',
                      textTransform: 'uppercase',
                      letterSpacing: '-.2px',
                    }}
                  >
                    {ft.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--color-body)', lineHeight: 1.5 }}>
                    {ft.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Features
