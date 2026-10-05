import { useState } from 'react'
import { Reveal, ImageSlot } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { examCategories, exams } from '../../data/content'

function ExamsSection() {
  const [active, setActive] = useState('Tất cả')
  const filtered = active === 'Tất cả' ? exams : exams.filter((e) => e.cat === active)

  return (
    <section id="exams" style={{ scrollMarginTop: 90, padding: '40px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Kỳ thi nổi bật"
          banner="Đánh giá năng lực"
          subtitle="Các kỳ thi đánh giá năng lực và tuyển sinh đại học phổ biến tại Việt Nam."
        />

        <Reveal
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            margin: '30px 0 38px',
          }}
        >
          {examCategories.map((c) => {
            const on = c === active
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                style={{
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 13.5,
                  letterSpacing: '.4px',
                  padding: '11px 22px',
                  borderRadius: 40,
                  transition: 'all .25s',
                  border: `1.5px solid ${on ? 'var(--color-primary)' : '#D9E0F2'}`,
                  background: on ? 'var(--color-primary)' : '#fff',
                  color: on ? '#fff' : '#2A3354',
                  boxShadow: on ? '0 10px 22px rgba(28, 176, 246,.35)' : 'none',
                }}
              >
                {c}
              </button>
            )
          })}
        </Reveal>

        <div
          className="hl-grid-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 22,
            alignItems: 'stretch',
          }}
        >
          {filtered.map((ex) => (
            <article
              key={ex.id}
              className="hl-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1.5px solid #E4E9F5',
                borderRadius: 18,
                overflow: 'hidden',
                background: '#fff',
                animation: 'hl-cardin .5s both',
                cursor: 'pointer',
              }}
            >
              <div
                style={{ position: 'relative', height: 180, flexShrink: 0, background: '#E7EDFB' }}
              >
                <ImageSlot src={ex.image} alt={ex.title} style={{ objectFit: 'cover' }} />
                <span
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                    color: 'var(--color-primary-dark)',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '.6px',
                    textTransform: 'uppercase',
                    padding: '6px 13px',
                    borderRadius: 30,
                    boxShadow: '0 6px 14px rgba(59,175,218,.4)',
                  }}
                >
                  {ex.cat}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '18px 20px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: 'var(--color-accent-dark)', letterSpacing: 1, fontSize: 13 }}>★★★★★</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-heading)' }}>
                    {ex.rating}
                  </span>
                  <span style={{ fontSize: 13, color: '#9AA2BC' }}>{ex.reviews}</span>
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: 'var(--color-heading)',
                    margin: '0 0 12px',
                    height: 66,
                    textTransform: 'uppercase',
                    letterSpacing: '-.2px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {ex.title}
                </h3>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 18,
                    minHeight: 38,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--color-body)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {ex.org}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#1B8A5B',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Miễn phí
                  </span>
                </div>
                <button
                  className="hl-ob"
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    fontSize: 13.5,
                    letterSpacing: '.6px',
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    background: 'transparent',
                    border: '1.5px solid var(--color-primary)',
                    borderRadius: 40,
                    padding: 13,
                  }}
                >
                  Xem chi tiết
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ExamsSection
