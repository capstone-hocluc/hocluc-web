import { Reveal, ImageSlot } from '../common/motion'
import { media } from '../../data/content'

function Hero() {
  return (
    <section
      id="top"
      style={{
        position: 'relative',
        padding: '150px 0 90px',
        background: '#fff',
        backgroundImage:
          'linear-gradient(rgba(28, 176, 246,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(28, 176, 246,.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        animation: 'hl-drift 12s linear infinite',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 460,
          height: 460,
          background: 'radial-gradient(circle, rgba(28, 176, 246,.12), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 420,
          height: 420,
          background: 'radial-gradient(circle, rgba(247,178,59,.16), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="hl-hero-grid"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <Reveal>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(90deg,var(--color-primary),var(--color-brand-bright))',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '.4px',
              padding: '9px 18px',
              borderRadius: 40,
              boxShadow: '0 10px 24px rgba(28, 176, 246,.3)',
              marginBottom: 26,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 0 0 4px rgba(88,204,237,.35)',
              }}
            />
            #1 NỀN TẢNG ÔN THI ĐÁNH GIÁ NĂNG LỰC 2026
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px,4.4vw,56px)',
              lineHeight: 1.1,
              fontWeight: 900,
              letterSpacing: '-0.9px',
              margin: '0 0 22px',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                color: '#1947D1',
                whiteSpace: 'nowrap',
                marginBottom: 12,
              }}
            >
              Khám phá năng lực
            </span>
            <span style={{ display: 'block', color: '#0F1B41' }}>thật sự của bạn</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: 'var(--color-body)',
              maxWidth: 520,
              margin: '0 0 34px',
            }}
          >
            Ôn thi đánh giá năng lực toàn diện trên mọi lĩnh vực và mọi miền tại Việt Nam — cá nhân
            hóa theo mục tiêu của bạn.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a
              href="#exams"
              className="hl-byh"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                color: 'var(--color-primary-dark)',
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '.6px',
                textTransform: 'uppercase',
                padding: '17px 30px',
                borderRadius: 46,
                boxShadow: '0 14px 30px rgba(59,175,218,.45)',
              }}
            >
              Bắt đầu ngay
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--color-heading)',
                  color: 'var(--color-accent)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 15,
                }}
              >
                ↗
              </span>
            </a>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--color-body)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <span style={{ color: 'var(--color-accent-dark)', letterSpacing: 2, fontSize: 15 }}>★★★★★</span>
              4.9/5 · 12.000+ đánh giá
            </div>
          </div>
        </Reveal>

        <Reveal delay={150} style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              minHeight: 560,
            }}
          >
            {/* Decorative shapes */}
            <span
              style={{
                position: 'absolute',
                top: 30,
                left: 28,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 8px 18px rgba(59,175,218,.5)',
                zIndex: 0,
                animation: 'hl-float2 5.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 90,
                right: 14,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                zIndex: 0,
                animation: 'hl-float1 4.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 70,
                left: 6,
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'rgba(28, 176, 246,.12)',
                transform: 'rotate(18deg)',
                zIndex: 0,
                animation: 'hl-float1 7s ease-in-out infinite',
              }}
            />
            <svg
              style={{
                position: 'absolute',
                top: 6,
                right: 70,
                zIndex: 0,
                animation: 'hl-float2 6s ease-in-out infinite',
              }}
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M12 2v20M2 12h20" stroke="var(--color-accent-dark)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>

            {/* The cutout image — no frame */}
            <div
              style={{ position: 'relative', width: '100%', maxWidth: 540, height: 560, zIndex: 1 }}
            >
              <ImageSlot
                src={media.hero}
                alt="Thí sinh"
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center bottom',
                  filter: 'drop-shadow(0 26px 34px rgba(28, 176, 246,.22))',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 20,
                right: 0,
                background: '#fff',
                borderRadius: 16,
                padding: '12px 16px',
                boxShadow: '0 18px 40px -12px rgba(28, 176, 246,.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                zIndex: 2,
                animation: 'hl-float1 5s ease-in-out infinite',
              }}
            >
              <div style={{ display: 'flex' }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,var(--color-primary),var(--color-brand-soft))',
                    border: '2px solid #fff',
                    marginLeft: -8,
                  }}
                />
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,var(--color-accent-dark),var(--color-accent))',
                    border: '2px solid #fff',
                    marginLeft: -8,
                  }}
                />
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,var(--color-heading),#3a4a86)',
                    border: '2px solid #fff',
                    marginLeft: -8,
                  }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-heading)' }}>600.000+</div>
                <div style={{ fontSize: 11, color: 'var(--color-body)' }}>học viên</div>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 140,
                right: -10,
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 16,
                padding: '12px 16px',
                boxShadow: '0 18px 40px -12px rgba(28, 176, 246,.55)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                zIndex: 2,
                animation: 'hl-float2 6s ease-in-out infinite',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,.18)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span
                  style={{ width: 13, height: 13, border: '2px solid #fff', borderRadius: 4 }}
                />
              </span>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                Cộng đồng
                <br />
                hợp tác tốt nhất
              </div>
            </div>

            {/* Stat card — courses */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 16,
                padding: '12px 18px',
                boxShadow: '0 18px 40px -12px rgba(28, 176, 246,.55)',
                zIndex: 2,
                animation: 'hl-float1 6.5s ease-in-out infinite',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 17 }}>Hơn 50+</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>khóa học</div>
            </div>

            {/* Stat card — access */}
            <div
              style={{
                position: 'absolute',
                bottom: 110,
                left: 8,
                background: '#fff',
                borderRadius: 16,
                padding: '12px 18px',
                boxShadow: '0 18px 40px -12px rgba(28, 176, 246,.35)',
                zIndex: 2,
                animation: 'hl-float2 6s ease-in-out infinite',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--color-primary)' }}>100%</div>
              <div style={{ fontSize: 11, color: 'var(--color-body)' }}>Truy cập toàn bộ</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Hero
