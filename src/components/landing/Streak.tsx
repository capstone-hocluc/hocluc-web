import { Reveal, Counter } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { streakDays, streakRewards } from '../../data/content'

function Streak() {
  return (
    <section style={{ padding: '90px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Chuỗi học tập"
          banner="Duy trì thói quen — nhận quà"
          subtitle="Học đều mỗi ngày cùng HocLuc để giữ chuỗi và mở khóa những phần thưởng hấp dẫn."
        />

        <Reveal
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(125deg,var(--color-primary-dark),var(--color-primary) 65%,var(--color-brand-bright))',
            borderRadius: 28,
            padding: 42,
            color: '#fff',
            boxShadow: '0 40px 80px -34px rgba(28, 176, 246,.7)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -70,
              right: -50,
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.07)',
              animation: 'hl-blob 9s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -90,
              left: '8%',
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'rgba(247,178,59,.16)',
              animation: 'hl-blob 11s ease-in-out infinite',
            }}
          />

          <div
            className="hl-streak"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 44,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                <Counter
                  to={12}
                  style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}
                />
                <span style={{ fontSize: 20, fontWeight: 800 }}>ngày liên tiếp</span>
              </div>
              <p style={{ margin: '0 0 26px', fontSize: 14.5, color: 'rgba(255,255,255,.82)' }}>
                Tuần này bạn đã học 5/7 ngày — giữ vững phong độ nhé!
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                {streakDays.map(([label, learned, today]) => (
                  <div
                    key={String(label)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                        fontSize: 15,
                        background: learned ? '#fff' : 'rgba(255,255,255,.08)',
                        color: learned ? 'var(--color-primary)' : 'rgba(255,255,255,.55)',
                        border: `2px solid ${today ? 'var(--color-accent)' : learned ? '#fff' : 'rgba(255,255,255,.25)'}`,
                      }}
                    >
                      {learned ? '✓' : label}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,255,255,.14)',
                  padding: '10px 16px',
                  borderRadius: 30,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />
                Còn 2 ngày nữa để đạt mốc 14 ngày
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.7)',
                  marginBottom: 2,
                }}
              >
                Phần thưởng theo mốc
              </div>
              {streakRewards.map((r) => {
                const done = r.state === 'done'
                const current = r.state === 'current'
                return (
                  <div
                    key={r.days}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: 'rgba(255,255,255,.1)',
                      border: '1px solid rgba(255,255,255,.15)',
                      borderRadius: 16,
                      padding: '14px 16px',
                      opacity: r.state === 'todo' ? 0.72 : 1,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: done
                          ? '#fff'
                          : current
                            ? 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))'
                            : 'rgba(255,255,255,.12)',
                        border: r.state === 'todo' ? '1.5px solid rgba(255,255,255,.3)' : 'none',
                        color: done ? 'var(--color-primary)' : current ? 'var(--color-primary-dark)' : 'rgba(255,255,255,.5)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                        fontWeight: 900,
                      }}
                    >
                      {done ? '✓' : current ? '★' : '🔒'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{r.label}</div>
                      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>{r.days}</div>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '.4px',
                        padding: '6px 12px',
                        borderRadius: 30,
                        background: done
                          ? 'rgba(255,255,255,.22)'
                          : current
                            ? 'var(--color-accent)'
                            : 'rgba(255,255,255,.12)',
                        color: current ? 'var(--color-primary-dark)' : '#fff',
                      }}
                    >
                      {done ? 'Đã đạt' : current ? 'Sắp đạt' : 'Khóa'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Streak
