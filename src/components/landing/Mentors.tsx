import { UserRound } from '../console/icons'
import { Reveal } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { experts } from '../../data/content'

function Mentors() {
  return (
    <section
      id="experts"
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
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Chuyên gia"
          banner="Đội ngũ cố vấn"
          subtitle="Các chuyên gia hàng đầu trong lĩnh vực khảo thí và đánh giá năng lực tại Việt Nam."
        />

        <div
          className="hl-grid-5"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 18 }}
        >
          {experts.map((ep, i) => (
            <Reveal
              key={ep.id}
              delay={i * 80}
              className="hl-card"
              style={{
                background: '#fff',
                border: '1.5px solid #E4E9F5',
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  height: 210,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(145deg, #eaf8fc, #f7fcfe)',
                }}
              >
                <span
                  style={{
                    width: 92,
                    height: 92,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    border: '3px solid #fff',
                    background: 'var(--color-primary-soft)',
                    color: 'var(--color-primary-text)',
                    boxShadow: '0 10px 24px rgba(28,176,246,.14)',
                  }}
                >
                  <UserRound size={32} strokeWidth={1.8} />
                </span>
              </div>
              <div style={{ padding: '16px 14px', textAlign: 'center' }}>
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--color-heading)',
                    textTransform: 'uppercase',
                    letterSpacing: '-.2px',
                  }}
                >
                  {ep.name}
                </h4>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-primary)', fontWeight: 600 }}>
                  {ep.role}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Mentors
