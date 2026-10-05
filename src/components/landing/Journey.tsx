import { Reveal } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { journeySteps } from '../../data/content'

function Journey() {
  return (
    <section
      id="roadmap"
      style={{ scrollMarginTop: 90, padding: '90px 0', background: '#fff', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Lộ trình"
          banner="5 bước đơn giản"
          subtitle="Hành trình ôn thi đánh giá năng lực từ đăng ký đến nhận chứng chỉ."
        />

        <div
          className="hl-roadmap"
          style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}
        >
          <div
            className="hl-roadmap-line"
            style={{
              position: 'absolute',
              left: '50%',
              top: 8,
              bottom: 8,
              width: 4,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg,var(--color-primary),var(--color-brand-soft))',
              borderRadius: 4,
              boxShadow: '0 0 0 7px rgba(28, 176, 246,.05)',
            }}
          />
          {journeySteps.map((st, i) => {
            const left = i % 2 === 0
            return (
              <Reveal
                key={st.title}
                className="hl-roadmap-row"
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '1fr 76px 1fr',
                  alignItems: 'center',
                  marginBottom: 26,
                }}
              >
                <div
                  style={{
                    gridColumn: left ? 1 : 3,
                    gridRow: 1,
                    display: 'flex',
                    justifyContent: left ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    className="hl-rmcard"
                    style={{
                      maxWidth: 340,
                      textAlign: left ? 'right' : 'left',
                      background: 'linear-gradient(180deg,#F7F9FF,#fff)',
                      border: '1.5px solid #E4E9F5',
                      borderRadius: 16,
                      padding: '18px 22px',
                      boxShadow: '0 16px 38px -26px rgba(28, 176, 246,.7)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        color: 'var(--color-primary)',
                        marginBottom: 5,
                      }}
                    >
                      Bước 0{i + 1}
                    </div>
                    <h4
                      style={{
                        margin: '0 0 5px',
                        fontSize: 18,
                        fontWeight: 900,
                        color: 'var(--color-heading)',
                        textTransform: 'uppercase',
                        letterSpacing: '-.3px',
                      }}
                    >
                      {st.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-body)', lineHeight: 1.5 }}>
                      {st.desc}
                    </p>
                  </div>
                </div>
                <div
                  className="hl-roadmap-pin"
                  style={{ gridColumn: 2, gridRow: 1, display: 'grid', placeItems: 'center' }}
                >
                  <span
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                      color: 'var(--color-primary-dark)',
                      fontWeight: 900,
                      fontSize: 22,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow:
                        '0 12px 26px rgba(59,175,218,.5), 0 0 0 6px #fff, 0 0 0 9px rgba(28, 176, 246,.12)',
                      animation: 'hl-pulse 3s ease-in-out infinite',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Journey
